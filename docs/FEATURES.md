# DeepBench v5.2 — Feature Inventory

> Status: ✅ Done | 🔶 Partial | ❌ Missing | — N/A
> Session: DONE = built | [ID] = assigned | S-future = not yet scheduled
>
> Last updated: 2026-06-18 | Session: S-SK-01-design cont. — Kickoff doc written for S-SK-01. SkillHoverCard added to SK-06 scope: hover over a Skill row in the Capabilities card shows all Traits, type-specific jsonb fields, and guardrails in a popup. Kickoff doc: docs/kickoffs/v5.2.11-SK-01-skills-capabilities-schema.md.
>
> **AI Services catalog** (14 services, 10 patterns, AI Audit sections, MCP surfaces, table schema) → `docs/AI-SERVICES.md`
> **Deliverable composition registry** (AI Services × Deliverables, sharing patterns, feedback loops, build order) → `docs/CAPABILITIES.md`

---

## Feature ID Format

`[AREA]-[NUMBER]`
Areas: `SH`=Shell, `DB`=Dashboard, `AW`=Assign Work, `TI`=Task Instructions, `AZ`=Analyzer, `FT`=Fetch, `RO`=Roster, `PE`=Personnel File, `TC`=Teach, `TT`=Test Team, `AI`=AI Infrastructure, `AG`=Agent Identity, `LA`=Landing, `DL`=Deliverables, `WO`=Work Order, `IN`=Intent, `FM`=Format, `SV`=Service, `SK`=Skills & Capabilities

---

## SHELL & INFRASTRUCTURE — SH

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| SH-01 | Treasury design system (tokens.js) | ✅ Done | DONE |
| SH-02 | Multi-tenancy stubs | ✅ Done | DONE |
| SH-03 | useAgents() hook | ✅ Done | DONE |
| SH-04 | React Router — all routes | ✅ Done | DONE |
| SH-05 | App shell: header, Work/Bench tabs | ✅ Done | DONE |
| SH-10 | About DeepBench panel — 7-tab portfolio + product info | 🔶 Partial (design done) | S-ABOUT-01 |
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
| DB-02 | Stats strip | ✅ Done | DONE |
| DB-03 | Show more drawer | ✅ Done | DONE |
| DB-04 | Recently completed section | 🔶 Partial (mock only) | — |
| DB-05 | "Awaiting your input" draft state | ✅ Done | DONE |
| DB-06 | Assign New Work button → "Create a new Task" | ✅ Done | S15a |
| DB-07 | Chat panel — topic pills | ✅ Done | DONE |
| DB-08 | Chat panel — direct agent pills | ✅ Done | DONE |
| DB-09 | Chat panel — AI routing / switchboard | ✅ Done | DONE |
| DB-10 | Chat panel — knowledge tier indicator | ✅ Done | DONE |
| DB-11 | Chat panel — answer provenance chips | ✅ Done | DONE |
| DB-12 | Chat panel — general knowledge disclaimer | ✅ Done | DONE |
| DB-13 | Chat panel — "Save as Assignment" affordance | ✅ Done | DONE |
| DB-14 | Chat panel — real RAG + AI call | 🔶 Partial | — |
| DB-15 | NIGP Demo task pre-loaded | ✅ Done | DONE |
| DB-16 | Completed task cards clickable → Task Instructions | ✅ Done | S08 |
| DB-17 | Task title editable inline + Michelle suggested | ✅ Done | S14 |
| DB-18 | Auto-select best agent via AI | ❌ Missing | S13 (deferred) |
| DB-19 | Module naming — Work/Bench dashboards | ✅ Done | S15a |
| DB-20 | Nav tab styling — brass borders, active states | ✅ Done | S15a |
| DB-21 | AIDiamond.jsx — animated heartbeat AI indicator | ✅ Done | S15a |
| DB-22 | "Create a New Task" button on Work dashboard — add AiBadge showing all patterns used across the full Create New Task flow: RAG · Embeddings · Tool Use · Structured Output · Streaming · Prompt Chaining · Reflection | ✅ Done | S-AI-BADGE-01 (a6d00c9) |

**DB-17 Notes:** Michelle generates concise title + step names on first draft. `title_edited` flag — user owns title after first edit, never overwritten. `api/title.js`: direct Claude Haiku call; Supabase agent_configs wired in S-BENCH-01.

---

## ASSIGN WORK — AW

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| AW-01 | Task type picker tiles | ✅ Done | DONE |
| AW-02 | Free-form goal input | ✅ Done | DONE |
| AW-03 | Two-panel layout | ✅ Done | DONE |
| AW-04 | Planning agent — clarifying questions | ✅ Done | DONE |
| AW-05 | Planning agent — step plan generation | ✅ Done | DONE |
| AW-06 | Agent suggestion with reason chips + brass glow | ✅ Done | DONE |
| AW-07 | Agent swap → plan regeneration | 🔶 Partial | S12 (deferred) |
| AW-08 | Change log / plan history collapsible | ✅ Done | DONE |
| AW-09 | Save draft → "Awaiting your input" | ✅ Done | DONE |
| AW-10 | Persistent save state indicator | ✅ Done | DONE |
| AW-11 | "Approve Plan & Launch" → Supabase | 🔶 Partial | Blocked by SH-06 |
| AW-12 | Pre-populate from chat (from=chat param) | 🔶 Partial | — |
| AW-13 | Chat transcript in task | ❌ Missing | S-future |
| AW-15 | Pre-populated goal appends not replaces | 🔶 Partial | post-core |
| AW-16 | Update Plan wires answers + regenerates | ✅ Done | S09 |
| AW-17 | Michelle assigns steps to multiple agents | ❌ Missing | S12 (deferred) |
| AW-18 | Assign Work terminology standardized (Tasks/Instructions) | ✅ Done | S15b-A |
| AW-19 | Top nav cleanup + AI icon additions | ✅ Done | S15b-A |
| AW-20 | CTA renamed to "Approve Steps & Launch" | ✅ Done | S15b-A |
| AW-21 | Michelle Manning humanized as planning agent PP-01 | ✅ Done | S15b-B |
| AW-22 | Per-step agent attribution on step cards | ✅ Done | S15b-B |
| AW-23 | Read-only hover agent info card | ✅ Done | S15b-B |

