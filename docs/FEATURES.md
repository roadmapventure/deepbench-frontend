# DeepBench v5.1 — Feature Inventory

> Status: ✅ Done | 🔶 Partial | ❌ Missing | — N/A
> Session: DONE = built | [ID] = assigned | S-future = not yet scheduled
>
> Last synced from Google Drive: 2026-06-07
> Drive ID: `1NNRE65of3bj7wMzHg3cVIFKq_k1CHvdKicFsW5V8L-I`

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
| DB-06 | Assign New Work button | ✅ Done | DONE |
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

---

## PERSONNEL FILE — PE

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| PE-01 | Profile tab | ✅ Done | DONE |
| PE-02 | Resume tab | ✅ Done | DONE |
| PE-03 | Training tab (from Supabase) | 🔶 Partial (mock only) | — |
| PE-04 | Playbook tab | ✅ Done | DONE |
| PE-05 | Workflow tab (stub) | ✅ Done | DONE |
| PE-06 | Projects tab (stub) | ✅ Done | DONE |

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
| AI-10 | AI Activity Panel — header entry point, grouped by AI type | 🔶 Partial | S-AI-01 Part A |
| AI-11 | Per-step AI execution log → Supabase agent_run_log | ❌ Missing | S11 |
| AI-12 | Full AI Audit Screen (/work/[taskId]/audit) | ❌ Missing | S-AI-01 Part B |

**AI-10 Notes:** Accessible via "+ AI" button in header. Primary view grouped by AI type (not chronological). Per type: total calls, estimated cost, avg latency, locations triggered (expandable). Builds with mock data in S-AI-01; live data wires after S11/AI-11.

**AI-11 Notes:** Logs per step: step_id, agent_id, model, tokens_in, tokens_out, latency_ms, rag_hits, confidence_score, timestamp. Data source for AI-10 and AI-12.

**AI-12 Notes:** Per-task, per-step breakdown: tokens in/out, model used, latency, RAG hits/misses, confidence, timestamp. Exportable report for IT/procurement governance. Distinct from AI-10 (Activity Panel = global view; AI-12 = deep dive per task). Builds with mock data in S-AI-01; live data after S11.

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
| S15a | UX Review — Dashboard | ← NEXT |
| S15b | UX Review — Assign Work | Queued |
| S15c | UX Review — Task Instructions | Queued |
| S-AI-01 Part A | AI Activity Panel (AI-10) | After S15c |
| S-AI-01 Part B | AI Audit Screen (AI-12) | After Part A |

### Bench Side (begins after S-AI-01)
| Session | Feature |
|---------|---------|
| S-BENCH-01 | Michelle Manning — Full Agent (AG-01 through AG-06) |
| S-BENCH-02 | Personnel File audit |
| S-BENCH-03 | Teach screen audit |
| S-BENCH-04 | Test Team audit |
| S-UX-BENCH-01 | UX Review — Roster / Bench screen |
| S-UX-BENCH-02 | UX Review — Personnel File |
| S-UX-BENCH-03 | UX Review — Teach screen |
| S-UX-BENCH-04 | UX Review — Test Team |

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
| S-POLISH-01 | Known issue fixes (see STANDARDS.md S-POLISH-01 section) |

---

## Open Questions

| ID | Question | Blocks |
|----|----------|--------|
| Q2 | "Project vs Tasks" naming — address during UX review sessions | S15a/b/c |
| Q5 | Agent step output destination — A, B, or C (decision needed) | S11 |
