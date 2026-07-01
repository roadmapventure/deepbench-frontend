# DeepBench v5.2 — Feature Inventory

> Status: ✅ Done | 🔶 Partial | ❌ Missing | — N/A
> Session: DONE = built | [ID] = assigned | S-future = not yet scheduled
>
> Last updated: 2026-07-01 | Session: S-APPLE-01a (v5.3.0) — Apple Channel 6-agent roster identity shipped (AG-18/19/20/21/22/23 ✅ Done), 9/9 Manual QA PASS. Full design: `docs/APPLE-AGENT-1-v5-DESIGN.md`.
>
> **AI Services catalog** (14 services, 10 patterns, AI Audit sections, MCP surfaces, table schema) → `docs/AI-SERVICES.md`
> **Deliverable composition registry** (AI Services × Deliverables, sharing patterns, feedback loops, build order) → `docs/CAPABILITIES.md`
> **✅ Done rows archived (2026-07-01):** this file now holds only 🔶 Partial / ❌ Missing / — N/A rows. If a feature isn't listed here, check `docs/FEATURES-ARCHIVE.md` before assuming it's missing.

---

## Feature ID Format

`[AREA]-[NUMBER]`
Areas: `SH`=Shell, `DB`=Dashboard, `AW`=Assign Work, `TI`=Task Instructions, `AZ`=Analyzer, `FT`=Fetch, `RO`=Roster, `PE`=Personnel File, `TC`=Teach, `TT`=Test Team, `AI`=AI Infrastructure, `AG`=Agent Identity, `LA`=Landing, `DL`=Deliverables, `WO`=Work Order, `IN`=Intent, `FM`=Format, `SV`=Service, `SK`=Skills & Capabilities, `MI`=Market Intelligence

---

## SHELL & INFRASTRUCTURE — SH

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| SH-13 | About panel: GitHub Action auto-update stats.json on push to dev | ❌ Missing | S-ABOUT-STATS-01 (future, separate session) |
| SH-06 | Supabase tasks table integration | ❌ Missing | S-future |
| SH-07 | Supabase Storage CSV | ❌ Missing | S-future (pair with SH-06) |
| SH-08 | Landing screen | ❌ Missing | DECISION NEEDED |
| SH-09 | Case study screen | — | INTENTIONALLY EXCLUDED |
| SH-11 | Restructure serverless API layer — consolidate Vercel routes, move new capabilities to Railway Express | ❌ Missing | S-future (do before v6.x) |
| SH-12 | About DeepBench panel — display correct current version number (pulled from CLAUDE-STATE.md or package.json, not hardcoded) | ❌ Missing | S-future |

---

## DASHBOARD — DB

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| DB-01 | Task list — active tasks, status, priority, HITL | 🔶 Partial (mock data) | — |
| DB-04 | Recently completed section | 🔶 Partial (mock only) | — |
| DB-14 | Chat panel — real RAG + AI call | 🔶 Partial | — |
| DB-18 | Auto-select best agent via AI | ❌ Missing | S13 (deferred) |

**DB-17 Notes:** Michelle generates concise title + step names on first draft. `title_edited` flag — user owns title after first edit, never overwritten. `api/title.js`: direct Claude Haiku call; Supabase agent_configs wired in S-BENCH-01.

---

## ASSIGN WORK — AW

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| AW-07 | Agent swap → plan regeneration | 🔶 Partial | S12 (deferred) |
| AW-11 | "Approve Plan & Launch" → Supabase | 🔶 Partial | Blocked by SH-06 |
| AW-12 | Pre-populate from chat (from=chat param) | 🔶 Partial | — |
| AW-13 | Chat transcript in task | ❌ Missing | S-future |
| AW-15 | Pre-populated goal appends not replaces | 🔶 Partial | post-core |
| AW-17 | Michelle assigns steps to multiple agents | ❌ Missing | S12 (deferred) |
| AW-28 | Prompt Evolution Modal — pops up when user clicks Generate Plan. 4-column comparison: Col 1 = bare goal, Col 2 = DB Assembly sections, Col 3 = +RAG, Col 4 = +Reflect/Synthesis + Alex's FORMAT appended last. Token deltas, pattern badges, agent collaboration chips (Dan PS-01 + Alex ED-01). Continue dismisses modal — plan renders when pipeline completes. Wired as `action: 'preview-prompt'` fired in parallel with `action: 'prompt-service'`. | 🔶 Partial | S-PM-07b (modal built); S-CONTENT-01a (format-last Column 4 + display_agent_card); S-CONTENT-01b (Alex chip in footer) |

**Architectural boundary (locked 2026-06-23):** Create Work Order screen is scoped to work orders and steps only. Other task types (e.g. send email, web fetch) are handled by different screen views — not by adding new deliverable types to this screen.

---

## TASK INSTRUCTIONS — TI

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| TI-02 | HITL step opens relevant screen | 🔶 Partial | S-future |
| TI-03 | Step history from Supabase steps JSONB | ❌ Missing | Blocked by SH-06 |
| TI-07 | Chat transcript in task | ❌ Missing | S-future |
| TI-14 | Start button — triggers step execution | ❌ Missing | S11 (deferred) |
| TI-15 | Per-step execution running state | ❌ Missing | S11 (deferred) |
| TI-16 | Step output storage to Supabase JSONB | ❌ Missing | S11 (deferred, Q5 needed) |
| TI-17 | Pat execution via Railway | ❌ Missing | S11b (deferred) |
| TI-18 | HITL step gate — full runtime execution contract: (1) execution pauses when a HITL step is reached, (2) signal emitted to notify human (UI state change + future notification), (3) human provides input via the step's comment/approval interface, (4) input injected into the next agent step's context, (5) execution resumes. Activates PAT-10 HITL in AI Audit By Pattern — triggers "Gates Triggered" counter + records human response time. Design session required before coding — needs: pause signal architecture, notification mechanism, resume-with-context handoff spec. | ❌ Missing | S-future (design required) |

---

## NIGP ANALYZER — AZ

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| AZ-03 | Column mapping saved to task record | ❌ Missing | Blocked by SH-06 |
| AZ-04 | CSV upload to Supabase Storage | ❌ Missing | S-future (SH-07) |
| AZ-05 | CSV load from Supabase Storage on return | ❌ Missing | S-future (SH-07) |
| AZ-15 | Tab: AI Review (3-stage, RAG-augmented) | 🔶 Partial | — |
| AZ-18 | Demo task pre-loaded: Austin FY2025 | 🔶 Partial | Blocked by SH-07 |

---

## FETCH — FT

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| FT-04 | Post-fetch: download CSV + Map Fields | 🔶 Partial | — |
| FT-05 | Fetched CSV to Supabase Storage | ❌ Missing | S-future (SH-07) |
| FT-06 | Pat selectable as fetch agent | 🔶 Partial | S11b (deferred) |

---

## ROSTER / BENCH — RO

| ID | Feature | Status | Session |
|----|---------|--------|---------|

**WK-XX — Test My Team (future, not yet scheduled):**
Batch-run all bench agents against a sample dataset to compare output quality side-by-side. Entry point: button on Roster screen header. Scope: Work session chain. Do NOT implement in S-MIGRATE-01 or S-MIGRATE-02.

---

## PERSONNEL FILE — PE

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| PE-04 | Playbook tab live wiring (output_format CRUD + guardrails — ResumeTab pattern) | 🔶 Partial (static mock) | S-MIGRATE-05 |
| PE-12 | Training tab — Test Agent console (inline sub-view: config selectors, scenario picker, live brief + RAG call, system prompt inspector, RAG chunks panel) | ❌ Missing | S-MIGRATE-06 |
| PE-06 | Projects tab — live wiring to `deliverables` table; shows agent's completed deliverables: count, type, task name, date; stub until DL-04 ships | 🔶 Partial (stub) | S-DELIVER-04 |
| PE-14 | Training tab — "What X Learned" panel UX fix: (1) move AiBadge outside the expandable so it is visible immediately before and after expansion; (2) replace clickable expansion trigger with inline "more..." text after "What X Learned" label | ❌ Missing | S-future |
| PE-15 | Training tab — Add Courses loading state: (1) spinner + status text during Exhibit B pre-fill lag so user knows system is working and cannot click "Teach X this document" yet; (2) AiBadge + AI pulse icon on Exhibit B section showing the pattern being used (KNOWLEDGE_TRAINING) | ❌ Missing | S-future |
| PE-16 | Playbook tab — guardrails section AI Pulse + hover label: add `<AIDiamond>` to the guardrails card header (always/never section) with a hover label identifying PAT-13 Guardrails / Output Filtering as the pattern these constraints feed into. AIDiamond should render in inactive/roadmap state (PAT-13 is `active: false` in PATTERN_CATALOG) — visually distinct from a live-pattern pulse. Exact inactive AIDiamond treatment must be specced in the AI-34/AI-31 design session before this can be coded. Depends on: PE-04 ✅ Done, AI-34 design (AIDiamond pattern label spec). File: PersonnelScreen.jsx (Playbook tab). | ❌ Missing | S-future (depends on AI-34 design session) |