---

## TASK INSTRUCTIONS — TI

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| TI-01 | Step timeline (agent/HITL/sub-agent types + color) | ✅ Done | DONE |
| TI-02 | HITL step opens relevant screen | 🔶 Partial | S-future |
| TI-03 | Step history from Supabase steps JSONB | ❌ Missing | Blocked by SH-06 |
| TI-04 | Inline step text editing | ✅ Done | Bonus |
| TI-05 | Re-run All button | ✅ Done | Bonus |
| TI-06 | Mark Complete button | ✅ Done | Bonus |
| TI-07 | Chat transcript in task | ❌ Missing | S-future |
| TI-08 | View Brent sub-agent CTA | ✅ Done | Bonus |
| TI-09 | mergeSteps.js utility | ✅ Done | S10a |
| TI-10 | Step merge visual — type-based card color | ✅ Done | S10a-patch |
| TI-11 | Threaded archive approval flow | ✅ Done | S10a-patch2 |
| TI-12 | Prominent agent attribution on step cards | ✅ Done | S10a |
| TI-13 | Step color preserved through regeneration (bug fix) | ✅ Done | S10a-patch |
| TI-14 | Start button — triggers step execution | ❌ Missing | S11 (deferred) |
| TI-15 | Per-step execution running state | ❌ Missing | S11 (deferred) |
| TI-16 | Step output storage to Supabase JSONB | ❌ Missing | S11 (deferred, Q5 needed) |
| TI-17 | Pat execution via Railway | ❌ Missing | S11b (deferred) |
| TI-18 | HITL step gate — full runtime execution contract: (1) execution pauses when a HITL step is reached, (2) signal emitted to notify human (UI state change + future notification), (3) human provides input via the step's comment/approval interface, (4) input injected into the next agent step's context, (5) execution resumes. Activates PAT-10 HITL in AI Audit By Pattern — triggers "Gates Triggered" counter + records human response time. Design session required before coding — needs: pause signal architecture, notification mechanism, resume-with-context handoff spec. | ❌ Missing | S-future (design required) |
| TI-19 | Header renamed to "Steps" | ✅ Done | S15c |
| TI-20 | Nav buttons removed from Task Instructions | ✅ Done | S15c |
| TI-21 | CTA renamed "Update Steps →" | ✅ Done | S15c |
| TI-22 | Update Steps button repositioned below HITL comment textarea | ✅ Done | S15c |

---

## NIGP ANALYZER — AZ

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| AZ-01 | CSV upload → PapaParse + column detection | ✅ Done | DONE |
| AZ-02 | Column mapping screen | ✅ Done | DONE |
| AZ-03 | Column mapping saved to task record | ❌ Missing | Blocked by SH-06 |
| AZ-04 | CSV upload to Supabase Storage | ❌ Missing | S-future (SH-07) |
| AZ-05 | CSV load from Supabase Storage on return | ❌ Missing | S-future (SH-07) |
| AZ-06 | Tab: Dashboard / Overview | ✅ Done | DONE |
| AZ-07 | Tab: Categories | ✅ Done | DONE |
| AZ-08 | Tab: Treemap | ✅ Done | DONE |
| AZ-09 | Tab: Vendors | ✅ Done | DONE |
| AZ-10 | Tab: Departments | ✅ Done | DONE |
| AZ-11 | Tab: Timeline | ✅ Done | DONE |
| AZ-12 | Tab: Concerns / Flags | ✅ Done | DONE |
| AZ-13 | Tab: Local Spend | ✅ Done | DONE |
| AZ-14 | Tab: Vendor Diversity / HHI | ✅ Done | DONE |
| AZ-15 | Tab: AI Review (3-stage, RAG-augmented) | 🔶 Partial | — |
| AZ-16 | Tab: Cleanup | ✅ Done | DONE |
| AZ-17 | Tab: Full Table | ✅ Done | DONE |
| AZ-18 | Demo task pre-loaded: Austin FY2025 | 🔶 Partial | Blocked by SH-07 |

---

## FETCH — FT

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| FT-01 | Fetch config screen | ✅ Done | DONE |
| FT-02 | Run Fetch Agent → SSE to Railway | ✅ Done | DONE |
| FT-03 | Agent running: event log, screenshot, stop | ✅ Done | DONE |
| FT-04 | Post-fetch: download CSV + Map Fields | 🔶 Partial | — |
| FT-05 | Fetched CSV to Supabase Storage | ❌ Missing | S-future (SH-07) |
| FT-06 | Pat selectable as fetch agent | 🔶 Partial | S11b (deferred) |

---

## ROSTER / BENCH — RO

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| RO-01 | Roster screen — all 7 agents including Pat | ✅ Done | DONE |
| RO-02 | Agent cards with workload indicators | ✅ Done | DONE |
| RO-03 | "Add a Player" → /bench/new | ✅ Done | DONE |
| RO-04 | Illustrated SVG avatars (AgentAvatar in SharedUI), AVATAR_CFG in agents.js, + Add a Player in stats strip. DeepBench headline preserved. | ✅ Done | S-MIGRATE-01a (621eb31) |
| RO-05 | Vacancy card as primary Add entry point (click → /bench/new) | ✅ Done | DONE |
| RO-06 | Avatar consistency sweep — add michelle to AVATAR_CFG; replace hand-rolled letter circles in DashboardScreen (task cards + chat messages) and StepList with AgentAvatar | ✅ Done | S-AVATAR-01 (d9d43c2) |
| RO-07 | Bench UI polish — stats strip Corners + border, AiBadge on Add Training, Add a Player ghost button | ✅ Done | S-BENCH-UX-01 (812ed59) |
| RO-08 | AiBadge on brass/gold backgrounds — badge stays inside button; navy-tinted chip on brass bg, white-tinted chip on moss bg | ✅ Done | S-BENCH-UX-02 (8717106) |

