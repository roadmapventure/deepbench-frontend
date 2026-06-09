# DeepBench v5.1 — Feature Inventory

> Status: ✅ Done | 🔶 Partial | ❌ Missing | — N/A
> Session: DONE = built | [ID] = assigned | S-future = not yet scheduled
>
> Last updated: 2026-06-09 | Session: arch-inquiry (AI-17 added)

---

## Feature ID Format

`[AREA]-[NUMBER]`
Areas: `SH`=Shell, `DB`=Dashboard, `AW`=Assign Work, `TI`=Task Instructions, `AZ`=Analyzer, `FT`=Fetch, `RO`=Roster, `PE`=Personnel File, `TC`=Teach, `TT`=Test Team, `AI`=AI Infrastructure, `AG`=Agent Identity, `LA`=Landing, `DL`=Deliverables

---

## SHELL & INFRASTRUCTURE — SH

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| SH-01 | Treasury design system (tokens.js) | ✅ Done | DONE |
| SH-02 | Multi-tenancy stubs | ✅ Done | DONE |
| SH-03 | useAgents() hook | ✅ Done | DONE |
| SH-04 | React Router — all routes | ✅ Done | DONE |
| SH-05 | App shell: header, Work/Bench tabs | ✅ Done | DONE |
| SH-06 | Supabase tasks table integration | ❌ Missing | S-future |
| SH-07 | Supabase Storage CSV | ❌ Missing | S-future (pair with SH-06) |
| SH-08 | Landing screen | ❌ Missing | DECISION NEEDED |
| SH-09 | Case study screen | — | INTENTIONALLY EXCLUDED |

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
| TI-18 | HITL step gate — pauses execution | ❌ Missing | S-future |
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

**WK-XX — Test My Team (future, not yet scheduled):**
Batch-run all bench agents against a sample dataset to compare output quality side-by-side. Entry point: button on Roster screen header. Scope: Work session chain. Do NOT implement in S-MIGRATE-01 or S-MIGRATE-02.

---

## PERSONNEL FILE — PE

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| PE-01 | Profile tab | ✅ Done | DONE |
| PE-02 | Resume tab | ✅ Done | DONE |
| PE-03 | Training tab live wiring — load from Supabase, toggle, delete, NIGP card layout (date col + green node + right-side actions) | ✅ Done | S-MIGRATE-02 (02ff560) |
| PE-04 | Playbook tab live wiring (output_format CRUD — ResumeTab pattern) | 🔶 Partial (static mock) | S-MIGRATE-05 |
| PE-05 | Workflow tab (stub) | ✅ Done | DONE |
| PE-06 | Projects tab (stub) | ✅ Done | DONE |
| PE-07 | Left-sidebar nav (OVERVIEW + CONFIGURE groups, no OPERATE); replaces horizontal tab bar | ✅ Done | S-MIGRATE-01b (8660e42) |
| PE-08 | Profile tab 2-col layout — ID Badge + Compensation left; Readiness + Intel Config + Quick Stats right | ✅ Done | S-MIGRATE-01b (8660e42) |
| PE-09 | Page header breadcrumb from NAV_GROUPS; subtitle uses -level agent (not -level analyst) | ✅ Done | S-MIGRATE-01b (8660e42) |
| PE-10 | Training tab — Add Courses inline sub-view (upload → extract → ingest pipeline, embedded in Training tab, no page navigation) | 🔶 Partial | S-MIGRATE-03 |
| PE-11 | Training tab — Edit Course inline sub-view (edit title, field notes, triggers, priority — no re-vectorization) | ❌ Missing | S-MIGRATE-04 |

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

---

## TEST TEAM — TT

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| TT-01 | Multi-agent query runner | ✅ Done | DONE |
| TT-02 | Prompt comparison / diff panel | ✅ Done | DONE |

---

## AI INFRASTRUCTURE — AI

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| AI-01 | AiBadge on every AI-touched element app-wide | 🔶 Partial | S-future |
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
| AG-02 | Michelle system prompt in Supabase agent_configs | ❌ Missing | S-BENCH-01 LOCKED |
| AG-03 | Michelle trainable via Teach + RAG | ❌ Missing | S-BENCH-01 LOCKED |
| AG-04 | Michelle UI presence on planning screens | 🔶 Partial | S10b ✅ S10p ✅ S-BENCH-01 full |
| AG-04a | Michelle avatar — silhouette placeholder | ✅ Done | S10p |
| AG-04b | Update Plan thinking state — three-layer | ✅ Done | S10p |
| AG-05 | api/plan.js reads Michelle prompt from Supabase | ❌ Missing | S-BENCH-01 LOCKED |
| AG-06 | Michelle surgical replanning directive | ❌ Missing | S-BENCH-01 LOCKED |