**PE-04 spec locked 2026-06-09 (S-MIGRATE-05 design session):**
- Output formats: full CRUD via `/api/agent-configs?type=output_format` — identical to ResumeTab `role_prompt` pattern
- Guardrails: two separate records — `name: "always"` and `name: "never"`, both `type: "guardrail"` — autosaved on blur; no canEdit gate (any agent editable)
- Both sections loaded in single `Promise.all` on mount
- `ConfigCard` and `AddConfigForm` promoted to shared scope (named exports from ResumeTab or inlined above ProfileTab)
- `AddConfigForm` parameterized with `type` prop — not hardcoded `"role_prompt"`
- `canEdit = agent.trainable` gate: Add/Edit/Delete hidden for non-trainable agents; guardrail textarea read-only
- Guardrails corner ornament: `<Corners color={T.flag} />` (already in static mock — preserve)
- `handleSetDefault`: re-fetch full list after PATCH (not optimistic — server is source of truth)
- `handleFormatAdded`: if new config `is_default`, zero out existing defaults before prepending
- Kickoff doc: `docs/kickoffs/v5.1.26-PE-04-playbook-tab-crud.md`

**PE-12 spec (S-MIGRATE-06 — needs design session):**
- NIGP reference: `nigp-analyzer/src/PersonnelScreen.jsx` — TrainingTabWithSubViewSync, `subView === "test"` branch
- Entry point: "🐝 Test Agent" button in Training tab stats strip (alongside existing "+ Add Courses")
- Config selectors bar: Role Prompt dropdown + Output Format dropdown (loads from agent-configs on test mount)
- Scenario picker: 5 pre-built procurement scenarios (adapt from NIGP's BEE_SCENARIOS — DeepBench scenarios TBD in design session)
- Run Test: live `/api/brief` call with `role_prompt_id`, `output_format_id`, RAG context injected
- Results panel: agent response + debug strip (Role, Format, Layers assembled, RAG retrieved)
- System prompt inspector: expandable, color-coded by layer (L01 purple, L02 moss, L04 brass, L05 flag-red)
- RAG chunks panel: expandable, shows retrieved docs + similarity scores
- Design session required before coding — scenarios and UI layout need approval

**PE-11 spec locked 2026-06-09 (S-MIGRATE-04 design session):**
- Reuses AddCourseView with `existingEntry` prop — no separate EditCourseView component
- Edit opens inline in Personnel File window (left nav + page header remain visible) — NOT a new screen
- Exhibit A shows "Document on file" card — no file upload, no re-vectorization
- Save button label: "▸ Save Course Detail" (not "Teach X this document")
- EDIT + DELETE: only shown when `agent.trainable && entry.status === "active"` (NIGP parity)
- PATCH endpoint extended: `api/knowledge-entry.js` accepts title, category, jurisdiction, teaching_note, triggers, priority
- All form fields editable: title, category, jurisdiction, priority, triggers, teaching note (NIGP parity)
- Kickoff doc: `docs/kickoffs/v5.1.26-PE11-edit-course.md`

**PE design decisions locked 2026-06-08 (S-MIGRATE-UX):**
- Left nav replaces horizontal tab bar. Nav groups: OVERVIEW (Profile) + CONFIGURE (Resume, Training, Playbook). No OPERATE section.
- "Assignments" and "Completed Projects" removed as nav items → become sections on Profile tab (PE-08, PE-09).
- "← Team Builder" bottom-left button → removed.
- Top nav handled by DeepBench AppShell (Work + Bench) — no NIGP-specific buttons.
- Profile tab layout: NIGP 2-col (ID Badge + Compensation left; Readiness + Intel Config + Quick Stats right).
- Avatar on Profile tab: initial circle only (illustrated avatar is Roster-only).
- Future: Resume/Training/Playbook sub-page design pulled from NIGP in a dedicated design session.
- Future: Training inline Teach+Test sub-views (NIGP pattern) will deprecate TeachScreen.jsx + TestTeamScreen.jsx.
- Future: Assignments + Completed live wiring to tasks table (separate session).

---

## TEACH — TC

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| TC-02 | Trainer Agent — dedicated agent role that trains/configures other agents; visible as participant in multi-agent workflows; shows who taught an agent in the personnel file training log | ❌ Missing | S-future |

**TC-02 Notes (added 2026-06-09):**
- Named agent: **Susan Smith (TR-08)** — Trainer Agent role
- Concept: Trainer is a named agent (not a user action) — another AI agent assigned to teach/configure peer agents
- Visible in Training tab: each entry shows which agent (or user) added it
- Multi-agent workflow: Trainer agent can be called into a task workflow to onboard or retrain a bench agent mid-project
- Design session required before implementation — full spec in S-BENCH-01b

---

## TEST TEAM — TT

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| TT-03 | Multi-Agent Debate upgrade — after parallel run, feed each agent the other's output for a critique pass; add synthesis agent that reads both critiques and produces a reconciled final answer (PAT-16 Multi-Agent Debate). Extends TT-01/02 foundation. Design session required. | ❌ Missing | S-future (design required) |

---

## AI INFRASTRUCTURE — AI

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| AI-03 | AI Activity Panel wiring (3 screens) | 🔶 Partial | S-AI-01 |
| AI-06 | Semantic similarity scoring in knowledge tier | 🔶 Partial | S-future |
| AI-07 | Summarization/synthesis in AI Activity Panel | 🔶 Partial | S-future |
| AI-11 | Per-step AI execution log → Supabase agent_run_log | ❌ Missing | S11 |
| AI-12 | Full AI Audit Screen (/work/[taskId]/audit) | ❌ Missing | S-AI-01 Part B |
| AI-17 | Auto-Training service — extract synthesis+embed+write pattern from web-memory.js POST into standalone `/api/auto-train` endpoint, callable by any agent/capability | ❌ Missing | S-INFRA-02 |
| AI-19 | Latency capture for extraction + reinforcement call sites — wrap fetch() with Date.now() timing so avg latency shows in AI Audit (currently "—" for Susan + OpenAI rows) | ❌ Missing | S-future |
| AI-20 | AI Audit cost formatter — replace `<$0.01` floor with 4-decimal display so sub-penny costs show visible movement (e.g. `$0.0023`); one-liner change to `fmt$` in AIActivityPanel.jsx | ❌ Missing | S-future |
| AI-21 | AI Audit output token tracking — extend `logAICall()` to accept `outputTokens` param; include output cost in formula; write to existing `output_tokens` column in ai_activity_log; all `logAICall()` call sites updated | ❌ Missing | S-future |
| AI-22 | Full lineage columns on `ai_activity_log` — add `service_slug`, `service_version`, `deliverable_id`, `step_id`, `level` so every AI call is traceable from Task → Step → Agent → Service → Pattern → Deliverable → Cost. Also adds `success` boolean and `error_type` for Service Health (AI-27). Do alongside S-INFRA-01. All `logAICall()` call sites updated. | ❌ Missing | S-INFRA-01 |
| AI-24 | Routing feedback loop — deliverable approval and change-request rates produce a per-agent-capability preference score; routing uses Capability match + Level + approval history as a third factor after Seniority. Design session required before building. | ❌ Missing | S-future (after S-DELIVER-04) |
| AI-25 | `ai_services` table — Supabase catalog of all 14 named Services: slug, name, service_type (ai/deterministic/mixed), description, patterns jsonb (array of pattern slugs), properties jsonb (llm_provider, llm_model, token_budget, execution_mode, rag_match_count, byok_eligible), in_nigp, in_deepbench, current_route, target_route, version, created_at. Seed with all 14 services (SVC-01 through SVC-14) on creation. | ❌ Missing | S-INFRA-01 |
| AI-26 | `ai_patterns` table — Supabase catalog of 20 industry-standard AI Patterns: slug, name, description, in_deepbench boolean (true = active, false = roadmap). Seed with PAT-01 through PAT-20 on creation. PAT-01–11 active or partial; PAT-12–20 roadmap. Referenced by `ai_services.patterns` jsonb array. | ❌ Missing | S-INFRA-01 |
| AI-27 | Service Health tracking — `success` boolean + `error_type` text column on `ai_activity_log`; enables per-Service failure rate, uptime, and p50/p95 latency in AI Audit. Part of AI-22 lineage work or separate extension. | ❌ Missing | S-INFRA-01 |
| AI-31 | Task Instructions AI pulse buttons — "Re-run All" and "Update Steps →" buttons each get AI activity signal + pattern label. Byline badge fix in AssignWorkScreen also shipped. Functionally complete (195aeda + 8bd3f23) but VISUAL TREATMENT WRONG: currently uses raw `<span>` dot + AiBadge chip, which is not in the style guide. Must be replaced with `<AIDiamond>` + pattern tooltip pattern (spec TBD in S-AI-AUDIT-UX-01). Files: TaskInstructionsScreen.jsx, StepList.jsx, AssignWorkScreen.jsx. | 🔶 Partial (visual redesign needed — see AI-31 notes) | S-AI-BADGE-05/05p ✅ functional · S-AI-AUDIT-UX-01 visual redesign |
| AI-34 | Step card AI pattern display — each step card in Task Instructions and Assign Work shows which AI patterns are used for that step, plus an `<AIDiamond>` AI pulse icon. Source: AGENT_PATTERNS map (same as AI-29). Visual treatment: AIDiamond + pattern label, exact placement TBD in design session. Do not use AiBadge chip for this. File: StepList.jsx. | ❌ Missing | S-AI-AUDIT-UX-01 (design session required) |
| AI-35 | Unified AI Pattern Registry — single source of truth for all pattern tracking across the platform. Replaces the current split between `PATTERN_CATALOG` (useAIActivity.js), `AI_PAT` constants + `AGENT_PATTERNS` map (aiPatterns.js), and scattered AiBadge label strings. The registry owns: (1) **Active status** — which patterns are actually firing in DeepBench code today vs roadmap-only, so AiBadge labels and the Platform Roadmap never contradict each other; (2) **Label/feature associations** — which UI elements (buttons, cards, step types) declare each pattern, so AiBadge labels derive from the registry instead of being hardcoded per component; (3) **AI Audit display** — By Pattern row status (active/partial/roadmap) and roadmap tier driven from one source; (4) **Metric logging** — pattern-level calls, cost, and latency logged directly to `ai_activity_log` via pattern slug, not only rolled up from service calls; (5) **Full graph** — each pattern knows which Services declare it, which Deliverables those Services produce, and which Capabilities invoke those Deliverables. Resolves the AI-28/PATTERN_CATALOG contradiction discovered 2026-06-15: AiBadge labels were set from SVC design intent (Reflection listed on Playbook badge) but PATTERN_CATALOG correctly marks Reflection inactive — a split source caused the inconsistency. Design session required before coding — needs: registry schema, migration path from aiPatterns.js + PATTERN_CATALOG, AiBadge label derivation mechanism, metric log schema. | ❌ Missing | S-PAT-REGISTRY-01 (design required) |

**AI-22 Notes:** `ai_activity_log` currently has `ai_type`, `feature`, `model`, `agent_id`, `task_id` — a pre-Agent-Profile-Model categorization. The four new columns are additive and nullable — no existing data affected. Once present, every AI call has a full lineage chain. The platform's own internal capabilities (Task Planning, Title Generation, Agent Routing) are themselves Deliverables produced by agents — they must also carry these columns, making the platform self-describing.

**AI-23 Notes:** The existing "By Activity Type" 9 categories are a temporary categorization that predates the Agent Profile Model. Once the `competencies` and `capabilities` taxonomy tables exist (S-INFRA-01), the AI Audit views rebuild on top of them. Old activity type rows are remapped to `capability_slug` values via a one-time backfill. New views: By Competency (Identity/Skills/Knowledge/Deliverables spend), By Capability (which capabilities cost the most), By Level (what quality level is the platform operating at).

**AI-24 Notes:** The feedback loop requires DL-04 (`deliverables` table with `status: approved / change_requested`) to be live first. Score formula TBD in design session — likely: approval_rate × recency_weight × level_factor. Score stored per `(agent_id, capability_slug)` pair. Used as a tiebreaker when multiple agents have matching Capability + Level.

**AI-17 Notes:** `web-memory.js` POST currently hardcodes Brent's persona and "Portal Navigation" category. Extract into `/api/auto-train` accepting: `agent_id`, `source_type` (portal_run | document | conversation | test_result), and the raw artifact payload. `web-memory.js` POST becomes a thin caller. Enables any future capability to write training entries without duplicating the embed+write pattern. Design session required before coding — needs: input schema, per-agent persona selection, source_type → synthesis prompt mapping, category mapping.

**AI-10 Notes:** Accessible via "AI Audit" button in header. Primary view grouped by AI type (not chronological). Per type: total calls, estimated cost, avg latency, locations triggered (expandable). Session-scoped data in S16a; lifetime data wires in S16b.

**AI-11 Notes:** Logs per step: step_id, agent_id, model, tokens_in, tokens_out, latency_ms, rag_hits, confidence_score, timestamp. Data source for AI-10 and AI-12.

**AI-12 Notes:** Per-task, per-step breakdown: tokens in/out, model used, latency, RAG hits/misses, confidence, timestamp. Exportable report for IT/procurement governance. Distinct from AI-10 (Activity Panel = global view; AI-12 = deep dive per task). Builds with mock data in S-AI-01; live data after S11.

**AI-13 Notes (S16a spec — LOCKED):**
- Panel renamed: "AI Audit" (was "AI Activity Panel")
- Header button in AppShell: "AI Audit" (was "AI")
- Header strip: Total Calls · Total Cost · Active Types · Models in Use — Clear Log button removed
- Section 1 — By Activity Type: 9 Phase 1 types (adding Knowledge Reinforcement — Brent self-learning write-back to Supabase), 4 Future Tracking planned rows. Columns: Total, Est. Cost, Avg Latency. 30D column removed.
- Section 2 — By LLM: dynamic, grouped by model. Columns: Provider, Model, Total Calls, Est. Cost, Avg Latency
- Section 3 — Future Tracking (planned, grayed): Agent Performance Score · Prompt Version Tracking · Cost Anomaly Detection · Human Review Rate
- Section 4 — By Agent: dynamic, any agentId in log gets a row. Columns: Agent Name, Code, Total Calls, Est. Cost, Avg Latency. Unknown agentIds fall back to raw ID.
- Architect Checklist tab: NO CHANGES — already complete (AI-15 ✅ Done)
- Data: session-scoped in S16a. Lifetime persistence added in S16b.

**AI-16 Notes (S16b spec — LOCKED):**
- Table already exists in Supabase: `ai_activity_log` (NOT `ai_call_log` — spec corrected 2026-06-07 via MCP)
- Actual columns: id, tenant_id, ai_type, feature, model, agent_id, task_id, input_tokens, output_tokens, latency_ms, knowledge_tier, cost_usd, created_at
- No migration needed — table created prior to S16b
- No separate backend endpoint — `logAICall()` writes directly to Supabase client (fire-and-forget)
- `logAICall()` extended with optional `taskId` param; non-blocking insert to `ai_activity_log`
- New `hydrateFromSupabase()` function seeds in-memory store on panel mount
- On panel mount: reads `ai_activity_log` from Supabase (limit 500, desc) and seeds the in-memory store
- Result: metrics accumulate from S16b commit day, never reset
- Kickoff doc: `docs/kickoffs/v5.1.19-AI16-ai-audit-persistence.md`

---

## AGENT IDENTITY & CONFIGURATION — AG

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| AG-01 | Michelle static identity in agents.js | ❌ Missing | S-BENCH-01 |
| AG-04 | Michelle UI presence on planning screens | 🔶 Partial | S10b ✅ S10p ✅ S-BENCH-01 full |
| AG-05 | api/plan.js reads Michelle prompt from Supabase | ❌ Missing | S-BENCH-01 LOCKED |
| AG-06 | Michelle surgical replanning directive | ❌ Missing | S-BENCH-01 LOCKED |

**S-BENCH-01b Susan Smith — Full Spec (needs design session):**
- Code: `TR-08` | Role: Trainer Agent | `isTrainer: true`
- Roster position: after Pat Smiley (IR-07)
- Full spec requires dedicated design session before S-BENCH-01b

| AG-10 | Susan Smith UI presence as Trainer in Training tab | ❌ Missing | S-BENCH-01b |
| AG-11 | api/train.js reads Susan Smith prompt from Supabase | ❌ Missing | S-BENCH-01b LOCKED |
| AG-12 | Susan Smith can be assigned to train other bench agents | ❌ Missing | S-BENCH-01b LOCKED |
| AG-24 | Susan Smith (TR-08) — **agent-triggered reinforcement**, new platform-wide capability extension (not Apple-only). Today her reinforcement pipeline (PE-03) only fires from a human clicking "Add Courses" in the Training tab. This adds the first agent-triggered call into it — The Reasoner's synthesized Learned Context hands off to her for embedding, same mechanism, new trigger source. Both agents visibly attributed wherever this fires (Learned Context card, `ai_activity_log`) — same pattern as Dan Bingham's Prompt Service collaboration credit, never a silent single-agent write. Built as part of S-APPLE-05, benefits the whole platform. | ❌ Missing | S-APPLE-05 |
| AG-25 | Apple Channel — **Emerging Market Prioritization Agent** (roadmap, not yet designed in depth — draft only). Distinct from the GEO CSO Expert: pulls **live external data via Brent** (existing ReAct/Playwright web agent) rather than static pre-seeded RAG — smartphone penetration (GSMA), upgrade cycle data (Counterpoint), GDP growth (World Bank public API), carrier landscape (GSMA/Wikipedia). Outputs a structured Market Prioritization card (opportunity signal, signal strength, recommended channel motion, key data points, data gaps). Not part of the Market Intelligence 6-agent build — a separate future capability, second of the original 3-agent arc (90 days / 6 months / 12 months). Draft spec: `docs/DEEPBENCH-APPLE-BUILD-PLAN.md` "Agent 2". | ❌ Missing | S-future (design session required) |
| AG-26 | Apple Channel — **Partner Training Readiness Agent** (roadmap, not yet designed in depth — draft only). Different user than every other Apple Channel agent — serves partner reps (carrier/retail staff), not GEO directors. Conversational product/program Q&A, sales-scenario coaching, quiz mode. HITL-gated on pricing/promo questions (change frequently) or low confidence. Third of the original 3-agent arc. Draft spec: `docs/DEEPBENCH-APPLE-BUILD-PLAN.md` "Agent 3". | ❌ Missing | S-future (design session required) |
| AG-27 | **The Librarian** — platform-wide agent (not Apple-specific), roadmap/draft only. Custodian of the Library (`knowledge_entries`): owns safe retrieval and, in the multi-tenant future, tenant-isolation enforcement at query time (e.g. Verizon cannot reach Apple's Data Room) rather than trusting each calling agent to scope correctly. Distinct from Nadia Farouk (Data Expert, AG-19): Nadia does Apple-specific domain-content judgment (what a new chunk should say, dispute resolution, escalation research); the Librarian would do generic infrastructure enforcement that any agent's retrieval — including Nadia's — routes through. Would resolve the open CSO's Data Room access question (both GEO CSO Expert and Forecast/Theory/Performance Expert need to read one Data Room) as a natural consequence rather than the "shared agent_id" workaround discussed in S-APPLE-01b-design. Architecturally this shifts RAG from a Technical Service any Skill Profile calls directly today (`ARCHITECTURE.md` — "single source of truth for RAG retrieval") to agent-brokered access — a real design decision, not just a naming exercise. Build precedent: Dan Bingham's existing cross-cutting collaborator pattern (AA-59/AA-65 — secondary UI credit, separate `ai_activity_log` row) rather than inventing new infrastructure from scratch. Directly relevant to the live RLS-disabled finding on `knowledge_entries` (Supabase advisor check, 2026-07-01) — today nothing enforces tenant isolation at the data layer either. Named in S-APPLE-01b-design (2026-07-01) — needs its own dedicated design session before any build. | ❌ Missing | S-future (design session required) |

---

## MARKET INTELLIGENCE — MI
> Full design: `docs/APPLE-AGENT-1-v5-DESIGN.md` (supersedes v1/v2/v3-spec — retired)
> Third AppShell tab, default landing route after splash. Center-screen content per `market-intelligence-v4.html` (its simulated top/bottom nav is not used — real DeepBench nav applies).
> Design session: Apple v5 Redesign (2026-06-30).

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| SH-15 | Market Intelligence tab — third tab in AppShell navigation: Work \| Bench \| Market Intelligence. Default route after splash screen (supersedes `ARCHITECTURE.md` §8's `/` = Work dashboard). | ❌ Missing | S-MARKET-INTEL-01 |
| MI-01 | Market Intelligence screen — three-column layout per `market-intelligence-v4.html` center content. Column 1 Chat: intent-classified conversation, 5-intent front door (Q/A, Run a Theory, Forecast, Correct, Escalate) replaces v4's fixed post-flag wizard. Column 2 Evidence: Data Room charts by default, switches to Theory Evidence + live Stress Test result the moment a hypothesis is selected/written — before commit, not after (v4 ordering bug fixed). Column 3 Audit: About/roadmap drawers, Agent Build Approach, Demo Reset control. Full behavior spec: design doc §2–4. | ❌ Missing | S-MARKET-INTEL-01 |
| MI-02 | Deterministic human-decision layer — intent confirmation, hypothesis pick/write, and commit (Discard / Track as Assumption / Make Permanent) stay explicit UI controls by design, never agent-inferred, since these are the points where the human declares will on an action that may write to the Data Room. Everything else on the screen is agent-orchestrated, not scripted. Design doc §2. | ❌ Missing | S-MARKET-INTEL-01 |
| MI-03 | Available Data / Evidence panel — Data Room charts + Theory Evidence view. Four data layers with badges: sourced / inferred / synthesized / **learned** (4th layer, new in v5 — Reasoner's consolidated corrections). Pre-built static charts carried from v4. Chart generation from live queries remains roadmap. | ❌ Missing | S-MARKET-INTEL-01 (basic) · S-MARKET-INTEL-03 (full panel) |
| MI-04 | Pipeline Log panel — real event log driven by actual agent calls (not scripted): Intent Routing result, GEO CSO Expert answer + `needs_review`, Proofreader (Guardrail+Eval unified) pass/block/revise + reason, Stress Test result, Intake Assistant triage routing, Reasoner Memory Consolidation write when it fires. | ❌ Missing | S-MARKET-INTEL-01 (basic log) · S-MARKET-INTEL-02 (full detail) |
| MI-05 | *(superseded — Eval Agent is no longer a standalone panel item; folded into AG-22 The Proofreader, which unifies Guardrail + Eval into one pre-display gate)* | — | Folded into AG-22 |
| MI-06 | Apple Channel section in AI Audit — grouped "Apple Channel" header in By Agent section, covering all 6 v5 agents (CI-01 GEO CSO Expert, Forecast/Theory/Performance Expert, Data Expert, The Proofreader, The Intake Assistant, The Reasoner). Shows Apple-specific pattern counts, cost, latency separately from platform agents. | ❌ Missing | S-MARKET-INTEL-03 |
| MI-07 | Roadmap vision, stated on-screen (About/roadmap drawer) — per-GEO specialist agents, and per-GEO-per-program specialist agents, as a depth path beyond the platform-wide 6-agent model. Not built — a stated future-scaling narrative only. | ❌ Missing | S-future (roadmap statement only) |
| MI-09 | Platform Leverage callout — folds into "About Market Intelligence" drawer. Three honest counts: existing platform capabilities reused as-is, new mechanisms built here that are generalizable platform-wide, and genuinely domain-specific/non-transferable pieces. Proves the platform pitch with this specific build rather than asserting it abstractly. Full spec: design doc §10c. | ❌ Missing | S-MARKET-INTEL-01 or S-MARKET-INTEL-03 |
| MI-08 | Data Room versioning + Demo Reset — `knowledge_entries` schema migration, corrected 2026-07-01 against live schema: `data_type`, `citeable` (both newly discovered missing, referenced throughout design doc §3 but never actually added), `is_baseline`, `supersedes_id`, `confidence`, `override_flag` (6 new columns; `status` already exists, gains `superseded`/`archived` as valid values, not a new column). Rows never overwritten, only superseded via insert — schema migration ships in S-APPLE-01b. Demo Reset UI control in Column 3 Audit, one confirm step, archives (never deletes) all non-baseline rows and restores baseline to active — scoped to the Data Room only, never touches `agent_configs` (agent behavior/learning untouched) — UI control itself ships with the Market Intelligence screen, not S-APPLE-01b. Full spec: design doc §7. | ❌ Missing | Schema: S-APPLE-01b · Demo Reset UI: S-MARKET-INTEL-01 or 03 |

---

**S-BENCH-01 Michelle Manning — Full Spec:**
- Code: `PP-01` | Role: Project Manager | `isPlanner: true`
- Roster position: between Mike Alvarez (SR-02) and Pat Smiley (IR-07)
- Quip: *"I map the mission before anyone moves."*
- Avatar: real photo (not silhouette) — replaces `MichelleAvatar.jsx` placeholder
- System prompt: lives in Supabase `agent_configs` — NOT in code [LOCKED]
- `api/plan.js` and `api/title.js` read her prompt from Supabase [LOCKED]
- Fully trainable via Teach + RAG pipeline [LOCKED]
- Stub in use until S-BENCH-01: `const MICHELLE = { name: "Michelle Manning", code: "PP-01", initials: "MM" }`
- **Do not add Michelle to `agents.js` or remove the stub before S-BENCH-01**

---

## DELIVERABLES — DL

> **Q5 RESOLVED 2026-06-13:** Step outputs and task deliverables are two tiers of the same first-class object. Step deliverables (`step_id` set) are intermediate; task deliverables (`is_final: true`, no `step_id`) are the assembled final output. Both live in the `deliverables` table. User can inspect any step deliverable and approve or request a change. Change requests go back to the assigned agent and update the final task deliverable when resolved. Every deliverable links to `agent_id` → surfaces on the agent's Projects tab (PE-06) and feeds the adaptive learning loop (change requests = training signal).

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| DL-01 | Step output type label (Michelle assigns at plan time — Research / Analysis / Report / Review / etc.) | ❌ Missing | S-DELIVER-01 |
| DL-02 | Deliverables Card — right panel on task view; shows final task deliverable + link to each step's output | ❌ Missing | S-DELIVER-02 |
| DL-03 | Per-step deliverable access inline — click step → open its deliverable; approve or request change | ❌ Missing | S-DELIVER-03 |
| DL-04 | `deliverables` table — two-tier model: step deliverables (step_id set) + task final (is_final: true); columns: id, tenant_id, task_id, step_id, agent_id, type, title, content jsonb, format, status (draft/approved/change_requested), is_final, is_shared, share_token, price_usd, created_at | ❌ Missing | S-DELIVER-04 |
| DL-05 | Change request flow — user requests revision on a step deliverable; status → change_requested; agent is notified; resolution updates final task deliverable; change request is a training signal fed to adaptive learning | ❌ Missing | S-DELIVER-04 |
| DL-06 | Supervised training feedback loop — approved deliverables can be flagged for ingestion; change request resolutions auto-flagged; user confirms before vectorization | ❌ Missing | S-DELIVER-05 |
| DL-07 | Agent work history on Projects tab (PE-06) — wired to `deliverables` table; shows deliverable count, types, task names, dates per agent; categorizes what kind of work each agent is capable of | ❌ Missing | S-DELIVER-04 |
| DL-08 | Deliverable sharing — signed URL, public preview (partial) vs. paid full access tiers | ❌ Missing | S-DELIVER-06 |
| DL-09 | Deliverable marketplace — publish, price, sell; 30/60/10 split (platform/IP owner/infrastructure) | ❌ Missing | S-future (Phase 4) |
| DL-10 | Web Research Report + Data Fetch as `deliverables` table entries — on ReAct run completion (DONE or DOWNLOAD terminal state), write deliverable record to `deliverables` table. Covers Web Research Report (synthesis content) and Data Fetch/Dataset (file reference + metadata). Enables DL-02, DL-05, DL-07 for Brent and Pat runs. | ❌ Missing | S-DELIVER-04 |
| DL-11 | Task / Step Plan as `deliverables` table entry — on "Approve Steps & Launch", write approved plan as type: "plan", is_final: false; becomes parent record of all step-level deliverables produced during execution; enables plan history, plan-level change requests, Michelle attribution on Projects tab | ❌ Missing | S-DELIVER-04 |
| DL-12 | Flags Report + Data Analysis Report as `deliverables` table entries — when user views Flags Report or exports analysis from Analyzer, write deliverable record; type: "flags_report" and "analysis_report" respectively; no ✦ AI badge on Flags Report (deterministic); enables DL-02 and DL-07 for Analyzer outputs | ❌ Missing | S-DELIVER-04 |

**DL-10 Notes (locked 2026-06-15, S-DELIVER-DESIGN Part 2):**
- Same `deliverables` table as all other deliverable types — no new table
- Web Research Report: `type: "web_research_report"`, `agent_id: "brent"` (or "pat"), `content: jsonb` with synthesis text + run metadata
- Data Fetch/Dataset: `type: "dataset"`, `agent_id: "brent"` (or "pat"), `content: jsonb` with file reference + row count + column summary
- Both written on terminal state (DONE or DOWNLOAD) in the Railway ReAct loop → Vercel write via Supabase client
- Both go through approve/change-request flow (DL-05) when surfaced in Deliverables Card (DL-02)
- Self-Learning Write-back (M-04 in CAPABILITIES.md) continues to write to `knowledge_entries` independently — two separate write targets from one run
- Depends on: DL-04 (`deliverables` table), M-03 ReAct Loop terminal state detection

**DL-11 Notes (locked 2026-06-15, S-DELIVER-DESIGN Part 2):**
- Written at "Approve Steps & Launch" — same moment `task.status` moves to "active"
- `type: "plan"`, `is_final: false` — not the terminal deliverable, but the parent record
- `content: jsonb` — stores the full approved step array (same structure as `task.steps` JSONB)
- `step_id: null`, `agent_id: "michelle"` (PP-01)
- Step deliverables produced during execution reference this record as their parent via `task_id`
- Enables Michelle's work to appear on her Projects tab (PE-06 / DL-07) — she is the planner of record
- Depends on: DL-04 (`deliverables` table), AW-11 (Approve Steps & Launch)

**DL-12 Notes (locked 2026-06-15, S-DELIVER-DESIGN Part 2):**
- Flags Report: `type: "flags_report"`, no `agent_id` (deterministic, no agent authorization), `content: jsonb` with flag array + dollar amounts
- Data Analysis Report: `type: "analysis_report"`, no `agent_id`, `content: jsonb` with summary stats + tab-level outputs
- Written when user views or exports — not on CSV upload (analysis runs client-side; write triggered by user action)
- No ✦ AI badge on Flags Report — deterministic capability per ARCHITECTURE.md badge rule
- Data Analysis Report carries Mixed type — Concerns tab (deterministic) + AI Review tab (AI) — badge applies to AI Review tab only
- Depends on: DL-04 (`deliverables` table), AZ-01 (CSV upload), M-06 Flag Computation

---

## AGENT ARCHITECTURE — AA
> Full spec: docs/AGENT-ARCHITECTURE.md (created S-AGENT-ARCH-01)

### Phase 1 — Foundation

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| AA-01 | `agent_character` table — character settings per agent (philosophy, skeptic_level, autonomy_level, temporal_stance, epistemology, confidence_calibration, peter_principle, collaboration_role, ethical_constraints, learning_stance, lock states per field) | ❌ Missing | S-INFRA-01 |
| AA-02 | `training_type` column on `knowledge_entries` — tags: knowledge / behavioral / reasoning / character | ❌ Missing | S-INFRA-01 |
| AA-70 | Business-category convention for the existing `category` column on `knowledge_entries` — column already exists live (free text, already populated for other agents: Brent "Portal Navigation", Michelle "Capability Registry"/"Agent Registry"/"Platform Knowledge", Robyn "Best Practice") — no schema change needed. Initial vocabulary decided and applied in `APPLE-DATA-ROOM-SOURCE-DATA.md` (2026-07-01): `market_data` (Datasets 1-4), `program_structure` (Dataset 5), `industry_benchmark` (Dataset 6), `geo_briefing` (the 3 GEO briefings), `partner_scenario` (the 10 partner scenarios). Not yet enforced anywhere in code — no validation, no retrieval filter uses it yet. Independent of `data_type` (epistemic trust tier) and `skill_profile_slug` (S-INFRA-01 Data Room scoping, see `ARCHITECTURE.md` §3). | 🔶 Partial (vocabulary defined, unused in code) | S-APPLE-01b (seed) |
| AA-71 | Time-series trend comparison for Data Room content — distinct from the §7 correction-versioning system (which supersedes stale/wrong facts via `supersedes_id`). When new period-over-period data arrives for the same tracked entity (e.g. a partner's Q4 co-op utilization vs. their Q3 figure), both chunks stay independently `status: active` — nothing currently links them as the same entity across periods, retrieves them together, or projects a trend/forecast from the comparison. Needs an entity/tracking key (e.g. partner_id + period) and either a dedicated retrieval path or a Stress Test enhancement that explicitly pulls prior periods when reasoning about a trend. Named in S-APPLE-01b-design (2026-07-01). | ❌ Missing | S-future (design required) |
| AA-72 | `api/load-entries.js` PATCH endpoint hardcodes `status` to only accept `'active'`/`'disabled'` (line ~76) and its GET SELECT column list doesn't include `data_type`, `citeable`, `is_baseline`, `supersedes_id`, `confidence`, or `override_flag` (MI-08's new columns). Discovered during S-APPLE-01b-design (2026-07-01) Architect Review — not a blocker for S-APPLE-01b itself, which only inserts new rows and never calls this PATCH endpoint. Will block whichever session first writes `status: 'superseded'`/`'archived'` through this route (candidates: S-APPLE-05 Reasoner Memory Consolidation, or the Demo Reset UI control) unless that session either updates this whitelist/SELECT or writes through a different path (e.g. a dedicated Data Expert/Reasoner capability route instead of the Teach-screen-specific `load-entries.js`) — open question for that session's own Architect Review, not resolved here. | ❌ Missing | Resolve before S-APPLE-05 or Demo Reset UI ships |
| AA-54 | Handler registry expansion — `api/lib/handlers/dispatch.js` (route to agent/capability-route), `api/lib/handlers/package.js` (prose → docx/pdf), `api/lib/handlers/mcp.js` (call MCP server with result). Action deliverable category: `format: "action"`, `handler: "dispatch"` or `"mcp"`. Hybrid deliverable: runs both store + action handlers. `format_contract.handler` slug on Format Skill Profile routes to correct module. Design session required. | ❌ Missing | S-future (design required) |
| AA-56 | DB Assembly `runtime_context` input parameter — optional string injected as "Additional Context" section at the end of the assembled sections array. Passes Q&A clarifying answers from the re-generate flow into the full Prompt Service pipeline so Michelle receives the best possible context on regeneration. Without this, re-generate would fall back to the hardcoded pass-through path and bypass Michelle's Skill Profiles. | ❌ Missing | S-PM-05a |
| AA-55 | Server-side `ai_activity_log` write pattern for all Prompt Service routes — currently only `request-receivable.js` logs server-side. When MCP callers or non-frontend callers are introduced for DB Assembly or AI Enrichment, those routes need server-side logging too. Extend pattern to `db-assembly.js` and `ai-enrichment.js`. | ❌ Missing | S-future (MCP era) |
| AA-59 | Dan Bingham as Prompt Architect — DB Assembly + AI Enrichment become Dan's named capability routes. Dan's agent_id (ps-01) is passed alongside the requesting agent in every Prompt Service call. Dan's skill profiles carry REFLECT and Synthesis configuration as traits. Dan is shown as a collaborator in the UI alongside the primary agent everywhere the Prompt Service fires. Dan logs to ai_activity_log separately from the requesting agent with his own service entry in SERVICE_CATALOG. Partial: db-assembly SERVICE_CATALOG entry + AI_TYPE_TO_SERVICE wired. Logging (ps-01 in ai_activity_log) → S-PROMPT-ARCH-01. | 🔶 Partial | S-DAN-02 (eb8285d) → S-PROMPT-ARCH-01 |
| AA-63 | Content specialist routing — deliverable tiles on Create Work Order route to the appropriate content specialist agent based on deliverable type. Michelle remains the planner specialist. Brent remains the web specialist (Railway + Playwright — unchanged). Future content specialists: Research & Analysis, Data Insights, Document & Compliance. Each has Identity + Behavior + Knowledge + Intent skills only — no Format Skill. Design session required before coding. | ❌ Missing | S-CONTENT-01 (design required) |
| AA-65 | Dan Bingham UI collaboration indicator — when the Prompt Service fires for any agent, a small secondary indicator shows Dan as a collaborator alongside the primary agent. Not a separate step in the work order. Applied everywhere the Prompt Service runs: Create Work Order Generate Plan, TaskInstructionsScreen Re-generate (post S-PM-06), and all future prompt-service callers. Dan's contribution is also visible in the AI Audit as a separate team member row. Partial: PromptEvolutionModal footer two-chip indicator (primary agent chip T.brass + Dan chip T.moss). Other surfaces → S-PROMPT-ARCH-01. | 🔶 Partial | S-DAN-02 (eb8285d) → S-PROMPT-ARCH-01 |
| AA-66 | Identity section additive assembly — db-assembly.js Identity section combines ALL non-blank sources: agents table (name, role, specialty), all role_prompt entries from agent_configs (not just is_default), skill profile objective + method. Every source that is not blank is included. No OR logic — additive always. Depends on AA-58 (agents table). Partial implementation in S-AGENT-TABLE-01 (assembly logic wired; full integration tested when identity skill profiles are seeded). | 🔶 Partial | S-AGENT-TABLE-01 → S-PROMPT-ARCH-01 |
| AA-69 | Prompt Service chain timeout risk — plan.js maxDuration is 60s but request-receivable.js has AbortSignal.timeout(55000) on the main Sonnet call. DB Assembly (~5s) + AI Enrichment (~10s) + Request & Receivable (up to 55s) = up to 70s total, exceeding the 60s budget. Intermittent 504s observed under load. Fix: reduce AbortSignal timeout in request-receivable to 40s to guarantee headroom. Low priority while calls typically complete in 15–25s. | ❌ Missing | S-future (low priority) |
| AA-45 | Multi-LLM conflict resolution — when multiple Skill Profiles in a Capability declare different LLM configs, resolve by Format Skill priority. Platform defaults handle for now. | ❌ Missing | S-future (design required) |
| AA-46 | User-declared priority in task_context — formal parsing of priority signals embedded in the task string (e.g. "urgent", section weighting). AI Enrichment surfaces naturally for now. | ❌ Missing | S-future |
| AA-47 | DB Assembly relevance flagging — lightweight AI annotation on Prompt Request sections to guide AI Enrichment prioritization. Deferred until pipeline is proven. | ❌ Missing | S-future (design required) |
| AA-48 | RAG query expansion — use AI to expand task_context into richer search queries before RAG retrieval. Belongs to AI Enrichment layer. | ❌ Missing | S-future (design required) |
| AA-49 | Contextual Compression — before injecting RAG chunks into the prompt, run a compression pass that strips irrelevant sentences from each chunk, keeping only the portion directly relevant to the query. Reduces token usage without losing coverage. Belongs in AI Enrichment Fetch step, runs after RAG retrieval and before Render. Design session required. | ❌ Missing | S-future (design required) |
| AA-50 | Semantic Caching — cache assembled prompts (AI Enrichment output) by capability + agent + query similarity. Near-identical queries return cached prompt without re-running RAG + REFLECT + synthesis. Directly addresses the open DB Assembly caching decision in PROMPT-SERVICE-MODEL.md. Design session required before coding. | ❌ Missing | S-future (design required) |
| AA-51 | format_contract validation skill — pre-flight Capability check before DB Assembly runs; detects missing Format Skill Profiles and surfaces a structured gap signal to the caller rather than silently defaulting to html. Future direction: validation skill asks capability-level clarifying questions to close the gap before execution. Design session required. | ❌ Missing | S-future (design required) |
| AA-52 | Synthesis quality gate — after Intelligent Synthesis rewrites the assembled prompt, run a LLM-as-Judge (PAT-15) verification pass to confirm all guardrails, format instructions, and factual constraints survived the rewrite. If any are missing, restore from pre-synthesis version. Belongs in AI Enrichment Step 4. Design session required. | ❌ Missing | S-future (design required) |
| AA-04 | Two-speed routing — fast path (chat, DB only, Haiku, top 3 RAG) vs. deep path (tasks, full assembly, Sonnet, top 10+ RAG); agent depth level sets default, task complexity can override upward | ❌ Missing | S-INFRA-01 |

### Phase 2 — Intelligence Visibility

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| AA-05 | Character Layer L1 settings panel — Personnel File new tab: philosophy dropdown, skeptic level slider, autonomy dial, lock/adaptive/supervised toggle per setting | ❌ Missing | S-CHAR-01 |
| AA-06 | Agent Intelligence Score (AIS) — 100 pts: Identity 10, Character 15, Behavioral 15, Reasoning 20, Knowledge 40 (Volume 10 + Freshness 10 + Coverage 10 + Activity 10). Displayed on Personnel File header + Roster cards | ❌ Missing | S-AIS-01 |
| AA-07 | Capability Score (CS) — separate 0–100: breadth (capabilities assigned / available) × depth (avg depth level). Displayed alongside AIS | ❌ Missing | S-AIS-01 |
| AA-08 | Knowledge hunger mechanic — freshness decay curve (100% day 0–30, 85% day 31–60, 70% day 61–90, 50% day 91–180, 30% day 181+, stale flag); hunger states: Fed / Peckish / Hungry / Starving | ❌ Missing | S-HUNGER-01 |
| AA-09 | Domain coverage map — visual grid of topic areas, named gaps, specific upgrade prompts per gap | ❌ Missing | S-HUNGER-01 |
| AA-10 | Training streak — weekly cadence, bonus AIS points (4wk +2, 12wk +5, 52wk +10 + badge) | ❌ Missing | S-HUNGER-01 |
| AA-11 | Character Layer L2–L4 training — behavioral-tagged, character-tagged RAG retrieval; character deepens through training material uploads | ❌ Missing | S-CHAR-02 |

### Phase 3 — Revenue

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| AA-12 | Free tier — L1 unlimited (monthly cap), 3 one-time L2 trials (never resets) | ❌ Missing | S-REV-01 |
| AA-13 | Pay-per-use pricing — no subscription required, ~2x subscription per-use rate, scales by depth level | ❌ Missing | S-REV-01 |
| AA-14 | Depth Delta Panel — after every task output, shows specifically what next depth level would have added; L3 preview = first 30% of real output, rest gated | ❌ Missing | S-REV-01 |
| AA-15 | BYOK discount display — shown at moment of payment, real number dynamically calculated from actual API cost differential | ❌ Missing | S-REV-01 |
| AA-16 | Subscription tiers — base fee + usage allowance + overage billing, tiered by depth level | ❌ Missing | S-REV-02 |

### Phase 4 — Marketplace

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| AA-17 | Lock/Adaptive/Supervised controls — UI toggle per dimension and character setting | ❌ Missing | S-MARKET-01 |
| AA-18 | Access tags — exclusive/shared and public/private per capability assignment; exclusivity = 2x rate | ❌ Missing | S-MARKET-01 |
| AA-19 | Margin sharing engine — 30% platform / 60% IP owner / 10% infrastructure; $0.10 minimum L4 price | ❌ Missing | S-MARKET-01 |
| AA-20 | BYOK economics — 40% markup when platform provides keys; BYOK pays subscription only | ❌ Missing | S-REV-01 |

### Phase 5 — Scale and Enterprise

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| AA-21 | John Leonard agent (JL-01) — persona replication reference implementation; Philosophy + Ethical Constraints locked; all other character settings supervised adaptive; training priority: annotated session transcripts → ARCHITECTURE.md → behavioral docs → domain docs | ❌ Missing | S-JL-01 (design session required) |
| AA-22 | Test Agent console — full dimension testing (extends PE-12); one scenario per dimension; Test Scorecard per run (Output Quality, Character Alignment, Confidence Calibration, RAG chunks, Reasoning depth, Depth delta, Verdict + suggested training) | ❌ Missing | S-MIGRATE-06 (spec updated) |
| AA-23 | Test Team cross-agent depth comparison (extends existing Test Team screen — NIGP "Bee" pattern); same task run at L1/L2/L3, scorecard per depth | ❌ Missing | S-TEST-01 |

### Future Backlog (design session required before scheduling)

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| AA-24 | Multi-agent workflow handoff design — collaboration roles (Lead/Execute/Challenge/Synthesize) and how agents pass work in a task workflow | ❌ Missing | S-future |
| AA-25 | Deliverables marketplace UI — discovery, preview, purchase flow for other tenants' published capabilities and deliverables | ❌ Missing | S-future |
| AA-26 | Notification architecture — hunger alerts, training streak reminders, competitive comparison notifications (optional, user-controlled) | ❌ Missing | S-future |
| AA-27 | Agent versioning + rollback — significant retrain creates new version; user can roll back to prior version | ❌ Missing | S-future |
| AA-28 | Government audit trail — immutable log of who trained what, when, with what material, and what the agent produced; enterprise compliance requirement | ❌ Missing | S-future |
| AA-29 | "Create from Person" guided flow — setup wizard for persona replication: walks through all 5 dimensions + character settings for a real human | ❌ Missing | S-future |
| AA-30 | Training provenance display — deliverables and outputs show which training material and reasoning patterns influenced the result | ❌ Missing | S-future |
| AA-31 | Competitive comparison notifications — optional: shows how your agent ranks vs. category peers by AIS and CS; user can disable | ❌ Missing | S-future |

### Phase 2 Additions (from S-AGENT-ARCH-01 cont.)

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| AA-32 | Auto-categorization after training upload — Haiku reads ingested doc, identifies topic areas, posts expertise chips to Training tab, updates domain coverage map in real time; user sees immediately what the agent just learned | ❌ Missing | S-HUNGER-01 |
| AA-35 | Agent templates — pre-configured character settings + capability assignments for common roles (Compliance Analyst, Project Manager, Domain Expert, Marketing Strategist); user picks template and customizes from L1 baseline | ❌ Missing | S-BYOA-01 (design required) |
| AA-36 | Quick-start from description — user pastes job description or role description; Haiku auto-configures character settings and suggests capability assignments; user reviews and approves before agent is created | ❌ Missing | S-BYOA-01 (design required) |
| AA-37 | Demo seeding — pre-seed existing roster agents (Chloe, Mike, Bob, Robyn, etc.) with character settings + meaningful AIS scores so platform demos as differentiated without any training required by the visitor | ❌ Missing | S-CHAR-01 |
| AA-41 | Build Your Own Agent — 5-step guided wizard: (1) Identity — name, role, quip, avatar; (2) Character — philosophy picker, skeptic slider, autonomy dial, advanced settings collapsed; (3) Capabilities — assignment menu + depth + LLM; (4) Knowledge — optional first upload/URL/template; (5) Review — AIS starting score + plain-English character summary (not settings labels). Design session + UX mockup required before coding. | ❌ Missing | S-BYOA-01 (design required) |
| AA-42 | Michelle pattern advisory — at plan time, Michelle identifies when a step's requirements call for a pattern the assigned agent doesn't currently provide; shows greyed advisory chip on the step card alongside the normal pattern badge indicating what pattern would be needed. Design session required before coding. | ❌ Missing | S-future (design required) |
| AA-43 | PM-initiated capability/agent creation from gap detection — during the Capability Assignment pass, the Orchestrator detects steps it cannot assign and proposes what needs to be built: draft Skill Profiles, a new Capability spec, optionally a new Agent identity. HITL: user approves before any record is created. On approval, new capability is created and embedded into RAG — closing the gap for future Work Orders. Extends AA-38 (Agent Builder Agent) with a new trigger: internal gap detection vs. user request. Design session required. | ❌ Missing | S-future (design required) |

### Phase 3 Additions (from S-AGENT-ARCH-01 cont.)

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| AA-33 | Video file upload for training — upload .mp4/.mov/etc. → Whisper transcription (OpenAI, ~$0.006/min) → cleanup pass (Haiku) → existing extraction/chunking/embedding pipeline; transcription cost shown to user before committing | ❌ Missing | S-TRAIN-EXT-01 |
| AA-34 | URL link training — paste web page URL, YouTube link, or general video URL; single capability route (`api/capabilities/url-ingest.js`) detects type and routes: web page → crawl + extract, YouTube → transcript API (free), video URL → download + Whisper; result enters existing chunking/embedding pipeline | ❌ Missing | S-TRAIN-EXT-01 |
| AA-39 | Transcript annotation assist — Haiku first-pass annotates reasoning transcripts (identifies decision points, reasoning arcs, what-was-ruled-out moments); John reviews and corrects; corrected version ingested as reasoning-tagged training material for JL-01 and future persona replication use cases | ❌ Missing | S-JL-01 |

### Phase 5 Additions (from S-AGENT-ARCH-01 cont.)

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| AA-38 | Agent Builder Agent — AI agent that designs and configures a new agent from a description; user describes the role needed; agent proposes full spec (name, character settings, capability assignments, suggested training material list, projected AIS at L1 and L3); human approves before creation; Susan (TR-08) assigned to train after creation. Design session required. | ❌ Missing | S-future |
| AA-40 | JL-01 demo scenario — specific test scenario that demonstrates JL-01's reasoning layer matches John's actual reasoning arc; designed to show to employers/investors; scenario chosen to elicit planning questions + architectural recommendation that mirrors John's documented decision patterns | ❌ Missing | S-JL-01 |

---

## MCP PLATFORM EXPOSURE — MC
> Full spec: `docs/AI-SERVICES.md` Section 7
> All items Phase 4+. Design session required before any MCP surface is built: S-MCP-01 (not yet scheduled).

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| MC-01 | MCP Agent — expose a named agent as an MCP server; agent capabilities available as MCP tools to Claude Desktop and external AI clients | ❌ Missing | S-MCP-01 |
| MC-02 | MCP Capability — expose a specific Capability without full agent persona; more granular than MC-01 | ❌ Missing | S-MCP-01 |
| MC-03 | MCP Deliverable — expose deliverable production as an MCP tool; caller receives structured typed deliverable output | ❌ Missing | S-MCP-01 |
| MC-04 | MCP Service — expose a single AI Service directly as an MCP tool; finest granularity; infrastructure licensing tier | ❌ Missing | S-MCP-01 |
| MC-05 | MCP Workflow — expose full multi-step task pipeline as one MCP tool; caller receives completed task with all deliverables | ❌ Missing | S-MCP-01 |
| MC-06 | MCP Training — allow external systems to push training material to an agent via MCP; enterprise DMS/CMS integration | ❌ Missing | S-MCP-01 |
| MC-07 | MCP Feedback — allow external systems to send approval or change-request signals via MCP; closes feedback loop without DeepBench login | ❌ Missing | S-MCP-01 |

---

## WORK ORDER — WO
> Replaces "Task" app-wide. Full model: `docs/WORK-ORDER-MODEL.md`
> S-RENAME-01 is a pre-requisite before any WO coding session.

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| WO-02 | Work Order creation flow — replace current Assign Work screen with Work Order creation: Intent picker (9 intents), Format picker (filtered by Intent), goal/purpose/audience/scope fields, Deliverable specs array with per-spec constraints | ❌ Missing | S-WO-01 |
| WO-03 | Work Order `deliverables[]` — structured Deliverable spec array inside Work Order jsonb; minimum 1 spec; each spec carries intent, format, action, constraints (must/must-not), template ref | ❌ Missing | S-WO-01 |
| WO-04 | Work Order lifecycle states — draft → submitted → planning → awaiting_approval → in_progress → paused → change_requested → complete / failed / gap_flagged | ❌ Missing | S-WO-01 |
| WO-05 | `parent_work_order_id` stub — nullable FK on work_orders table; no UI yet; enables future Work Order decomposition | ❌ Missing | S-WO-01 |
| WO-06 | `depends_on` on step — nullable jsonb field listing step IDs that must complete before this step runs; stub only; enables future parallel execution | ❌ Missing | S-WO-01 |

---

## INTENT — IN
> Full model: `docs/INTENT-MODEL.md`
> Design session (S-INTENT-01) required before any coding.

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| IN-01 | Intent catalog — 9 named Intents with slug, name, description, execution_pattern, mcp_path, gap_flag, default_format | ❌ Missing | S-INTENT-01 |
| IN-02 | Intent picker in Work Order creation — replaces current task type tiles; user selects from 9 Intents; scales without code changes as new Intents added | ❌ Missing | S-WO-01 |
| IN-03 | Intent canned configurations — pre-built Work Order starting points per Intent; sharable; public or tenant-private | ❌ Missing | S-INTENT-01 |
| IN-04 | Intent agent assignments — optional; which agents are authorized to perform each Intent; absence → generic LLM + gap flag | ❌ Missing | S-INTENT-01 |
| IN-05 | Intent capability assignments — optional; which Capabilities serve each Intent well; absence → generic LLM | ❌ Missing | S-INTENT-01 |
| IN-06 | Intent profile view — admin-facing profile page per Intent (Profile, Capabilities, Training, Playbook, History tabs) | ❌ Missing | S-INTENT-01 |
| IN-07 | Gap flagging — when Michelle finds no Agent or Capability for an Intent, set gap_flag, use generic LLM, surface signal to product intelligence | ❌ Missing | S-INTENT-01 |
| IN-08 | Monitor & Alert intent — recurring/trigger-based execution pattern; separate architecture from one-shot Intents; scheduler + notification layer | ❌ Missing | S-MONITOR-01 |

---

## FORMAT — FM
> Full model: `docs/FORMAT-MODEL.md`
> Design session (S-FORMAT-01) required before any coding.

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| FM-01 | Format catalog — registry of all Formats; each entry: slug, name, tier, intent, output_file_type, data_variables, sections, charts, badge, mcp_tool, preview_url | ❌ Missing | S-FORMAT-01 |
| FM-02 | NIGP Dashboard registered as proprietary Format — `nigp-dashboard` / `analysis-report` intent / locked sections / Mixed badge / priced | ❌ Missing | S-FORMAT-01 |
| FM-03 | Format picker in Work Order creation — filtered by selected Intent; shows tier badge; preview thumbnail | ❌ Missing | S-WO-01 |
| FM-04 | Format agent assignments — optional; which agents are authorized to produce each Format; absence → generic LLM + gap flag | ❌ Missing | S-FORMAT-01 |
| FM-05 | Format capability assignments — optional; which Capabilities are needed to produce each Format | ❌ Missing | S-FORMAT-01 |
| FM-06 | Format profile view — admin-facing profile page per Format (Profile, Schema, Capabilities, Templates, History tabs) | ❌ Missing | S-FORMAT-01 |
| FM-07 | Standard Format catalog — register DeepBench Standard formats: structured-report, executive-brief, research-summary, observation-log, summary-card | ❌ Missing | S-FORMAT-01 |

---

## SKILLS & CAPABILITIES — SK
> Full model: `docs/SKILL-PROFILE-MODEL.md` — Traits, Capability assembly, Technical Services invocation, domain-agnostic principle, sprint template.
> S-SK-01 complete (a447e49, 2026-06-18). All 12 Manual QA items PASS.

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| SK-07 | AiBadge on Capabilities card — shows all technical_services patterns per Skill when Work Side is wired | ❌ Missing | S-future (Work Side execution sprint) |
| SK-08 | CRUD UI for Skill Profile creation and editing | ❌ Missing | S-future (design required) |
| SK-09 | Capability builder UI — assemble Skill Profiles into a new Capability, set Level per Skill | ❌ Missing | S-future (design required) |
| SK-10 | Agent Capability assignment UI — assign/unassign Capabilities on Personnel File | ❌ Missing | S-future (design required) |
| SK-11 | Capability hover card on Personnel File — hovering the capability name/title shows a summary popup of all the Capability's traits (name, description, Skill count, execution type). Mirrors SkillHoverCard pattern. Design session required before coding. | ❌ Missing | S-future (design required) |
| SK-13 | JD → Capability Auto-Generation — upload a job description, extract competencies mapped to Skill types, match to existing Skill Profiles via RAG, propose new Skill Profiles for unmatched competencies, assemble into a Capability, HITL approval before creation. Extends PE-10 upload pipeline with capability records as output target instead of knowledge_entries. Design session required. | ❌ Missing | S-future (design required) |
| SK-14 | SkillHoverCard z-index fix — hover popup renders behind sibling controls on Personnel File Profile tab. CSS z-index elevation required on the hover card container. Small patch — can go into any upcoming coding session. | ❌ Missing | S-next-patch |
| SK-15 | Identity Skill for Project Manager (SP-PM-06) — orchestrator philosophy, autonomy dial, skeptic level. Deferred — design session required before coding. | ❌ Missing | S-future (design required) |
| SK-16 | Seed `technical_services[]` on PM Skill Profiles — SP-PM-04 (planning-behavior) needs `["reflect"]`; SP-PM-01 (work-order-decomposition) needs `["intelligent-synthesis"]`. Currently all PM Skill Profiles have `technical_services: []`. Required before Prompt Builder can know to run REFLECT and synthesis for Michelle. DB seed only — no src/ changes. | ❌ Missing | S-PM-02 |
| SK-17 | Add `llm_model`, `llm_provider`, `max_tokens`, `api_key_source` columns to `skill_profiles` Supabase table + seed values for all 5 PM Skill Profiles (SP-PM-01 through SP-PM-05). Required before Prompt Container can read LLM config from Skill Profiles. Schema migration required — do before or during S-PM-02. | ❌ Missing | S-PM-02 |
| SK-18 | Seed `traits.schema` on SP-PM-03 (execution-plan Format Skill) — the JSON schema (planSummary, agentId, agentReason, steps[], questions[]) currently hardcoded in `api/plan.js` as a tool definition must be stored in `skill_profiles.traits.schema`. Required before Prompt Container can pass format_contract.schema to the Builder/Sender. DB seed only — no src/ changes. | ❌ Missing | S-PM-02 |
| SK-19 | Refactor `api/brief.js` legacy path — remove hardcoded McKinsey memo system prompt from the no-agent_id path; route through Prompt Container + Builder instead. Currently bypasses all Skill Profile assembly for legacy calls. | ❌ Missing | S-future (after S-PM-04) |
| SK-20 | Refactor `api/plan.js` — replace hardcoded system prompt and hardcoded tool schema with Prompt Container + Builder; tool schema moves to SP-PM-03 traits.schema (SK-18). This is when the Work Order screen starts using the new Prompt Service. Depends on AA-03 + AA-43 complete. | ❌ Missing | S-PM-05 |
| SK-21 | Wire Pat (IR-07) bypass as a Skill Profile declaration — currently hardcoded in `api/brief.js` as `if (agent_id === "pat")`. Pat's no-RAG, no-config behavior should be declared via Identity + Knowledge Skill Profile constraints (`isIntern: true` mapped to Skill Profile level), not as a named code exception. Requires S-INFRA-01 design session to map isIntern to Skill types. | ❌ Missing | S-INFRA-01 |

---

## SERVICE — SV
> A Service is a packaged Intent + Format combination — named, priced, MCP-exposed.
> Design session (S-SERVICE-01) required before any coding.

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| SV-01 | Service catalog — registry of named Services; each entry: slug, name, intent_slug, format_slug, mcp_tool, availability, exclusivity, pricing, level | ❌ Missing | S-SERVICE-01 |
| SV-02 | Service profile view — name, description, Intent + Format components, agent roster, pricing, performance metrics, history | ❌ Missing | S-SERVICE-01 |
| SV-03 | MCP service exposure — each Service exposed as an MCP tool at `deepbench/{intent}/{format}` path; resources for discovery | ❌ Missing | S-MCP-01 |
| SV-04 | Service marketplace listing — browse, preview, purchase access to proprietary Services | ❌ Missing | S-future (Phase 4) |

---

## LANDING — LA

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| LA-01 | Landing screen | ❌ Missing | DECISION NEEDED (/ = landing or dashboard?) |

---


## Full Session Order

Moved to `docs/SESSIONS.md` (2026-07-01 cleanup — this table duplicated session history already tracked there). See SESSIONS.md "Full Session Order (archived from FEATURES.md)" section.