**WK-XX — Test My Team (future, not yet scheduled):**
Batch-run all bench agents against a sample dataset to compare output quality side-by-side. Entry point: button on Roster screen header. Scope: Work session chain. Do NOT implement in S-MIGRATE-01 or S-MIGRATE-02.

---

## PERSONNEL FILE — PE

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| PE-01 | Profile tab | ✅ Done | DONE |
| PE-02 | Resume tab | ✅ Done | DONE |
| PE-03 | Training tab live wiring — load from Supabase, toggle, delete, NIGP card layout (date col + green node + right-side actions) | ✅ Done | S-MIGRATE-02 (02ff560) |
| PE-04 | Playbook tab live wiring (output_format CRUD + guardrails — ResumeTab pattern) | 🔶 Partial (static mock) | S-MIGRATE-05 |
| PE-13 | Personnel file polish — remove "The Bench" back button from header, add ACTIVE/TRAINEE chips to sidebar, fix T.paper token bug in guardrail textareas | ✅ Done | S-BENCH-UX-01 (812ed59) |
| PE-12 | Training tab — Test Agent console (inline sub-view: config selectors, scenario picker, live brief + RAG call, system prompt inspector, RAG chunks panel) | ❌ Missing | S-MIGRATE-06 |
| PE-05 | Workflow tab (stub) | ✅ Done | DONE |
| PE-06 | Projects tab — live wiring to `deliverables` table; shows agent's completed deliverables: count, type, task name, date; stub until DL-04 ships | 🔶 Partial (stub) | S-DELIVER-04 |
| PE-07 | Left-sidebar nav (OVERVIEW + CONFIGURE groups, no OPERATE); replaces horizontal tab bar | ✅ Done | S-MIGRATE-01b (8660e42) |
| PE-08 | Profile tab 2-col layout — ID Badge + Compensation left; Readiness + Intel Config + Quick Stats right | ✅ Done | S-MIGRATE-01b (8660e42) |
| PE-09 | Page header breadcrumb from NAV_GROUPS; subtitle uses -level agent (not -level analyst) | ✅ Done | S-MIGRATE-01b (8660e42) |
| PE-10 | Training tab — Add Courses inline sub-view (upload → extract → ingest pipeline, embedded in Training tab, no page navigation) | ✅ Done | S-MIGRATE-03 (299f1c0) + patch (686007e) |
| PE-11 | Training tab — Edit Course inline sub-view (edit title, category, jurisdiction, field notes, triggers, priority — no re-vectorization; EDIT+DELETE only for trainable+active entries) | ✅ Done | S-MIGRATE-04 (732bf3c) |
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
| TC-01 | Upload → extract → ingest → RAG | ✅ Done | DONE |
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
| TT-01 | Multi-agent query runner — runs two agents on the same query in parallel (PAT-14 Parallelization, 🔶 partial implementation) | ✅ Done | DONE |
| TT-02 | Prompt comparison / diff panel — side-by-side output + diff metric dashboard | ✅ Done | DONE |
| TT-03 | Multi-Agent Debate upgrade — after parallel run, feed each agent the other's output for a critique pass; add synthesis agent that reads both critiques and produces a reconciled final answer (PAT-16 Multi-Agent Debate). Extends TT-01/02 foundation. Design session required. | ❌ Missing | S-future (design required) |

---