**S-BENCH-01 Michelle Manning — Full Spec:**
- Code: `PP-01` | Role: Project Planner | `isPlanner: true`
- Roster position: between Mike Alvarez (SR-02) and Pat Smiley (IR-07)
- Quip: *"I map the mission before anyone moves."*
- Avatar: real photo (not silhouette) — replaces `MichelleAvatar.jsx` placeholder
- System prompt: lives in Supabase `agent_configs` — NOT in code [LOCKED]
- `api/plan.js` and `api/title.js` read her prompt from Supabase [LOCKED]
- Fully trainable via Teach + RAG pipeline [LOCKED]
- Stub in use until S-BENCH-01: `const MICHELLE = { name: "Michelle Manning", code: "PP-01", initials: "MM" }`
- **Do not add Michelle to `agents.js` or remove the stub before S-BENCH-01**

---

## DELIVERABLES — DL (deferred — after Bench work)

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| DL-01 | Step output type label (Michelle assigns at plan time) | ❌ Missing | S-DELIVER-01 |
| DL-02 | Deliverables Card — right panel, full task view | ❌ Missing | S-DELIVER-02 |
| DL-03 | Per-step deliverable access inline | ❌ Missing | S-DELIVER-03 |

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
| S-MIGRATE-03 | Training tab: Add Courses inline sub-view — upload → ingest pipeline embedded (PE-10) | 🔶 Design done — kickoff: v5.1.23-PE10-add-courses-inline.md |
| S-MIGRATE-04 | Training tab: Edit Course inline sub-view — title, notes, triggers, priority (PE-11) | ⏳ Needs design session |
| S-MIGRATE-05 | Playbook tab: output_format CRUD — ResumeTab pattern (PE-04) | ⏳ Needs design session |
| S-BENCH-UX-01 | Full Bench UI polish review — Roster + Personnel File | ⏳ After S-MIGRATE-05 |

### Bench Side (begins after S-MIGRATE-01)
| Session | Feature |
|---------|---------|
| S-BENCH-01 | Michelle Manning — Full Agent (AG-01 through AG-06), built capability-first |
| S-BENCH-02 | Personnel File — post-migration audit + capability dashboard view |
| S-BENCH-03 | Teach screen audit |
| S-BENCH-04 | Test Team audit |
| S-UX-BENCH-01 | UX Review — Roster / Bench screen |
| S-UX-BENCH-02 | UX Review — Personnel File |
| S-UX-BENCH-03 | UX Review — Teach screen |
| S-UX-BENCH-04 | UX Review — Test Team |

### Infrastructure (after Bench side is stable)
| Session | Feature |
|---------|---------|
| S-INFRA-01 | Capability registry, per-agent LLM assignment, BYOK infrastructure, DB migration to capability model |
| S-INFRA-02 | Auto-Training service — extract `/api/auto-train` from web-memory.js; reusable by any capability (AI-17) |

### Deferred (resume after Bench side complete)
| Session | Feature |
|---------|---------|
| S11 | TI-14 + TI-15 + TI-16 + AI-11 — Execution loop (Q5 needed first) |
| S11b | TI-17 + FT-06 — Pat execution + fetch agent |
| S12 | AW-17 — Michelle assigns steps to multiple agents |
| S13 | DB-18 — Auto-select best agent |
| S-DELIVER-01 | DL-01 — Step output type label |
| S-DELIVER-02 | DL-02 — Deliverables Card (right panel) |
| S-DELIVER-03 | DL-03 — Per-step deliverable access inline |
| S-AI-01 Part B | AI Audit Screen per-task deep dive (AI-12) |
| S-POLISH-01 | Known issue fixes (see STANDARDS.md S-POLISH-01 section) |

---

## Open Questions

| ID | Question | Blocks |
|----|----------|--------|
| Q5 | Agent step output destination — A, B, or C (decision needed) | S11 |