## AI INFRASTRUCTURE — AI

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| AI-01 | AiBadge on every AI-touched element app-wide — tooltip label on every instance | ✅ Done | S-AI01b + patch + patch2 (e975715) |
| AI-02 | Universal AI status dot | ✅ Done | DONE |
| AI-03 | AI Activity Panel wiring (3 screens) | 🔶 Partial | S-AI-01 |
| AI-04 | Intelligent agent routing | ✅ Done | DONE |
| AI-05 | Planning agent — structured Claude tool use | ✅ Done | DONE |
| AI-06 | Semantic similarity scoring in knowledge tier | 🔶 Partial | S-future |
| AI-07 | Summarization/synthesis in AI Activity Panel | 🔶 Partial | S-future |
| AI-08 | Brent ReAct agent (Railway, Playwright) | ✅ Done | DONE |
| AI-09 | RAG pipeline (ingest → pgvector → query) | ✅ Done | DONE |
| AI-10 | AI Activity Panel — header entry point, grouped by AI type | ✅ Done | S16b |
| AI-11 | Per-step AI execution log → Supabase agent_run_log | ❌ Missing | S11 |
| AI-12 | Full AI Audit Screen (/work/[taskId]/audit) | ❌ Missing | S-AI-01 Part B |
| AI-13 | AI Audit panel — rename, header strip (Total Calls, Total Cost, Active Types, Models in Use), remove Clear Log | ✅ Done | S16a |
| AI-14 | AI Audit — 4 sections: By Activity Type (9 Phase 1 + 4 Future Tracking), By LLM, By Agent (dynamic) | ✅ Done | S16a |
| AI-15 | Architect Checklist tab in AI Audit — 8-item checklist | ✅ Done | DONE |
| AI-16 | AI Audit persistence — write every AI call to Supabase ai_activity_log; hydrate on mount for lifetime totals | ✅ Done | S16b |
| AI-17 | Auto-Training service — extract synthesis+embed+write pattern from web-memory.js POST into standalone `/api/auto-train` endpoint, callable by any agent/capability | ❌ Missing | S-INFRA-02 |
| AI-18 | Capability-agent attribution — wire agentId to planning (Michelle), extraction (Susan), reinforcement (Susan); fix "knowledge-reinforcement" type key bug | ✅ Done | S-AI-ATTR-01 (4d568bd) |
| AI-19 | Latency capture for extraction + reinforcement call sites — wrap fetch() with Date.now() timing so avg latency shows in AI Audit (currently "—" for Susan + OpenAI rows) | ❌ Missing | S-future |
| AI-20 | AI Audit cost formatter — replace `<$0.01` floor with 4-decimal display so sub-penny costs show visible movement (e.g. `$0.0023`); one-liner change to `fmt$` in AIActivityPanel.jsx | ❌ Missing | S-future |
| AI-21 | AI Audit output token tracking — extend `logAICall()` to accept `outputTokens` param; include output cost in formula; write to existing `output_tokens` column in ai_activity_log; all `logAICall()` call sites updated | ❌ Missing | S-future |
| AI-22 | Full lineage columns on `ai_activity_log` — add `service_slug`, `service_version`, `deliverable_id`, `step_id`, `level` so every AI call is traceable from Task → Step → Agent → Service → Pattern → Deliverable → Cost. Also adds `success` boolean and `error_type` for Service Health (AI-27). Do alongside S-INFRA-01. All `logAICall()` call sites updated. | ❌ Missing | S-INFRA-01 |
| AI-23 | AI Audit rebuilt on AI Services model — five sections replace current "By Activity Type": (1) By Service — one row per AI/Mixed Service, columns: Service Name · Type · Calls · Est. Cost · Avg Latency; (2) By Pattern — one row per AI Pattern rolled up from Services declaring it; (3) Deterministic — execution count + latency for deterministic Services, no LLM cost; (4) By LLM — keep existing; (5) By Agent — keep existing. Existing ai_type strings remapped to service_slug values. Requires `ai_services` table (AI-25). Design session: S-AI-AUDIT-REDESIGN. | ✅ Done | S-AI-AUDIT-REDESIGN (da40458 + f0ecd09) |
| AI-24 | Routing feedback loop — deliverable approval and change-request rates produce a per-agent-capability preference score; routing uses Capability match + Level + approval history as a third factor after Seniority. Design session required before building. | ❌ Missing | S-future (after S-DELIVER-04) |
| AI-25 | `ai_services` table — Supabase catalog of all 14 named Services: slug, name, service_type (ai/deterministic/mixed), description, patterns jsonb (array of pattern slugs), properties jsonb (llm_provider, llm_model, token_budget, execution_mode, rag_match_count, byok_eligible), in_nigp, in_deepbench, current_route, target_route, version, created_at. Seed with all 14 services (SVC-01 through SVC-14) on creation. | ❌ Missing | S-INFRA-01 |
| AI-26 | `ai_patterns` table — Supabase catalog of 20 industry-standard AI Patterns: slug, name, description, in_deepbench boolean (true = active, false = roadmap). Seed with PAT-01 through PAT-20 on creation. PAT-01–11 active or partial; PAT-12–20 roadmap. Referenced by `ai_services.patterns` jsonb array. | ❌ Missing | S-INFRA-01 |
| AI-30 | AI Audit By Pattern section: expand client-side pattern catalog from 10 to 20 entries (PAT-01–PAT-20); update Patterns Roadmap section (Now/Next/Later) with PAT-12 through PAT-20; update header stat to reflect new totals. HITL row (PAT-10) uses "Gates Triggered" + "Avg Response Time" columns instead of LLM Calls / Cost / Latency — source is task execution log not ai_activity_log; show as 🔶 Partial until TI-18 ships. PAT-14 Parallelization shows as 🔶 Partial (TT-01/02). One file: AIActivityPanel.jsx. | ✅ Done | S-AI-BADGE-04 (5c2b8d2) |
| AI-32 | By Pattern section — "Not yet active" collapse card: group all inactive patterns (those showing "Not yet active" chip) into a collapsed card identical to "Not yet called · N services" in By Service section. Collapsed by default. Click to expand and see all inactive pattern rows. HITL (hitlSpecial) and Parallelization (partial) stay as individual rows. File: AIActivityPanel.jsx. | ✅ Done | S-AI-AUDIT-UX-01 (c919af4) |
| AI-33 | Platform Roadmap redesign — replace current flat Services + AI Patterns lists with 2-section × 2-column layout: Next and Later only (no Now — all Now items already coded). Each section: AI Patterns (left) + DeepBench Services (right). Data driven from PATTERN_CATALOG and SERVICE_CATALOG roadmap fields. File: AIActivityPanel.jsx. | ✅ Done | S-AI-AUDIT-UX-01 (c919af4) |
| AI-27 | Service Health tracking — `success` boolean + `error_type` text column on `ai_activity_log`; enables per-Service failure rate, uptime, and p50/p95 latency in AI Audit. Part of AI-22 lineage work or separate extension. | ❌ Missing | S-INFRA-01 |
| AI-28 | AiBadge label sweep — update all 21 existing AiBadge tooltip labels app-wide to AI Pattern names (full pattern list per responsible service); remove FlagCard deterministic badge (SharedUI); add `built` prop to AiBadge for greyed/dashed visual when pattern not yet implemented. Constants centralized in `src/aiPatterns.js`. Three coding sessions: S-AI-BADGE-01/02/03. | ✅ Done | S-AI-BADGE-01 ✅ (a6d00c9) — S-AI-BADGE-02 ✅ (b03d04e) — S-AI-BADGE-03 ✅ (8d63915) |
| AI-29 | Step card conditional pattern badge — derive execution patterns from assigned agent code (Approach A: agent→AGENT_PATTERNS map) with step-name keyword fallback (Approach B); HITL steps = no badge; greyed dashed badge for unbuilt patterns (Pat IR-07, Susan TR-08, multi-agent PAT-11); no badge on deterministic steps. | ✅ Done | S-AI-BADGE-02 (b03d04e) |
| AI-31 | Task Instructions AI pulse buttons — "Re-run All" and "Update Steps →" buttons each get AI activity signal + pattern label. Byline badge fix in AssignWorkScreen also shipped. Functionally complete (195aeda + 8bd3f23) but VISUAL TREATMENT WRONG: currently uses raw `<span>` dot + AiBadge chip, which is not in the style guide. Must be replaced with `<AIDiamond>` + pattern tooltip pattern (spec TBD in S-AI-AUDIT-UX-01). Files: TaskInstructionsScreen.jsx, StepList.jsx, AssignWorkScreen.jsx. | 🔶 Partial (visual redesign needed — see AI-31 notes) | S-AI-BADGE-05/05p ✅ functional · S-AI-AUDIT-UX-01 visual redesign |
| AI-34 | Step card AI pattern display — each step card in Task Instructions and Assign Work shows which AI patterns are used for that step, plus an `<AIDiamond>` AI pulse icon. Source: AGENT_PATTERNS map (same as AI-29). Visual treatment: AIDiamond + pattern label, exact placement TBD in design session. Do not use AiBadge chip for this. File: StepList.jsx. | ❌ Missing | S-AI-AUDIT-UX-01 (design session required) |
| AI-35 | Unified AI Pattern Registry — single source of truth for all pattern tracking across the platform. Replaces the current split between `PATTERN_CATALOG` (useAIActivity.js), `AI_PAT` constants + `AGENT_PATTERNS` map (aiPatterns.js), and scattered AiBadge label strings. The registry owns: (1) **Active status** — which patterns are actually firing in DeepBench code today vs roadmap-only, so AiBadge labels and the Platform Roadmap never contradict each other; (2) **Label/feature associations** — which UI elements (buttons, cards, step types) declare each pattern, so AiBadge labels derive from the registry instead of being hardcoded per component; (3) **AI Audit display** — By Pattern row status (active/partial/roadmap) and roadmap tier driven from one source; (4) **Metric logging** — pattern-level calls, cost, and latency logged directly to `ai_activity_log` via pattern slug, not only rolled up from service calls; (5) **Full graph** — each pattern knows which Services declare it, which Deliverables those Services produce, and which Capabilities invoke those Deliverables. Resolves the AI-28/PATTERN_CATALOG contradiction discovered 2026-06-15: AiBadge labels were set from SVC design intent (Reflection listed on Playbook badge) but PATTERN_CATALOG correctly marks Reflection inactive — a split source caused the inconsistency. Design session required before coding — needs: registry schema, migration path from aiPatterns.js + PATTERN_CATALOG, AiBadge label derivation mechanism, metric log schema. | ❌ Missing | S-PAT-REGISTRY-01 (design required) |
| AI-36 | Pattern type classification — every pattern in the registry carries a `patternType` field: `structural` (scaffolding around Claude — changes what Claude sees or when it is called, not how it reasons: RAG, Streaming, Structured Output, Embeddings, Browser Automation) or `reasoning` (changes how Claude thinks — same prompt produces meaningfully different output: ReAct, Tool Use, Prompt Chaining, Reflection, Multi-Agent Debate, Chain-of-Verification). Design requirement: (1) AI Audit By Pattern section visually distinguishes the two types — separate groupings or a type badge per row; (2) counts, cost, and availability (active/partial/roadmap) tracked and displayed per type group; (3) AiBadge labels and tooltips app-wide identify pattern type so users can see whether an element is using structural or reasoning architecture; (4) Platform Roadmap section groups roadmap patterns by type. Registry field: `patternType: 'structural' | 'reasoning'`. All 20 patterns in PATTERN_CATALOG must be classified before S-PAT-REGISTRY-01 coding begins. Depends on AI-35. Classification locked 2026-06-16: Structural (9) = RAG, Streaming, Structured Output, Embeddings, Browser Automation, Guardrails, Parallelization, HyDE, Adaptive RAG. Reasoning (11) = ReAct, Tool Use, Prompt Chaining, Reflection, HITL, Agent Orchestration, Few-Shot Prompting, LLM-as-Judge, Multi-Agent Debate, Chain-of-Verification, Episodic Memory. | ✅ Done | S-AI-PATTERN-TYPE-01 (22c9d2e) + patch (26ff072) |

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
| AG-02 | Michelle system prompt in Supabase agent_configs | ✅ Done | S-BENCH-01 (ad31191) |
| AG-03 | Michelle trainable via Teach + RAG | ✅ Done | S-BENCH-01 (ad31191) |
| AG-04 | Michelle UI presence on planning screens | 🔶 Partial | S10b ✅ S10p ✅ S-BENCH-01 full |
| AG-04a | Michelle avatar — silhouette placeholder → replaced by AgentAvatar (RO-06) | ✅ Done | S10p → S-AVATAR-01 |
| AG-04b | Update Plan thinking state — three-layer | ✅ Done | S10p |
| AG-05 | api/plan.js reads Michelle prompt from Supabase | ❌ Missing | S-BENCH-01 LOCKED |
| AG-06 | Michelle surgical replanning directive | ❌ Missing | S-BENCH-01 LOCKED |

**S-BENCH-01b Susan Smith — Full Spec (needs design session):**
- Code: `TR-08` | Role: Trainer Agent | `isTrainer: true`
- Roster position: after Pat Smiley (IR-07)
- Full spec requires dedicated design session before S-BENCH-01b

| AG-07 | Susan Smith static identity in agents.js | ✅ Done | DONE |
| AG-08 | Susan Smith system prompt in Supabase agent_configs | ✅ Done | S-BENCH-01 (ad31191) |
| AG-09 | Susan Smith trainable via Teach + RAG | ✅ Done | S-BENCH-01 (ad31191) |
| AG-10 | Susan Smith UI presence as Trainer in Training tab | ❌ Missing | S-BENCH-01b |
| AG-11 | api/train.js reads Susan Smith prompt from Supabase | ❌ Missing | S-BENCH-01b LOCKED |
| AG-12 | Susan Smith can be assigned to train other bench agents | ❌ Missing | S-BENCH-01b LOCKED |

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
| AA-03 | Prompt Container API (`api/prompt/container.js`) — reads capability_slug + agent_id, resolves Prompt Specification: which sections are included (from Skill Profiles assigned to Capability), section order, LLM config (provider/model/max_tokens from skill_profiles), token budget. No fetching, no LLM calls. Returns structured Specification object. Degrades to L1 generic if no agent or capability passed. | ❌ Missing | S-PM-02 |
| AA-43 | Prompt Builder API (`api/prompt/builder.js`) — takes Prompt Specification, fetches content per section source type (credentials / RAG / skill_profile_traits / skill_profile_guardrails), renders into sectioned prompt string, optimizes against token budget (truncates Knowledge first, never truncates Intent/Format/Guardrails), optional REFLECT step. Returns assembled system_prompt + sections object + debug. MCP stop point — external callers receive prompt and send to their own LLM. | ❌ Missing | S-PM-03 |
| AA-44 | Prompt Sender API (`api/prompt/sender.js`) — takes assembled prompt + LLM config, calls LLM via adapter layer, parses response against Format Skill output contract (retry once on schema mismatch), writes Deliverable to deliverables table with full lineage, logs to ai_activity_log via logAICall(), routes parsed response to caller. Handles streaming when Capability declares PAT-03. | ❌ Missing | S-PM-04 |
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
| WO-01 | Work Order UI label rename — all user-visible "Task" → "Work Order" labels across DashboardScreen, AssignWorkScreen, TaskInstructionsScreen, BenchNewScreen, AboutPanel. Backend rename (DB table, routes, variables) deferred to future session. | ✅ Done | S-RENAME-01 (0348066) |
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
| SK-01 | `skill_types` table + 5 type seeds (identity, behavior, knowledge, intent, format) | ✅ Done | S-SK-01 (a447e49) |
| SK-02 | `skill_profiles` table + SP-01 Data Analysis (type: intent) + SP-02 Analysis Report (type: format) seeds | ✅ Done | S-SK-01 (a447e49) |
| SK-03 | `capabilities` table + CAP-01 Data Analyst seed | ✅ Done | S-SK-01 (a447e49) |
| SK-04 | `capability_skill_profiles` join table + seeds linking SP-01 + SP-02 to CAP-01 at L2/L1 | ✅ Done | S-SK-01 (a447e49) |
| SK-05 | `agent_capability_assignments` table + Bob (PR-04) assigned to CAP-01 | ✅ Done | S-SK-01 (a447e49) |
| SK-06 | Personnel File Profile tab — Capabilities read section (between profile card and compensation card); SkillHoverCard on each Skill row shows all Traits, type-specific jsonb fields, and guardrails; empty state for unassigned agents; all agents show container | ✅ Done | S-SK-01 (a447e49) |
| SK-07 | AiBadge on Capabilities card — shows all technical_services patterns per Skill when Work Side is wired | ❌ Missing | S-future (Work Side execution sprint) |
| SK-08 | CRUD UI for Skill Profile creation and editing | ❌ Missing | S-future (design required) |
| SK-09 | Capability builder UI — assemble Skill Profiles into a new Capability, set Level per Skill | ❌ Missing | S-future (design required) |
| SK-10 | Agent Capability assignment UI — assign/unassign Capabilities on Personnel File | ❌ Missing | S-future (design required) |
| SK-11 | Capability hover card on Personnel File — hovering the capability name/title shows a summary popup of all the Capability's traits (name, description, Skill count, execution type). Mirrors SkillHoverCard pattern. Design session required before coding. | ❌ Missing | S-future (design required) |
| SK-12 | Seed Project Manager Capability — 5 skill profiles (SP-PM-01 through SP-PM-05) + CAP-PM-01 + capability_skill_profiles links + Michelle (PP-01) assigned. Immediately visible on Michelle's Personnel File via existing SK-06 UI. No src/ changes required. | ✅ Done | S-PM-01 (9255c22) |
| SK-13 | JD → Capability Auto-Generation — upload a job description, extract competencies mapped to Skill types, match to existing Skill Profiles via RAG, propose new Skill Profiles for unmatched competencies, assemble into a Capability, HITL approval before creation. Extends PE-10 upload pipeline with capability records as output target instead of knowledge_entries. Design session required. | ❌ Missing | S-future (design required) |
| SK-14 | SkillHoverCard z-index fix — hover popup renders behind sibling controls on Personnel File Profile tab. CSS z-index elevation required on the hover card container. Small patch — can go into any upcoming coding session. | ❌ Missing | S-next-patch |
| SK-15 | Identity Skill for Project Manager (SP-PM-06) — orchestrator philosophy, autonomy dial, skeptic level. Deferred pending prompt-assembly design session where Personnel File Trait usage will be assessed in full context. | ❌ Missing | S-future (design required) |

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

### Work Side
| Session | Feature | Status |
|---------|---------|--------|
| S15a | UX Review — Dashboard | ✅ DONE |
| S15b-A | UX Review — Assign Work Part A | ✅ DONE |
| S15b-B | UX Review — Assign Work Part B | ✅ DONE |
| S15c | UX Review — Task Instructions | ✅ DONE |


| S16a | AI Audit UI — rename, restructure, By LLM + By Agent sections (AI-13, AI-14) | ✅ DONE |
| S16b | AI Audit persistence + live panel wiring — Supabase ai_call_log, lifetime metrics, AI-10 full wiring (AI-16, AI-10) | ← NEXT |

### Architecture + Migration (inserted before Bench side — decided 2026-06-08)
| Session | Feature | Status |
|---------|---------|--------|
| S-ARCH-01 | Write full ARCHITECTURE.md — four-layer model, capability spectrum, adapter layer, DB target state, session rules | ✅ DONE |
| S-MIGRATE-UX | UX/UI design — Roster + Personnel screens walk-through, design decisions locked | ✅ DONE |
| S-MIGRATE-01-design | Design session: produce coding kickoff doc for S-MIGRATE-01 | ✅ DONE |
| S-MIGRATE-01a | Illustrated SVG avatars + AgentAvatar in SharedUI + Roster visual port (RO-04) | ✅ DONE (621eb31) |
| S-MIGRATE-01b | Personnel File left-sidebar nav + Profile tab 2-col layout (PE-07, PE-08, PE-09) | ✅ DONE (8660e42) |
| S-MIGRATE-02 | Training tab: live load + toggle + delete + NIGP card layout (PE-03) | ✅ DONE (02ff560) |
| S-MIGRATE-03 | Training tab: Add Courses inline sub-view — upload → ingest pipeline embedded (PE-10) | ✅ DONE (686007e) |
| S-MIGRATE-04 | Training tab: Edit Course inline sub-view — all form fields editable, PATCH metadata, trainable+active guard (PE-11) | ✅ DONE (732bf3c) |
| S-MIGRATE-05 | Playbook tab: output_format CRUD + guardrails live wiring (PE-04) | ✅ DONE (1644366) |
| S-AVATAR-01 | Avatar consistency sweep — RO-06 (michelle in AVATAR_CFG, Dashboard + StepList) | ✅ DONE (d9d43c2) |
| S-BENCH-UX-01 | Bench UI polish — Roster stats strip, AiBadge, Add a Player, sidebar chips, T.paper fix, back button removal (RO-07, PE-13) | ✅ DONE (812ed59) |
| S-BENCH-UX-02 | Bench UI polish round 2 — AiBadge brass fix (RO-08), AddConfigForm labels, Resume structural fixes, Add Courses polish | ⏳ Design done — ready to code |
| S-AI-ATTR-01 | Capability-agent attribution — Michelle (planning) + Susan (extraction, reinforcement) + type key bug fix (AI-18) | ⏳ Design done — ready to code |

### Bench Side (begins after S-MIGRATE-01)
| Session | Feature |
|---------|---------|
| S-BENCH-01 | Michelle + Susan: trainable flag + role_prompt seed (AG-02, AG-03, AG-08, AG-09) | ✅ DONE (ad31191) |
| S-BENCH-01b | Michelle + Susan full API wiring — deferred to S-INFRA-01 (unified capability service) |
| S-BENCH-02 | Personnel File — post-migration audit + capability dashboard view |
| S-BENCH-03 | Teach screen audit |
| S-BENCH-04 | Test Team audit |
| S-UX-BENCH-01 | UX Review — Roster / Bench screen |
| S-UX-BENCH-02 | UX Review — Personnel File |
| S-UX-BENCH-03 | UX Review — Teach screen |
| S-UX-BENCH-04 | UX Review — Test Team |

### Skills & Capabilities (Bench side — before Work Side wiring)
| Session | Feature | Status |
|---------|---------|--------|
| S-SK-01-design | Skill/Capability data model design session — locked 2026-06-18 | ✅ DONE |
| S-SK-01 | SK-01 through SK-06 — 5 tables + seeds + Personnel File Capabilities section | ✅ DONE (a447e49) |

### Project Manager Capability & Execution Delivery Model
| Session | Feature | Status |
|---------|---------|--------|
| S-EXEC-DESIGN | Execution & Delivery Model design session — locked 2026-06-18. Full pipeline spec, Project Manager Capability defined (5 Skill Profiles), 6 deliverable types, AI pattern map, DB impact, Michelle transition path. Produced: EXECUTION-DELIVERY-MODEL.md, updated SKILL-PROFILE-MODEL.md + FEATURES.md | ✅ DONE |
| S-PM-01 | Seed Project Manager Capability in DB — SK-12. Supabase only, no src/ changes. Michelle's Personnel File immediately shows CAP-PM-01 via existing SK-06 UI. Kickoff doc required. | ✅ DONE (9255c22) |
| S-PM-01b-design | PM Format Skill alignment design session (2026-06-19) — SP-PM-03 output_fields updated: added agentId, agentReason, questions[]. Orchestrator/Executor field distinction locked. S-PM-02 scope confirmed: prompt-assembly only, no deliverables table (Option A). Execution Plan storage deferred to S-DELIVER-04. SK-14 (z-index bug) + SK-15 (Identity Skill) added. | ✅ DONE |
| S-PROMPT-DESIGN | Prompt Service Model design session (2026-06-19) — 3-service architecture locked: Container (AA-03), Builder (AA-43), Sender (AA-44). Input model: Credentials / Skills / Deliverable. Minimum call: task_context only (L1 baseline). Sections capability-defined — no override flag. LLM + max_tokens live on Skill Profile. PROMPT-SERVICE-MODEL.md produced. ARCHITECTURE.md + FEATURES.md updated. | ✅ DONE |
| S-PM-02 | Build Prompt Container API (AA-03) — `api/prompt/container.js`. Reads capability_slug + agent_id, resolves Prompt Specification from Skill Profiles. Design session required (kickoff doc not yet written). | ❌ Not started |
| S-PM-03 | Build Prompt Builder API (AA-43) — `api/prompt/builder.js`. Fetch + Render + Optimize. Depends on AA-03. Design session required. | ❌ Not started |
| S-PM-04 | Build Prompt Sender API (AA-44) — `api/prompt/sender.js`. Send + Parse + Deliver. Depends on AA-43. Design session required. | ❌ Not started |
| S-PM-05 | Refactor api/plan.js — use Prompt Container + Builder instead of hardcoded prompt; expand step schema. Depends on AA-03 + AA-43. | ❌ Not started |

### Infrastructure (after Bench side is stable)
| Session | Feature |
|---------|---------|
| S-INFRA-01 | Capability registry, per-agent LLM assignment, BYOK infrastructure, DB migration to capability model |
| S-INFRA-02 | Auto-Training service — extract `/api/auto-train` from web-memory.js; reusable by any capability (AI-17) |

### Apple Interview Sprint — 2 weeks starting 2026-06-16
> Goal: agents produce visible, typed, reviewable, stored deliverables. Story: assign task → steps run → deliverable appears → user reviews → agent work tracked on profile.
> Priority order: AI Audit redesign first (showcases architecture + correct terminology), then Deliverables model.

| Session | Feature | Status |
|---------|---------|--------|
| S-AI-BADGE-01 | AiBadge foundation — `src/aiPatterns.js` constants + AGENT_PATTERNS map, AiBadge greyed/dashed state for unbuilt patterns, DashboardScreen badge label updates (3), DB-22 Create New Task badge (AI-28 partial, DB-22) | ✅ DONE (a6d00c9) |
| S-AI-BADGE-02 | AiBadge sweep — AssignWorkScreen label updates (7 badges), step card conditional pattern badge logic, AIReviewTab label update (AI-28 partial, AI-29) | ⏳ Design done — ready to code |
| S-AI-BADGE-03 | AiBadge sweep — PersonnelScreen (4 badges), ResumeTab (2 badges), RosterScreen (1 badge) label updates (AI-28 complete) | ⏳ Design done — ready to code |
| S-AI-BADGE-04 | AI Audit pattern catalog expansion — expand By Pattern section from 10 to 20 patterns; update Patterns Roadmap (Now/Next/Later) with PAT-12–20; header stat "8/10" → "8/20". One file: AIActivityPanel.jsx (AI-30) | ⏳ Design done — ready to code |
| S-AI-BADGE-05 | Task Instructions AI pulse buttons + AssignWorkScreen byline badge fix — Re-run All + Update Steps → AiBadge + pdot pulse; fix AI-29 byline badge (AgentHoverCard hover conflict). Files: TaskInstructionsScreen.jsx + AssignWorkScreen.jsx (AI-31) | — |
| S-DELIVER-DESIGN | **Design session (3 parts)** — Part 1: Agent Profile Model locked (ARCHITECTURE.md Section 2). Part 2: CAPABILITIES.md + AI-SERVICES.md created — full Services/Deliverables registry, AI Patterns catalog (10), AI Services catalog (14), sharing patterns, feedback loops, MCP surfaces. Part 3: kickoff docs for S-AI-AUDIT-REDESIGN + S11 + S-DELIVER-04. | ✅ Parts 1–2 done ⬅ Part 3 after badge sessions |
| S-AI-AUDIT-REDESIGN | **Design session first, then coding** — Rebuild AI Audit screen on AI Services model: (1) rename By Activity Type → By Service; (2) add By Pattern section; (3) add Deterministic section; (4–5) keep By LLM + By Agent. Remap existing ai_type strings to service_slug values. Seed `ai_services` + `ai_patterns` tables (AI-25, AI-26). Updates AI-23. Read `docs/AI-SERVICES.md` Sections 2, 3, 6 before starting. | — |
| S11 | TI-14 + TI-15 + TI-16 + AI-11 — Start button, per-step running state, step output written to `deliverables` table | — |
| S-DELIVER-04 | DL-04 + DL-05 + DL-07 + DL-10 + DL-11 + DL-12 — `deliverables` table, change request flow, agent Projects tab, Web Research/Fetch/Plan/Flags/Analysis write | — |
| S-DELIVER-02 | DL-02 + DL-03 — Deliverables Card on task view + per-step inline access + approve/request change UI | — |
| S-DELIVER-01 | DL-01 — Michelle labels step output types at plan time | — |
| S-POLISH-01 | Demo path audit — golden path: assign → approve → run → deliverable → review | — |

### Platform Entity Sessions (new — from S-DELIVER-DESIGN Part 3, 2026-06-16)
> Pre-requisite: S-RENAME-01 must run before any WO coding session.
> Design sessions (S-INTENT-01, S-FORMAT-01, S-WO-01) precede coding sessions.

| Session | Feature | Status |
|---------|---------|--------|
| S-RENAME-01 | Terminology rename cascade — Tasks → Work Orders app-wide; task_id → work_order_id; tasks table → work_orders table; Assign Work → New Work Order; Task Instructions → Execution Plan; update all routes, UI labels, API contracts. See PLATFORM-ENTITIES.md rename table. | ❌ Not started |
| S-WO-01 | Work Order entity — DB migration, creation flow (Intent picker → Format picker → goal/purpose/audience/scope), deliverables[] spec array, lifecycle states, parent_work_order_id stub, Michelle Execution Plan routing | ❌ Not started |
| S-INTENT-01 | Intent entity — intents catalog table, admin UI, canned configuration management, gap flagging storage (product_gaps table), agent assignment table, capability assignment table | ❌ Not started |
| S-FORMAT-01 | Format entity — formats catalog table, section schema editor, data variable schema editor, tier management, agent assignment table, capability assignment table, Format picker component | ❌ Not started |
| S-SERVICE-01 | Service entity — services catalog table, packaging UI (Intent + Format → Service), pricing model, MCP endpoint registration, marketplace listing | ❌ Not started |
| S-CAP-01 | Capability entity full design — capability profile UI, assignment tables (to Intent, Format, Agent), Level grading, gap flag, Universal Profile Structure applied to Capability | ❌ Not started |
| S-METHOD-01 | Method definition + adapter layer formalization — methods table, capability↔method mapping, adapter layer contracts | ❌ Not started |
| S-MONITOR-01 | Monitor & Alert intent — recurring/trigger-based execution pattern, scheduler, trigger model, notification layer (separate architecture from one-shot Intents) | ❌ Not started |

### Deferred (resume after sprint)
| Session | Feature |
|---------|---------|
| S11b | TI-17 + FT-06 — Pat execution + fetch agent |
| S12 | AW-17 — Michelle assigns steps to multiple agents |
| S13 | DB-18 — Auto-select best agent |
| S-DELIVER-06 | DL-08 — Deliverable sharing (signed URL, tiers) |
| S-AI-01 Part B | AI Audit Screen per-task deep dive (AI-12) |
| S-POLISH-01 | Known issue fixes (see STANDARDS.md S-POLISH-01 section) |
| S-MIGRATE-06 | Training tab: Test Agent console inline sub-view (PE-12, needs design session) |

---

## Open Questions

| ID | Question | Blocks |
|----|----------|--------|
| Q5 | Agent step output destination — **RESOLVED 2026-06-13.** Two-tier deliverables model. See DL section above. | ~~S11~~ unblocked |
