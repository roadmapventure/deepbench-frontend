# DeepBench v5.2 — Feature Inventory — LATER

> Status: ✅ Done | 🔶 Partial | ❌ Missing | — N/A
> Session: DONE = built | [ID] = assigned | S-future = not yet scheduled
>
> **Split 2026-07-07 from `docs/FEATURES.md`, per John's criterion (updated 2026-07-17): "anything not related to making CI successful goes to Later."** This file holds everything not about the Channel Intelligence (CI) screen — Shell, Dashboard, Assign Work, Personnel, Bench, the platform-wide Agent Architecture roadmap (Phases 1–5, marketplace, revenue, BYOA, JL-01, MCP exposure), Work Order/Intent/Format/Service/Skills catalogs, and Structural Enforcement. Read this only when scoping work in one of those areas — `docs/FEATURES.md` (now) is read by default at design-session Step 1, `docs/FEATURES-NEXT.md` covers other CI backlog.
>
> **✅ Done rows archived:** if a feature isn't listed in any of the 3 files, check `docs/FEATURES-ARCHIVE.md` before assuming it's missing.

---

## Feature ID Format

**As of 2026-07-15, this legend governs existing IDs only — do not use it to assign new ones.** New IDs use `docs/SCREEN-INVENTORY.md`'s codes instead: screen-scoped items get `[SCREEN-CODE]-[NUMBER]` (`CHI`/`PRO`/`SPA`/`AGR`/`HOM`/`TMT`/`AIA`/`ABT`), non-screen platform-layer items get `[LAYER-CODE]-[NUMBER]` (`HAR`/`LOO`/`LOG`/`MCP`/`MKT`, plus `AG`/`SK`/`IN`/`FM`'s eventual replacement once `S-ARCH-COMPETENCY-MODEL-design` lands). Applies prospectively only — nothing below is renamed.

`[AREA]-[NUMBER]` (legacy, existing IDs only)
Areas: `SH`=Shell, `DB`=Dashboard, `AW`=Assign Work, `TI`=Task Instructions, `AZ`=Analyzer, `FT`=Fetch, `RO`=Roster, `PE`=Personnel File, `TC`=Teach, `TT`=Test Team, `AI`=AI Infrastructure, `AG`=Agent Identity, `LA`=Landing, `DL`=Deliverables, `WO`=Work Order, `IN`=Intent, `FM`=Format, `SV`=Service, `SK`=Skills & Capabilities, `MI`=Market Intelligence, `AA`=Agent Architecture

---

## SHELL & INFRASTRUCTURE — SH

> **`SH` (shell-wide) bugs have no single mapping in the new taxonomy** — `AppShell.jsx` is cross-screen, not one Screen or listed Platform Layer in `docs/SCREEN-INVENTORY.md` — flag for a design session before assigning a new ID; a bug scoped to one specific screen should use that screen's own code instead. This section's existing `SH-` rows are legacy and stay as-is.

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| SH-13 | About panel: GitHub Action auto-update stats.json on push to dev. **Cross-referenced 2026-07-17 (`mobile-ui-audit-0717`, `MOB-001`):** this is the exact permanent-fix mechanism for the 6 filesystem/DB-schema-fact numbers in the "By the Numbers" grid (source files, lines of code, API routes, DB tables/cols, arch docs, session specs) — a full mobile-viewport sweep found all 6 badly stale (e.g. "61 Session specs" vs. 269 real, "11 DB tables" vs. 23 real), confirming this row's value concretely. `MOB-001` snapshot-corrects the displayed numbers to today's real values as an interim fix; this row remains the tracked permanent (build-time) mechanism. | ❌ Missing | S-ABOUT-STATS-01 (future, separate session) |
| SH-06 | Supabase tasks table integration | ❌ Missing | S-future |
| SH-07 | Supabase Storage CSV | ❌ Missing | S-future (pair with SH-06) |
| SH-08 | Landing screen | ❌ Missing | DECISION NEEDED |
| SH-09 | Case study screen | — | INTENTIONALLY EXCLUDED |
| AGT-005 | **Found 2026-07-15, `S-ARCH-COMPETENCY-MODEL-design`.** `assemblePrompt()`'s own `agentRow` fetch (`db-assembly.js`) selects `bio` from the `agents` table every call, but the Identity section's `cardParts` only ever reads `name`/`role`/`specialty` — `bio` is fetched and silently discarded every time. Real content is lost this way: Eleanor's actual `bio` spells out her entire access-control philosophy in detail, never reaching her own prompt. **Policy decided 2026-07-15, same-day design session: inject `bio` — confirmed as a real Identity field, alongside `name`/`role`/`specialty`/`role_prompt`/the Skill's own text, all mandatory when an Identity Skill is attached.** Also confirmed Identity should attach far more broadly than it does today — audited the real Channel Intelligence loop roster (11 agents): only 7 have an Identity Skill at all. Full detail: `docs/AGENT-COMPETENCY-MODEL.md`. This root row stays Later (the general policy); the MI-loop-scoped, actionable version of the same fix is tracked in `docs/FEATURES.md`'s `AGT-009` (now tier). | ❌ Missing | S-future (design required — policy set, implementation not scoped) |
| AGT-006 | **Found 2026-07-15, `S-ARCH-COMPETENCY-MODEL-design`.** `src/data/agents.js`'s hardcoded `AGENTS` array (explicitly commented "Single source of truth... Do NOT define agents anywhere else") duplicates the Supabase `agents` table — two independently-maintained Profile stores with overlapping but not identical fields (`skill`/`situational` vs. `skill_score`/`situational_awareness`), confirmed capable of drifting out of sync. Needs a session to decide which store is authoritative and retire the other. | ❌ Missing | S-future (design required — real de-duplication effort) |
| AGT-007 | **Found 2026-07-15, `S-ARCH-COMPETENCY-MODEL-design`.** `agent_configs.type = 'output_format'` (a real, DB-enforced third value alongside `role_prompt`/`guardrail`, confirmed via live rows) is an undocumented, real mechanism — canned report-template selection, used exclusively by NIGP/Spend Analysis agents (Robyn, Mike, Bob, Chloe), letting a human pick a template (`is_user_selectable`) at request time. Distinct from a Format Skill (the AI's own structural output contract). Needs scoping/documentation, not necessarily a fix — flagging so it isn't mistaken for dead data later. | ❌ Missing | S-future (documentation, low urgency) |
| AGT-008 | **Found 2026-07-15, `S-ARCH-COMPETENCY-MODEL-design`.** `agent_capability_assignments.agent_id` and `agent_configs.agent_id` have no foreign key to `agents.id` — confirmed via `information_schema` constraint check, unlike `capability_slug`/`skill_profile_slug`, which are both real FKs. A typo'd or orphaned `agent_id` could sit in either table undetected. Fix: add the missing FK constraints. | ❌ Missing | S-future (design required — schema migration) |
| AGR-001 | **Found 2026-07-15, `S-ARCH-COMPETENCY-MODEL-design`.** `PersonnelScreen.jsx`'s `computeLayers()` renders a "5-layer readiness" model (L1–L5) that's literal surviving code from the superseded `AGENT-ARCHITECTURE.md` doc ("Five-Layer Agent Anatomy"), never reconciled with the current Skill Type model. L1 merges Identity+Behavior into one displayed layer with no distinction; L3 "Analysis Payload" has no real tab at all and is hardcoded to always show 100%, regardless of actual content — a fabricated completeness signal on every agent's Personnel Page. | ❌ Missing | S-future (design required — real UI rework) |
| AGR-002 | **Found 2026-07-15, `S-ARCH-COMPETENCY-MODEL-design`.** Personnel Page's Training tab shows `docs`/`classes`/`chunks` counts that are confirmed frontend-only mock numbers — `lib/project-manager.js`'s own code comment: this per-agent activity data "never persisted server-side." Every agent's Personnel Page currently displays fabricated training-volume numbers. Already known to the codebase per that comment, but not previously tracked as its own backlog item. | ❌ Missing | S-future (design required — either wire real data or remove the display) |
| AGT-016 | Feature | **Found 2026-07-15, `S-ARCH-COMPETENCY-MODEL-design` follow-up.** Multi-source identity content (e.g. `bio` and `role_prompt` describing the same thing in different words) needs real semantic dedup/summarization, not string matching — would need its own Technical Service (an LLM step at assembly time), not a `db-assembly.js` tweak. Deliberately out of scope from `AGT-010`'s cheap exact-duplicate fix. | ❌ Missing | S-future (design required) |
| AGT-017 | Architecture | **Found 2026-07-15, `S-ARCH-COMPETENCY-MODEL-design` follow-up.** A second, fully separate prompt-assembly pipeline is live today — `lib/agent-run.js`'s `assembleContext()`, used for Brent (web-fetch/portal-automation) — that never touches `skill_profiles` at all: Role/Format/Guardrails come from hardcoded fallback text, Knowledge/RAG fires directly and unconditionally, zero Skill gating. Decision: retire it, migrate Brent onto the single Skill-based `db-assembly.js` system — the platform should have exactly one prompt-assembly mechanism. | ❌ Missing | S-future (design required — real migration) |
| AGT-018 | Feature | **Found 2026-07-15, `S-ARCH-COMPETENCY-MODEL-design` follow-up.** Align Susan/Trainer's document-upload flow with Brent's `api/web-memory.js` post-run pattern — after training/embedding completes, fire a summary of what was learned. Distinct from `AGT-017` (that's retiring Brent's own assembly pipeline; this is extending Brent's *save* pattern to Susan). | ❌ Missing | S-future (design required) |
| AGT-019 | Feature | **Found 2026-07-15, `S-ARCH-COMPETENCY-MODEL-design` follow-up.** "Load a Job Description" — John's stated platform vision: build an agent's full Skillset from a real job description, auto-mapping Duties→Intent, Required Skills/Qualifications→Knowledge, Role/Title→Identity, etc. Worth using a real JD as a completeness test of the six-type model once scoped — any line that doesn't map cleanly is evidence for a 7th type. | ❌ Missing | S-future (design required) |
| AGT-020 | Architecture | **Found 2026-07-15, `S-ARCH-COMPETENCY-MODEL-design` follow-up.** `capability_skill_profiles.level` is fully populated (all 52 real Skills, L1–L3) but never read during prompt assembly. Confirmed not vestigial — honors `level`'s own original spec (L1 General·L2 Trained·L3 Expert·L4 Proprietary), just never wired to execution behavior. Vision: a Level 1 Skill runs a shallow/junior pass, a Level 4 runs deep/expert-rigor — real execution-depth lever, not just a display number. `tone`/`confidence` likely ride along once designed. | ❌ Missing | S-future (design required) |
| AGT-021 | Tech Debt | **Found 2026-07-15, `S-ARCH-COMPETENCY-MODEL-design` follow-up.** `docs/SKILL-PROFILE-MODEL.md` needs a real update pass — still uses the "Skill Type/Skill Profile as two layers" language `ARCHITECTURE.md` §2 corrected this session, "Five Skill Types" (missing `guardrails`), and Knowledge type-specific traits documented as `domain`/`jurisdiction`/`source_types`/`source_priority` when only 1 of 7 real rows uses that shape (the rest use `source`/`match_count`/`data_room_tag`/`intent_allowlist`). Not everything in the doc is wrong — the Domain-Agnostic Principle and DB schema sections still hold up; this is a correction pass, not a rewrite. | ❌ Missing | S-future (design required) |
| AGT-022 | Feature | **Found 2026-07-15, `S-ARCH-COMPETENCY-MODEL-design` follow-up.** Personnel Page gives no visibility into which Skills a `role_prompt`/`guardrail` entry actually feeds (e.g. one `role_prompt` edit can affect Identity + multiple Behavior Skills at once). Triaged as UI/authoring-visibility only, not a correctness bug — content already reaches the right places once `AGT-010`'s dedup fix lands. Low priority. | ❌ Missing | S-future (low priority) |
| SH-17 | **Pulsing AI-status-dot duplication + stale doc, found 2026-07-07 during MI UI-updates design session.** `STYLE-GUIDE.md` §5 documents the header's active-AI pulsing dot as "Implemented via AIDiamond.jsx" and says not to refactor without a dedicated session — but the actual header code (`AppShell.jsx:137`) is a hand-rolled `<span>` + its own `aiBlink` keyframe (`tokens.js`), not `AIDiamond` at all. Two more near-identical components exist and are both dead code, never imported anywhere: `AIStatusDot` (`components/ui.jsx`, uses a `pdot` animation — the literal anti-pattern the same style guide section warns against) and `AiStatusDot` (`components/SharedUI.jsx`, uses `aiBlink`, same shape as the header's inline copy). Needs its own session: reconcile the doc with reality, delete the two dead duplicates, and decide whether the header should actually be refactored onto `AIDiamond` (the doc's stated intent) or the doc corrected to match the hand-rolled span it actually is. | ❌ Missing | S-future (design required) |

---

## DASHBOARD — DB

> **New Dashboard bugs use `PRO-[NUMBER]` now, not `DB-`** (`docs/SCREEN-INVENTORY.md` — Dashboard is `DashboardScreen.jsx`, the Project Management screen, code `PRO`). This section's existing `DB-` rows are legacy and stay as-is; do not add new ones here.

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| DB-01 | Task list — active tasks, status, priority, HITL | 🔶 Partial (mock data) | — |
| DB-04 | Recently completed section | 🔶 Partial (mock only) | — |
| DB-14 | Chat panel — real RAG + AI call | 🔶 Partial | — |
| DB-18 | Auto-select best agent via AI | ❌ Missing | S13 (deferred) |
| DB-19 | Layer violation cleanup — `checkRouting()` and the main chat call in `DashboardScreen.jsx` (DB-09/DB-14) hand-build raw prompt strings and call `/api/brief` directly, bypassing Dan Bingham's DB Assembly → AI Enrichment pipeline entirely (contradicts `ARCHITECTURE.md` §19's founding principle). Found during S-APPLE-02a-design's Architect Review while scoping CI-01's real Intent Routing/Q&A capability — not fixed there since it's the Work-dashboard chat, unrelated to the Apple Market Intelligence build. Extract to a real `api/capabilities/agent-routing.js` + `api/capabilities/chat-response.js` (per `ARCHITECTURE.md` §1 Phase 1 table, both still listed "inline" today). | ❌ Missing | S-future (unscoped cleanup) |
| DB-20 | Mike Alvarez (SR-02) appears only inside a commented-out sample-data block in `DashboardScreen.jsx` (~lines 36-46) — no live task, no capability assignment, not reachable by a user today despite being a full roster entry. Decide: wire him to a real task type, or retire the roster entry. Found during `S-ARCH-OWNERSHIP-02-design`'s agent inventory (2026-07-02). | ❌ Missing | S-future (cleanup, design required) |

**DB-17 Notes:** Michelle generates concise title + step names on first draft. `title_edited` flag — user owns title after first edit, never overwritten. `api/title.js`: direct Claude Haiku call; Supabase agent_configs wired in S-BENCH-01.

---

## ASSIGN WORK — AW

> **New Assign Work bugs use `PRO-[NUMBER]` now, not `AW-`** (`docs/SCREEN-INVENTORY.md` — Create Work Order is always a child of the Project Management screen, code `PRO`). This section's existing `AW-` rows are legacy and stay as-is; do not add new ones here.

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

> **New Task Instructions bugs use `PRO-[NUMBER]` now, not `TI-`** (`docs/SCREEN-INVENTORY.md`'s Applied mapping table — `TI-16` maps to `PRO`, the Project Management screen Task Instructions is a child of). This section's existing `TI-` rows are legacy and stay as-is; do not add new ones here.

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| TI-02 | HITL step opens relevant screen | 🔶 Partial | S-future |
| TI-03 | Step history from Supabase steps JSONB | ❌ Missing | Blocked by SH-06 |
| TI-07 | Chat transcript in task | ❌ Missing | S-future |
| TI-14 | Start button — triggers step execution | ❌ Missing | S11 (deferred) |
| TI-15 | Per-step execution running state | ❌ Missing | S11 (deferred) |
| TI-17 | Pat execution via Railway | ❌ Missing | S11b (deferred) |
| TI-18 | HITL step gate — full runtime execution contract: (1) execution pauses when a HITL step is reached, (2) signal emitted to notify human (UI state change + future notification), (3) human provides input via the step's comment/approval interface, (4) input injected into the next agent step's context, (5) execution resumes. Activates PAT-10 HITL in AI Audit By Pattern — triggers "Gates Triggered" counter + records human response time. Design session required before coding — needs: pause signal architecture, notification mechanism, resume-with-context handoff spec. | ❌ Missing | S-future (design required) |
| TI-16 | Step output storage to Supabase JSONB — writes each step's output as a `deliverables` row (`step_id` set, intermediate tier; `is_final: true`/no `step_id` for the assembled task deliverable). **Q5 (the blocking design question — "where does agent step output live?") resolved 2026-06-13**: two-tier deliverables model, both tiers in the `deliverables` table, user can inspect/approve/request-change on any step deliverable, every deliverable links to `agent_id`. **Moved to `docs/FEATURES.md` 2026-07-14, moved back here 2026-07-17 (session-hygiene now/next/later re-check)** — Task Instructions is a different screen from the CI/Market Intelligence page; doesn't fit the Now-tier criterion despite Q5 no longer blocking. Needs a design session to scope the write path against `TI-14`/`TI-15` (S11, also in this file). | ❌ Missing | S11 (design required — Q5 no longer blocking) |

---

## NIGP ANALYZER — AZ

> **New Spend Analysis bugs use `SPA-[NUMBER]` now, not `AZ-`** (`docs/SCREEN-INVENTORY.md` — `AnalyzerScreen.jsx`'s `AZ` prefix reflects its NIGP-analyzer heritage; the current screen is Spend Analysis, code `SPA`). This section's existing `AZ-` rows are legacy and stay as-is; do not add new ones here.

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| AZ-03 | Column mapping saved to task record | ❌ Missing | Blocked by SH-06 |
| AZ-04 | CSV upload to Supabase Storage | ❌ Missing | S-future (SH-07) |
| AZ-05 | CSV load from Supabase Storage on return | ❌ Missing | S-future (SH-07) |
| AZ-15 | Tab: AI Review (3-stage, RAG-augmented) | 🔶 Partial | — |
| AZ-18 | Demo task pre-loaded: Austin FY2025 | 🔶 Partial | Blocked by SH-07 |
| AZ-20 | **New, found live-verifying `AZ-19` (✅ Done, moved to `docs/FEATURES-ARCHIVE.md`) against the real deployed dev URL.** On the mobile column-mapping page, selecting a new file updates the "Now Analyzing" label (`fileName`, context state) immediately, but tapping "← Back" before completing mapping/`Run Analysis` returns to Page 1 showing that new filename label next to the *previous* file's KPI/chart numbers (`data` doesn't recompute until analysis actually runs) — label and figures can go out of sync. No crash; edge case only. First live-reachable on mobile because `AZ-19`'s "← Back" is the first control that lets a user return to the dashboard without completing analysis on the newly-selected file — no desktop equivalent existed to expose this before. **Moved here from `FEATURES.md`'s now tier 2026-07-14 (doc-hygiene pass)** — Spend Analyzer scope, not MI loop/speed/harness/charts. | ❌ Missing | S-future |

---

## FETCH — FT

> **Fetch's new-taxonomy code is unconfirmed** — `docs/SCREEN-INVENTORY.md`'s Open Items note it's placed under Spend Analysis (`SPA`) only by route-pattern inference, but John flagged it as a probable NIGP leftover not fully incorporated; verify placement before assigning a new ID rather than assuming `SPA`. This section's existing `FT-` rows are legacy and stay as-is.

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| FT-04 | Post-fetch: download CSV + Map Fields | 🔶 Partial | — |
| FT-05 | Fetched CSV to Supabase Storage | ❌ Missing | S-future (SH-07) |
| FT-06 | Pat selectable as fetch agent | 🔶 Partial | S11b (deferred) |

---

**WK-XX — Test My Team (future, not yet scheduled):**
Batch-run all bench agents against a sample dataset to compare output quality side-by-side. Entry point: button on Roster screen header. Scope: Work session chain. Do NOT implement in S-MIGRATE-01 or S-MIGRATE-02.

---

## PERSONNEL FILE — PE

> **New Personnel File bugs use `AGR-[NUMBER]` now, not `PE-`** (`docs/SCREEN-INVENTORY.md` — Personnel File is always a child of the Agent Roster screen, code `AGR`). This section's existing `PE-` rows are legacy and stay as-is; do not add new ones here.

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| PE-04 | Playbook tab live wiring (output_format CRUD + guardrails — ResumeTab pattern) | 🔶 Partial (static mock) | S-MIGRATE-05 |
| PE-12 | Training tab — Test Agent console (inline sub-view: config selectors, scenario picker, live brief + RAG call, system prompt inspector, RAG chunks panel) | ❌ Missing | S-MIGRATE-06 |
| PE-06 | Projects tab — live wiring to `deliverables` table; shows agent's completed deliverables: count, type, task name, date; stub until DL-04 ships | 🔶 Partial (stub) | S-DELIVER-04 |
| PE-14 | Training tab — "What X Learned" panel UX fix: (1) move AiBadge outside the expandable so it is visible immediately before and after expansion; (2) replace clickable expansion trigger with inline "more..." text after "What X Learned" label | ❌ Missing | S-future |
| PE-15 | Training tab — Add Courses loading state: (1) spinner + status text during Exhibit B pre-fill lag so user knows system is working and cannot click "Teach X this document" yet; (2) AiBadge + AI pulse icon on Exhibit B section showing the pattern being used (KNOWLEDGE_TRAINING) | ❌ Missing | S-future |
| PE-16 | Playbook tab — guardrails section AI Pulse + hover label: add `<AIDiamond>` to the guardrails card header (always/never section) with a hover label identifying PAT-13 Guardrails / Output Filtering as the pattern these constraints feed into. AIDiamond should render in inactive/roadmap state (PAT-13 is `active: false` in PATTERN_CATALOG) — visually distinct from a live-pattern pulse. Exact inactive AIDiamond treatment must be specced in the AI-34/AI-31 design session before this can be coded. Depends on: PE-04 ✅ Done, AI-34 design (AIDiamond pattern label spec). File: PersonnelScreen.jsx (Playbook tab). | ❌ Missing | S-future (depends on AI-34 design session) |
| PE-18 | **New, found 2026-07-13 during `PE-17`'s design session.** `PersonnelScreen.jsx`'s Resume tab (`ResumeTab.jsx`, one `240px 1fr` grid), Training tab (entry list + `AddCourseView` sub-view with 3 grids: `1fr 300px`, `1fr 1fr`, `1fr 1fr 1fr`), and Playbook tab (already single-column, needs zero layout work) still have no mobile treatment for their own body content — `PE-17` only mobilized the shared shell (persona header, tab bar) and the Profile tab. Tapping into these 3 tabs on mobile shows the new mobile shell with desktop-styled tab content below, same as before `PE-17` (no regression, just not yet improved). Own future design session(s); Training's `AddCourseView` is the heaviest of the three. | ❌ Missing | S-future (own design session) |

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

> **New Teach bugs use `AGR-[NUMBER]` now, not `TC-`** (`docs/SCREEN-INVENTORY.md` — Teach is a child of Personnel File, itself a child of Agent Roster, code `AGR`). This section's existing `TC-` rows are legacy and stay as-is; do not add new ones here.

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

> **Test My Team's new-taxonomy code is `TMT`, but placement is itself unconfirmed** — `docs/SCREEN-INVENTORY.md` flags Test My Team as "placement uncertain," sitting directly under Bench (not nested) "for now"; verify current placement before assigning `TMT-[NUMBER]`. This section's existing `TT-` rows are legacy and stay as-is.

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| TT-03 | Multi-Agent Debate upgrade — after parallel run, feed each agent the other's output for a critique pass; add synthesis agent that reads both critiques and produces a reconciled final answer (PAT-16 Multi-Agent Debate). Extends TT-01/02 foundation. Design session required. | ❌ Missing | S-future (design required) |
| TT-04 | Single-Agent Execution Inspector — pick one agent, send it a prompt, watch its full in/out path live: which Intent Skill Profile fired, which Technical Services (AI Patterns) executed, any `request_help`/`delegate_to_agent` hops taken and why (`reasoning` field), the consequential-action gate if one fired, final structured output. Distinct from TT-01/02 (parallel comparison of two agents on one query) — this is a trace/observability view of one agent's own execution, not a comparison. Underlying data mostly already exists (`ai_activity_log.patterns_used`, Agent Loop `reasoning` fields on every hop) — this is a UI to visualize it, not new logging. Raised in `S-APPLE-05-design`'s follow-on architecture conversation (2026-07-04, John, discussing agent inventory/terminology for Apple). Design session required — no scope or screen decided yet. | ❌ Missing | S-future (design required) |

---

## AI INFRASTRUCTURE — AI

> **New AI Audit / activity-log bugs use `LOG-[NUMBER]` now, not `AI-`** (`docs/SCREEN-INVENTORY.md`'s platform-layer table — this exact category maps to `LOG`, confirmed precedent: `AIA-01` was recoded to `LOG-01` for the same reason). This section's existing `AI-` rows are legacy and stay as-is; do not add new ones here. **Added 2026-07-16 after `AI-54`/`AI-55`/`AI-56` were mistakenly assigned here post-taxonomy and had to be renamed to `LOG-02`/`LOG-03`/`LOG-04` at close-out** — the top-of-file "Feature ID Format" legend was correct but easy to miss when landing on this section directly.

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
| AI-38 | Agent Section/Team taxonomy for AI Audit grouping — generalize the `isAppleChannel` boolean already sitting unused on `agents.js` rows (Marcus, Priya, etc. — not read by any UI today, confirmed via grep) into a proper multi-value field (e.g. `section: 'platform' \| 'market-intelligence' \| ...`). **Scope narrowed 2026-07-07 (`S-MI-18-design`):** the local Market Intelligence Column 3 drawer half (originally `MI-06`) no longer needs this field — `S-MI-18` resolved it with a page-local `proposedAgentIds` list + live `ai_activity_log` presence instead, keeping `agents.js` platform-wide/page-agnostic (and removed `isAppleChannel` entirely, now dead). `isAppleChannel` was the only candidate field this generalized, and it's gone — remaining scope is the **global** AI Audit screen's By Agent view grouping only; needs a fresh design session on whether a new field is still the right mechanism there or whether a page-local-list pattern generalizes to that surface too. | ❌ Missing | S-future (design session required — scope now global-AI-Audit-screen-only) |
| LOG-05 | **Found 2026-07-16 scoping `AA-192`'s `api/brief.js` fix.** `SERVICE_CATALOG`'s `agent-routing`/`chat-response`/`document-extraction` entries all declare patterns (`Structured Output`, `Prompt Chaining`, `Streaming`) that don't match the real implementation: all three call `/api/brief`'s AGENT PATH, which is a single non-streaming `callClaude()` call with free-text JSON parsing on the client side (`JSON.parse()` after stripping code fences) — no tool-use schema enforcement, no chaining, no SSE. Only `RAG` is ever genuinely real (conditionally, via `assembleContext()`'s `debugInfo.rag_retrieved`). Same class of finding as `AI-53`'s naming-collision — a catalog declaring patterns that aren't actually happening. Not fixed as part of `AA-192` (that session's scope is real token/model capture, not catalog pattern accuracy) — needs its own pass, likely alongside `AI-35`'s registry unification. | ❌ Missing | S-future (design required, likely folds into AI-35) |
| LOG-06 | **Found 2026-07-16, same investigation as `LOG-05`.** `DashboardScreen.jsx`'s `checkRouting()` and `PersonnelScreen.jsx`'s `generateMetadata()` both send `skipRag: true` to `/api/brief`, intending to skip retrieval for a plain classification/extraction call — but `api/brief.js` never reads `req.body.skipRag` at all (confirmed via full read of the handler). The AGENT PATH calls `assembleContext()` unconditionally, so RAG retrieval likely still runs on every one of these calls despite the caller's explicit intent to skip it — real, unnecessary latency/cost on two live call sites. Not fixed as part of `AA-192` (that session's scope is logging accuracy, not retrieval behavior) — needs its own verification (confirm `debugInfo.rag_retrieved` actually fires on these calls) before scoping a fix. | ❌ Missing | S-future (verification + design required) |
| LOG-07 | **Found 2026-07-16 during `AA-192a`'s own live QA (one supplementary call dropped); confirmed with a real measured rate during `AA-192b`'s close-out the same day.** `logActivity()` (`lib/activity-log.js`) fires an un-awaited `fetch()` to Supabase and returns immediately; if the calling route also doesn't await it (true of every current caller — fire-and-forget is the documented design), a serverless function can return/tear down before the outbound write completes, silently dropping the log row with no error surfaced anywhere. **`AA-192b`'s design session directly measured this against the real deployed `api/brief.js` endpoint (3 real HTTP calls, not an in-process test): 2 of 3 produced a real `ai_activity_log` row, 1 never did (confirmed missing several minutes later, ruling out simple replication lag).** Also caught the same session: a coding session's own "live QA" cited a stale pre-existing row (from `AA-192a`'s earlier test) as if it were fresh evidence from its own call — a real process gap (accepting a report without independently confirming the row's timestamp is genuinely new), not just the underlying drop bug. This is a platform-wide reliability gap in the shared function itself, not specific to any one session's files — affects every one of the ~10+ existing `logActivity()` call sites (`AA-190`'s full migration, `AI-55`, `AI-56`, `AA-192a`/`b`, etc.), all sharing this same fire-and-forget shape. Non-streaming routes (like `api/brief.js`) that log immediately before returning likely have less real wall-clock grace time for the write to complete than streaming routes (like `api/plan.js`) that keep the connection open longer — a plausible reason this hadn't been directly measured before. | ❌ Missing | S-future (design required — real ~33% drop rate now measured on `api/brief.js`, worth prioritizing above other `S-future` items; investigate await-with-bounded-timeout vs. current fire-and-forget) |
| LOG-09 | **Server-side AI calls with zero logging anywhere, confirmed 2026-07-16 by direct code read against `origin/dev` (not relayed from an agent), then independently caught by the `LOG-08` sweep tool.** **CI/MI-scoped slice fixed 2026-07-16 (`S-LOG-09c`, v6.3.27, John's explicit scoping call — Marcus/Priya/Nadia/Owen/Sam/Elena only):** `lib/rag.js`'s `queryRAG()` and `lib/search-harness.js`'s `queryTheReasoning()`/`writeTheReasoning()` now log via the existing `knowledge-retrieval`/`similarity` catalog entry — live-verified. **Still open, non-CI/MI dashboards, next bucket:** `api/plan.js`'s core task-planning call (`action:'plan'`, default) and its `'title'` action — both real Anthropic calls, zero `logActivity` in either branch. `lib/agent-run.js`'s `callReflect()` (REFLECT Haiku call) and `callClaude()` (generation call) — the shared wrapper has zero logging built in, so even `api/brief.js`'s already-fixed AGENT PATH only logs the final generation call, never the separate REFLECT sub-call inside `assembleContext()`. `lib/rag.js`'s `queryRAG()` remains unlogged from its 3 non-CI/MI callers' perspective in the sense that `trace_id` isn't threaded to them (the fix itself is shared-function-level so they do now log — see `S-LOG-09c`'s kickoff, Architect Review). `api/brief.js`'s LEGACY and PAT paths — zero logging (the AGENT PATH is correctly fixed, `AA-192a`). `api/web-memory.js`'s Haiku "learning" call — zero logging (this absorbs `AA-192c`'s scope, paused mid-investigation before this pivot — same file, same finding, one ID going forward). | 🔶 Partial (CI/MI slice done) | S-future (design required — non-CI/MI files, likely multiple sub-sessions) |
| LOG-10 | **Client-side AI calls with zero logging anywhere, confirmed 2026-07-16 the same way as `LOG-09`.** **Highest-priority item fixed 2026-07-16 (`S-LOG-09c`, v6.3.27):** `src/contexts/FetchContext.jsx`'s missing `logAICall` import — the genuine `ReferenceError` on every successful Fetch run since 2026-06-04 — is fixed; the fetch/PATCH-abort side-effect should no longer occur (the completion path itself wasn't live-observable this session due to an unrelated Railway backend outage — static verification only, flagged for a future spot-check when reachable). **Still open, next bucket:** `src/screens/analyzer/AIReviewTab.jsx` — imports `logAICall` but never calls it (dead import); makes a real `/api/brief` call with zero logging anywhere, client or server. `src/screens/TestTeamScreen.jsx` — zero `logAICall` usage at all; makes real `/api/rag-query` and `/api/brief` calls, both unlogged. `src/screens/TaskInstructionsScreen.jsx` — zero `logAICall` import or usage; calls the same two unlogged `api/plan.js` actions from `LOG-09`. | 🔶 Partial (FetchContext.jsx crash fixed) | S-future (design required — remaining 3 screens) |
| LOG-11 | **Catalog/registry mismatches confirmed 2026-07-16 by direct code read.** `document-extraction`'s `SERVICE_CATALOG` entry claims `serviceType:'ai'` + a `Structured Output` pattern, but `api/extract.js` (the deterministic parser this `ai_type` actually names) has zero Anthropic/OpenAI calls anywhere, confirmed by grep — same naming-collision class as `AI-53`. `guardrails-check` (`request-receivable.js`'s real, logged guardrails calls) has no `AI_TYPE_TO_SERVICE` entry at all — its rows fall outside any named service bucket in the By-Service rollup. `prompt-assembly` is marked `roadmap:'now'` (implying already live) but zero real code anywhere writes `ai_type:'rag_briefing'` or any value resolving to this slug — confirmed via full-repo grep, no real caller exists. `src/aiPatterns.js` (`AI_PAT`/`AGENT_PATTERNS`, the older competing pattern-label source `AI-35` wants retired) has exactly 8 real importers as of this date (not 9 — `MarketIntelligenceScreen.jsx` already had this import removed, `FEATURE: MI-51`): `StepList.jsx`, `CreateWorkOrderScreen.jsx`, `DashboardScreen.jsx`, `PersonnelScreen.jsx`, `RosterScreen.jsx`, `TaskInstructionsScreen.jsx`, `AIReviewTab.jsx`, `ResumeTab.jsx` — full blast radius now known for whenever `AI-35`'s unification actually happens. | ❌ Missing | S-future (folds naturally into `AI-35`'s scope, not a separate design session) |

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

> **New Agent Identity/Configuration bugs use `AGT-[NUMBER]` now, not `AG-`** (`docs/SCREEN-INVENTORY.md` — `AGT` replaces `AG`/`SK`/`IN`/`FM` with one unified Agent Competency Model code, confirmed 2026-07-15). This section's existing `AG-` rows are legacy and stay as-is; do not add new ones here.

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
| AG-25 | Apple Channel — **Emerging Market Prioritization Agent** (roadmap, not yet designed in depth — draft only). Distinct from the GEO CSO Expert: pulls **live external data via Brent** (existing ReAct/Playwright web agent) rather than static pre-seeded RAG — smartphone penetration (GSMA), upgrade cycle data (Counterpoint), GDP growth (World Bank public API), carrier landscape (GSMA/Wikipedia). Outputs a structured Market Prioritization card (opportunity signal, signal strength, recommended channel motion, key data points, data gaps). Not part of the Market Intelligence 6-agent build — a separate future capability, second of the original 3-agent arc (90 days / 6 months / 12 months). Draft spec: `docs/DEEPBENCH-APPLE-BUILD-PLAN.md` "Agent 2". | ❌ Missing | S-future (design session required) |
| AG-26 | Apple Channel — **Partner Training Readiness Agent** (roadmap, not yet designed in depth — draft only). Different user than every other Apple Channel agent — serves partner reps (carrier/retail staff), not GEO directors. Conversational product/program Q&A, sales-scenario coaching, quiz mode. HITL-gated on pricing/promo questions (change frequently) or low confidence. Third of the original 3-agent arc. Draft spec: `docs/DEEPBENCH-APPLE-BUILD-PLAN.md` "Agent 3". | ❌ Missing | S-future (design session required) |
| AG-30 | Christy Park (MK-05) is referenced in `DashboardScreen.jsx`'s task-type map (`formatting: {agentId:"christy",...}`) but has zero rows in `agent_capability_assignments` — no working capability actually backs the formatting task type she's assigned to. Decide: give her a real capability, or retire her in favor of the already-built Format Skill specialists (Alex/Riley/Claire) who already cover formatting/layout/presentation. Found during `S-ARCH-OWNERSHIP-02-design`'s agent inventory (2026-07-02). | ❌ Missing | S-future (cleanup, design required) |

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

> **New Deliverables bugs split by content, not `DL-`** — schema/data-model rows map to `DAT`, marketplace/sharing rows (e.g. old `DL-08`/`DL-09`) map to `MKT`, per-screen UI rows (e.g. old `DL-02`'s Deliverables Card) map to whichever screen they appear on — not uniform, check `docs/SCREEN-INVENTORY.md` before assigning. This section's existing `DL-` rows are legacy and stay as-is.

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

> **New Agent Architecture bugs use whichever new code actually fits, not `AA-`** — this platform-wide-roadmap tier splits by content: marketplace/revenue (Phase 3-4) rows trend `MKT`, agent character/competency rows trend `AGT`, harness/loop/ownership-broker rows trend `HAR`/`LOO`, screen-specific items use that screen's code — not uniform, check `docs/SCREEN-INVENTORY.md` before assigning. This section's existing `AA-` rows are legacy and stay as-is.

> Full spec: docs/AGENT-ARCHITECTURE.md (created S-AGENT-ARCH-01)
> MI-relevant loop/harness items (`docs/FEATURES.md`) and MI-adjacent enhancements (`docs/FEATURES-NEXT.md`) have been extracted from this area's active rows — this file holds the platform-wide roadmap (Phases 1–5, marketplace, revenue, BYOA, JL-01, MCP) plus non-MI Resource Ownership Broker Track items.

### v6.0.0 — True Agent Orchestration (Agent Loop) [opened `S-ARCH-AGENT-LOOP-01-design`, 2026-07-02]
> `ARCHITECTURE.md` §19d (LOCKED, corrected 2026-07-02 — see §19e note inline). Supersedes AA-24's placeholder scope for the handoff *mechanism* specifically (AA-24's Lead/Execute/Challenge/Synthesize collaboration-role vocabulary is still open, not yet mapped onto this). Surfaced when `S-APPLE-04a`'s design pass found the capability model had no legitimate way for an agent to call another agent on its own initiative — cross-capability handoff was being pushed to Layer 2 (screen) scripting, which is not agentic orchestration. This track replaces that model platform-wide, starting with the Market Intelligence agents; `S-APPLE-04a` (Data Expert Escalate) is paused pending it. **AA-80 (the harness itself) ✅ Done, `docs/FEATURES-ARCHIVE.md` — S-ARCH-AGENT-LOOP-01 (866f8fd), 2026-07-02 — its `available_delegates` shape was found known-wrong and has since been patched, `AA-87` ✅ Done, `docs/FEATURES-ARCHIVE.md` — S-ARCH-LOOP-PATCH-01 (3eb970a), 2026-07-02. First real Skill Profile data (`AA-81` ✅ Done) and the loop-termination bug it exposed (`AA-97` ✅ Done, `S-ARCH-LOOP-PATCH-02`, ededcab, 2026-07-02) are both resolved. The 4-capability retrofit (`AA-82` ✅ Done, `S-ARCH-AGENT-LOOP-03`, 2026-07-02) is also complete — `docs/FEATURES-ARCHIVE.md`. This track is now fully shipped; the one carved-out idea (`AA-98`) was resolved differently, not built, by `S-APPLE-05-design` (2026-07-04) — see that row.**

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| AA-111 | **Ephemeral/dynamically-synthesized Competency — raised in conversation (2026-07-04, John), not yet designed.** Idea: instead of only assembling a pre-existing, persona'd Agent's Skill Profiles at call time, an orchestrating agent (or the harness) could assemble a *novel* combination of Skill Profiles at runtime — a bespoke, one-shot worker with no name/avatar/Bench seat — run it once, and let it not persist afterward. Maps onto an already-legitimate but unused concept in `ARCHITECTURE.md` §2's own model: a "Standalone Competency" (a Competency with no persona is already valid/sellable/MCP-accessible) — the novel part is *runtime, ad hoc assembly* of one rather than a pre-built standalone Competency. Open questions before this can be scoped: (1) does "ephemeral" mean selecting/recombining *existing* Skill Profile rows at runtime (small, compatible extension of `assemblePrompt()`), or *synthesizing brand-new* Skill Profile content on the fly (much bigger claim — who reviews/approves it before it's trusted with real data access?); (2) governance must travel with it regardless of persistence — same `data_room_tag`/`uber_access` checks, same `ai_activity_log` attribution, same `reasoning`-field discipline as any other Agent Loop decision — "doesn't persist" must never mean "doesn't get logged or access-checked"; (3) the decision to synthesize a new configuration instead of reusing an existing agent is itself consequential and should pass `§19d`'s sniff test, not bypass it. | ❌ Missing | S-future (design required) |
| AA-96 | `agents.rating` (numeric column) has no defined meaning anywhere in the platform — zero references in `src/`, no prior session specs what it represents (a 1-5 score? QA pass rate? something else). Surfaced `S-ARCH-AGENT-LOOP-02-design` (2026-07-02) when populating self-assessment signal fields for Michelle's roster broker — explicitly left at its placeholder `0` rather than inventing a value with no backing meaning. Needs its own design session to define semantics before any agent's row gets a real value. | ❌ Missing | S-future |

---

### Resource Ownership Broker Track [opened `S-ARCH-OWNERSHIP-01-design`, 2026-07-02]
> `ARCHITECTURE.md` §19e (LOCKED). Surfaced mid-`S-ARCH-AGENT-LOOP-02`-design: John rejected `available_delegates`' agent-naming fields (`executing_agent_id`/`critique_agent`) as a Rule #1 violation — no agent's data may ever name another agent, not even via a generic lookup. The fix generalizes the already-built Librarian pattern (`§19c`) — exclusive ownership brokers per protected resource — and requires a real broker agent (Michelle Manning, PP-01, Project Manager) who resolves *who executes* as her own reasoning output. **This track's core blocker is resolved (2026-07-02) — `AA-86`/`AA-87` both done — unblocking `S-ARCH-AGENT-LOOP-02`/`03` (AA-81/82).** `AA-88`–`93` remain open, not blocking. MI-specific ownership items (`AA-90`, `AA-99`) moved to `docs/FEATURES.md`; `AA-92` moved to `docs/FEATURES-NEXT.md`.

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| AA-85 | Agent Ownership Matrix — walk the full agent roster (`agents.js` + Supabase `agents` table, not just the 12 with `agent_capability_assignments` rows today) with John, classify each agent/resource pair as Exclusive Access-Control Broker, Collaborative Service Attribution, or neither. Adds rows to `ARCHITECTURE.md` §19e's registry table. Design-only, no code. **2026-07-02:** trimmed to the 7 Market Intelligence-track agents (Michelle, Marcus, Priya, Nadia, Owen, Sam, Elena) + Alex Reeves per John's explicit request — full 21-agent pass deferred. Michelle/Marcus locked (`§19e`), Priya/Nadia/Sam/Alex confirmed Neither, Owen/Elena stay deferred per prior decisions. Unblocked `AA-86`, kickoff written (`S-ARCH-PM-BROKER-01`). Remaining 14 agents: no session assigned yet. | 🔶 Partial (MI-track done, full roster deferred) | S-ARCH-OWNERSHIP-02-design |
| AA-88 | Trainer (Susan Smith, TR-08) ownership broker — exclusive write access to an agent's own personnel file (training stats, skill/situational scores, docs/classes/chunks counts). No broker exists yet; today these fields are presumably written by whatever training pipeline touches them directly. Needs AA-85's matrix pass to confirm current write paths before scoping. | ❌ Missing | TBD, after S-ARCH-OWNERSHIP-02-design |
| AA-89 | Self-read personnel file broker — an agent may read its own personnel file (agent-to-agent access, not the human-facing Personnel screen, which stays unrestricted UI display). No broker exists yet. Needs AA-85's matrix pass. | ❌ Missing | TBD, after S-ARCH-OWNERSHIP-02-design |
| AA-91 | Robyn Castellanos (NIGP Consultant, CN-03) runs entirely on the legacy v4 analyzer (`ARCHITECTURE.md` §17, preserved as-is) — she predates and sits outside the Skill Profile/capability model. She's still referenced from new-model screens (Dashboard's task-type map, Task Instructions) as if she were a regular platform agent. Decide: formally document her as a v4-only bridge persona (no `capability_slug`, ever), or scope a migration path onto the new model. Found during `S-ARCH-OWNERSHIP-02-design`'s agent inventory (2026-07-02). | ❌ Missing | S-future (cleanup, design required) |
| AA-93 | Multiple simultaneous `project-manager`-capability holders — `AA-87`'s harness wire already resolves the `request_help` route by capability_slug (not a hardcoded agent id), so a second PM-role agent wouldn't break the wire mechanically, but nothing today defines what happens if **more than one** agent holds `project-manager` at once (split by tenant? both return candidate lists that get merged? one is primary and one is backup?). Explicitly deferred (2026-07-02, John: "for now it's just project manager... in the future we can list of multiples") — today's build assumes exactly one holder. Needs its own design session before a second PM-capable agent is ever added. | ❌ Missing | S-future (design session required, blocks any 2nd PM agent) |
| AA-94 | Retire the dead `capability-registry-knowledge` Skill Profile (Knowledge type, attached to Michelle's `project-manager` capability) — `traits.fetch_instruction` is `null`, so it has never actually fetched anything (same bug class as the historical `AA-75` finding: declared intent, never wired). Now redundant with `pm-roster-knowledge` (`AA-86`, `S-ARCH-PM-BROKER-01`), which does the same job for real. Found post-close-out cross-check (2026-07-02) — a duplicate-functionality Architect Review miss in the `S-ARCH-PM-BROKER-01` kickoff doc: the existing `capability-registry-knowledge`/`capability-assignment` pair on the same capability wasn't checked before writing new profiles. `capability-assignment` (Behavior type) is not affected — it shapes the unrelated, already-live `work-order-decomposition` planning call and stays as-is. Fix: delete the `capability-registry-knowledge` row and its `capability_skill_profiles` link (display_order 5). Small, low-risk, no live caller depends on it. | ❌ Missing | S-next-patch (fast-follow, non-blocking) |
| AA-102 | `pdf-assembly-format`'s `traits.handler` is `'package'` — not a registered handler in `request-receivable.js`'s `HANDLERS` map (`store`, `library-write` only). If Claire Sutton's capability were ever actually invoked, it would hit the existing 501 "Handler not implemented" guard. Found in passing during `S-ARCH-HITL-RESUME-01-design` (2026-07-03) while checking Display agent catalog entries — not fixed there, out of scope for an audit-wiring-only session. | ❌ Missing | S-future (small fix, needs its own session or folds into `AA-101`) |
| AA-123 | **New, found during `S-AI-AUDIT-FIX-02`'s design-session live QA (2026-07-07).** The AI Audit header's "SERVICES ACTIVE" stat shows a stale denominator (`12/14`) — `SERVICE_CATALOG` has grown to 32 entries (confirmed live count post-`AA-122`), not 14; the `14` appears to be a leftover from the catalog's original size (`useAIActivity.js` line 10's own comment: "AI Services catalog (14 services..."), never updated as entries were added across many sessions since. Cosmetic only — doesn't affect any aggregation logic, `byService`/`servicesActive` compute correctly; just the header's total figure is wrong. Confirmed unrelated to `AA-122`'s own fix (pre-existing before that session, not introduced by it). Needs its own small fix: find wherever the `14` is hardcoded (likely `AIActivityPanel.jsx`) and derive it from `SERVICE_CATALOG.length` instead. | ❌ Missing | S-future (tiny follow-up, non-blocking) |

---

### Phase 1 — Foundation

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| AA-01 | `agent_character` table — character settings per agent (philosophy, skeptic_level, autonomy_level, temporal_stance, epistemology, confidence_calibration, peter_principle, collaboration_role, ethical_constraints, learning_stance, lock states per field) | ❌ Missing | S-INFRA-01 |
| AA-02 | `training_type` column on `knowledge_entries` — tags: knowledge / behavioral / reasoning / character | ❌ Missing | S-INFRA-01 |
| AA-54 | Handler registry expansion — `api/lib/handlers/dispatch.js` (route to agent/capability-route), `api/lib/handlers/package.js` (prose → docx/pdf), `api/lib/handlers/mcp.js` (call MCP server with result). Action deliverable category: `format: "action"`, `handler: "dispatch"` or `"mcp"`. Hybrid deliverable: runs both store + action handlers. `format_contract.handler` slug on Format Skill Profile routes to correct module. Design session required. | ❌ Missing | S-future (design required) |
| AA-56 | DB Assembly `runtime_context` input parameter — optional string injected as "Additional Context" section at the end of the assembled sections array. Passes Q&A clarifying answers from the re-generate flow into the full Prompt Service pipeline so Michelle receives the best possible context on regeneration. Without this, re-generate would fall back to the hardcoded pass-through path and bypass Michelle's Skill Profiles. | ❌ Missing | S-PM-05a |
| AA-55 | Server-side `ai_activity_log` write pattern for all Prompt Service routes — currently only `request-receivable.js` logs server-side. When MCP callers or non-frontend callers are introduced for DB Assembly or AI Enrichment, those routes need server-side logging too. Extend pattern to `db-assembly.js` and `ai-enrichment.js`. | ❌ Missing | S-future (MCP era) |
| AA-59 | Dan Bingham as Prompt Architect — DB Assembly + AI Enrichment become Dan's named capability routes. Dan's agent_id (ps-01) is passed alongside the requesting agent in every Prompt Service call. Dan's skill profiles carry REFLECT and Synthesis configuration as traits. Dan is shown as a collaborator in the UI alongside the primary agent everywhere the Prompt Service fires. Dan logs to ai_activity_log separately from the requesting agent with his own service entry in SERVICE_CATALOG. Partial: db-assembly SERVICE_CATALOG entry + AI_TYPE_TO_SERVICE wired. Logging (ps-01 in ai_activity_log) → S-PROMPT-ARCH-01. | 🔶 Partial | S-DAN-02 (eb8285d) → S-PROMPT-ARCH-01 |
| AA-63 | Content specialist routing — deliverable tiles on Create Work Order route to the appropriate content specialist agent based on deliverable type. Michelle remains the planner specialist. Brent remains the web specialist (Railway + Playwright — unchanged). Future content specialists: Research & Analysis, Data Insights, Document & Compliance. Each has Identity + Behavior + Knowledge + Intent skills only — no Format Skill. Design session required before coding. | ❌ Missing | S-CONTENT-01 (design required) |
| AA-65 | Dan Bingham UI collaboration indicator — when the Prompt Service fires for any agent, a small secondary indicator shows Dan as a collaborator alongside the primary agent. Not a separate step in the work order. Applied everywhere the Prompt Service runs: Create Work Order Generate Plan, TaskInstructionsScreen Re-generate (post S-PM-06), and all future prompt-service callers. Dan's contribution is also visible in the AI Audit as a separate team member row. Partial: PromptEvolutionModal footer two-chip indicator (primary agent chip T.brass + Dan chip T.moss). Other surfaces → S-PROMPT-ARCH-01. | 🔶 Partial | S-DAN-02 (eb8285d) → S-PROMPT-ARCH-01 |
| AA-66 | Identity section additive assembly — db-assembly.js Identity section combines ALL non-blank sources: agents table (name, role, specialty), all role_prompt entries from agent_configs (not just is_default), skill profile objective + method. Every source that is not blank is included. No OR logic — additive always. Depends on AA-58 (agents table). Partial implementation in S-AGENT-TABLE-01 (assembly logic wired; full integration tested when identity skill profiles are seeded). | 🔶 Partial | S-AGENT-TABLE-01 → S-PROMPT-ARCH-01 |
| AA-69 | **Split 2026-07-17 (`S-SES003-TSR-design`) — narrowed to its `plan.js`-specific remainder after live investigation found the shared-Harness half is a distinct, CI-relevant issue (now `HAR-04`, `docs/FEATURES.md`).** `plan.js`'s `action:'prompt-service'` handler (Project Management's "Create Work Order" pipeline — not used by Channel Intelligence) runs DB Assembly → AI Enrichment → Request & Receivable as in-process calls inside one `maxDuration:60` function with **zero budget-checking between steps** — unlike `execute.js`'s CI loop, which already checks estimated remaining time before every hop and checkpoints to `durable_hops` rather than risking the ceiling. Confirmed live (2026-07-17): DB Assembly (~5s) + AI Enrichment's own Reflect (up to 30s)/Synthesis (up to 30s) + Request & Receivable's call chain (see `HAR-04`) can sequentially exceed the 60s ceiling with no checkpoint/resume mechanism to fall back on — a hard Vercel kill (504), not a graceful degradation. Fix direction: give `plan.js`'s `prompt-service` action the same hybrid budget-check/checkpoint pattern `execute.js`'s `runLoop()` already proves out, or move Work Order creation onto `execute.js`'s generic capability path entirely rather than maintaining a second bespoke pipeline. Not CI-relevant — stays in `FEATURES-LATER.md` (Project Management scope). Low priority while calls typically complete in 15–25s. | ❌ Missing | S-future (low priority, PM-scoped) |
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

> **New MCP exposure bugs use `MCP-[NUMBER]` now, not `MC-`** (`docs/SCREEN-INVENTORY.md`'s platform-layer table — `MCP` covers "services exposed as MCP tools," was part of `SV`, now its own code). This section's existing `MC-` rows are legacy and stay as-is; do not add new ones here.

> Full spec: `docs/AI-SERVICES.md` Section 7
> All items Phase 4+. Design session required before any MCP surface is built: S-MCP-01 (not yet scheduled).

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| MC-01 | MCP Agent — expose a named agent as an MCP server; agent capabilities available as MCP tools to Claude Desktop and external AI clients. **Confirmed compatible with the Agent Loop (`ARCHITECTURE.md` §19d, 2026-07-02):** a thin MCP adapter calling `runCapability()` directly, same shape as `execute.js`'s existing HTTP handler — no capability logic duplicated, and an external caller transparently gets the agent's real internal delegation (e.g. calling Priya via MCP still lets her pull in Nadia). Two things this depends on when actually scheduled: (1) `AA-83` (`_hop_counter` request-body hardening) becomes a hard prerequisite, not optional, once an untrusted external caller exists; (2) `pending_confirmation`'s resume flow is undesigned for a non-interactive MCP caller (return the gated payload and let the calling system's own human resolve it? a separate resume tool?) — needs its own decision in `S-MCP-01`'s design session. | ❌ Missing | S-MCP-01 |
| MC-02 | MCP Capability — expose a specific Capability without full agent persona; more granular than MC-01 | ❌ Missing | S-MCP-01 |
| MC-03 | MCP Deliverable — expose deliverable production as an MCP tool; caller receives structured typed deliverable output | ❌ Missing | S-MCP-01 |
| MC-04 | MCP Service — expose a single AI Service directly as an MCP tool; finest granularity; infrastructure licensing tier | ❌ Missing | S-MCP-01 |
| MC-05 | MCP Workflow — expose full multi-step task pipeline as one MCP tool; caller receives completed task with all deliverables | ❌ Missing | S-MCP-01 |
| MC-06 | MCP Training — allow external systems to push training material to an agent via MCP; enterprise DMS/CMS integration | ❌ Missing | S-MCP-01 |
| MC-07 | MCP Feedback — allow external systems to send approval or change-request signals via MCP; closes feedback loop without DeepBench login | ❌ Missing | S-MCP-01 |

**Forward-looking note added 2026-07-02 (`S-ARCH-LOOP-PATCH-01-design`, John):** `AA-87`'s `request_help` mechanism describes a skill need in plain language (`skill_needed`/`task_description`/`context`/`reasoning`) and never requires the caller to know an internal `capability_slug` — resolution is Michelle's own live reasoning over the roster, not a lookup keyed to the caller's vocabulary. This shape generalizes naturally to an external MCP caller: it could describe what it needs in its own terms and get routed to the correct internal agent/capability without ever learning DeepBench's internal taxonomy. Worth designing `MC-01`/`MC-02` with this in mind when `S-MCP-01` is scheduled — not a commitment to build now, just don't lose the connection.

---

## WORK ORDER — WO

> **New Work Order bugs use `PRO-[NUMBER]` now, not `WO-`** (`docs/SCREEN-INVENTORY.md` — Create Work Order is always a child of the Project Management screen, code `PRO`). This section's existing `WO-` rows are legacy and stay as-is; do not add new ones here.

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

> **New Intent bugs use `AGT-[NUMBER]` now, not `IN-`** (`docs/SCREEN-INVENTORY.md` — `AGT` replaces `AG`/`SK`/`IN`/`FM`; `INTENT-MODEL.md` itself is superseded, folded into the Agent Competency Model's Intent-type Skill, confirmed 2026-07-15). This section's existing `IN-` rows are legacy and stay as-is; do not add new ones here.

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

> **New Format bugs use `AGT-[NUMBER]` now, not `FM-`** (`docs/SCREEN-INVENTORY.md` — `AGT` replaces `AG`/`SK`/`IN`/`FM`; `FORMAT-MODEL.md` itself is superseded, folded into the Agent Competency Model's Format-type Skill, confirmed 2026-07-15). This section's existing `FM-` rows are legacy and stay as-is; do not add new ones here.

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

> **New Skills & Capabilities bugs use `AGT-[NUMBER]` now, not `SK-`** (`docs/SCREEN-INVENTORY.md` — `AGT` replaces `AG`/`SK`/`IN`/`FM` with one unified Agent Competency Model code, confirmed 2026-07-15). This section's existing `SK-` rows are legacy and stay as-is; do not add new ones here.

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

> **New Service bugs split, not `SV-`** — catalog/profile/marketplace rows (like old `SV-01`/`02`/`04`) map to `MKT`; the MCP-tool-path exposure row (old `SV-03`) maps to `MCP` (`docs/SCREEN-INVENTORY.md`'s platform-layer table). Not uniform, check content before assigning. This section's existing `SV-` rows are legacy and stay as-is.

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

> **New Landing bugs use `HOM-[NUMBER]` now, not `LA-`** (`docs/SCREEN-INVENTORY.md` — the Home Screen this section is about is Screen code `HOM`; `LA-01` itself is the confirmed example already tracked here). This section's existing `LA-` rows are legacy and stay as-is; do not add new ones here.

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| LA-01 | **Home Screen — the decision this row was waiting on is resolved 2026-07-15 (John, screen-inventory design conversation).** `/` is a real, distinct future screen — splash, announcements, and overall dashboard metrics — not a rename of what's currently there. `MarketIntelligenceScreen.jsx` ("Channel Intelligence," itself renamed from "Market Intelligence"/MI-46 the same conversation) is squatting on `/` temporarily and needs to move to its own route once Home exists; not fixed here, just unblocked for scoping. Also surfaced the same session: the platform's nav is a real two-level hierarchy — **Home** / **Work** (a family of per-work-type dashboards: Channel Intelligence, Project Management, Spend Analysis, room to grow) / **Bench** (Agent Roster + its own children: Add Agent, Personnel File → Teach) / **Platform** (AI Audit, About) — not a flat screen list. Full draft inventory and the naming decisions behind it: this conversation, not yet written to a dedicated doc. | ❌ Missing | S-future (design required — scope Home Screen's own content, and Channel Intelligence's move off `/`, as separate sessions) |

---

## STRUCTURAL ENFORCEMENT — SE

> **`SE` has no single mapping in the new taxonomy** — it's an audit/enforcement concern cutting across every screen and platform layer, not itself a Screen or a listed Platform Layer in `docs/SCREEN-INVENTORY.md`; flag for a design session on whether it becomes its own new platform-layer code or splits per rule's actual owning area before assigning a new ID here. This section's existing `SE-` rows are legacy and stay as-is.

> New prefix, opened by `S-ARCH-AUDIT-01-design` (2026-07-02). Groups every `ARCHITECTURE.md`/`STANDARDS.md` rule found stated in prose but not backed by any code/schema check — the audit's finding, not a build gap. Each row below turns a discipline-only rule into a repeatable, automatable check. See `S-ARCH-AUDIT-01-design` in `CLAUDE-STATE.md`/`docs/SESSIONS.md` for the full walk of every LOCKED section (most were already fine — either genuinely discipline-only with no automatable form, or already structurally enforced, e.g. `logAICall()` via the Generic Capability Executor). **Deliberately deferred behind the MI Loop/Charts work** (see `CLAUDE-STATE.md`'s Session Queue) — no SE- item blocks that work.

| ID | Feature | Status | Session |
|----|---------|--------|---------|
| SE-01 | Boundary Enforcement Grep — repo-grep check script covering `ARCHITECTURE.md` §5 ("no capability route calls `/api/rag-query` via internal HTTP — all RAG retrieval imports `queryRAG` from `api/lib/rag.js` directly") and §6 ("no AI calls in Railway backend, no Playwright imports in Vercel `api/`"). Turns the one-time hardcoded-agent-routing grep (run manually 2026-07-02, clean) into a permanent, rerunnable script covering these two boundary rules. | ❌ Missing | S-ARCH-ENFORCE-01 (design required) |
| SE-02 | Shared-Pipeline No-Conditionals Grep — repo-grep check script covering §19's Founding Principle ("no `if(agentId===)` / `if(deliverable_type===)` inside `db-assembly.js`/`ai-enrichment.js`/`request-receivable.js`") and §19b ("`execute.js` contains zero capability-specific logic, ever — no `if(capability_slug===)`"). This is the exact anti-pattern that already caused the `channel-intelligence.js`/`quality-gate.js` drift once (retired via S-CAPABILITY-EXEC-01/02) — a permanent check prevents it recurring silently. **Extended 2026-07-02 (`S-ARCH-AGENT-LOOP-01-design`, `ARCHITECTURE.md` §19d):** scope grows to cover the Agent Loop's two new primitives (`AA-80`) — no agent id or capability slug may appear in a conditional anywhere in the delegate-dispatch or consequential-action-gate code. Same anti-pattern, one level up. | ❌ Missing | S-ARCH-ENFORCE-02 (design required) |
| SE-03 | **Agent Field Enforcement** (formerly "Agent Build Completeness Node Test") — persistent (not delete-before-commit) Node test asserting every entry in `AGENTS` (`src/data/agents.js`) has all 23 required fields (STANDARDS.md §11) plus a matching `AVATAR_CFG` and `AGENT_PRONOUNS` entry. Root cause this closes: Victoria Chen shipped without standard fields and crashed `RosterScreen` on `trainableBy.toUpperCase()` — the rule was written down reactively after the fact and has had zero machine enforcement since. | ❌ Missing | S-ARCH-ENFORCE-03 (design required) |
| SE-04 | Format Skill Exclusivity Data Audit — check script querying live Supabase (`capability_skill_profiles` joined to `skill_profiles` where `skill_type_slug = 'format'`, joined to `agent_capability_assignments`) confirming every Format Skill Profile is assigned only to a display/editor agent (Screen Controls, HTML Display, PDF Assembly), never a content specialist. Enforces STANDARDS.md §13 rule 14 / `ARCHITECTURE.md` §19 ("content specialists never own Format Skills") — currently nothing but discipline stops a future assignment from violating it. | ❌ Missing | S-ARCH-ENFORCE-04 (design required) |
| SE-05 | Serverless Function Count Check Script — wraps the `find api -name "*.js" | grep -v "/_lib/" | wc -l` command (currently run by hand and typed into each kickoff doc) into a small checked script that fails/warns above the Vercel Hobby 12-function ceiling. Trivial, but every kickoff doc references this count manually today with no automated guard. | ❌ Missing | S-ARCH-ENFORCE-05 (design required) |
| SE-06 | Librarian Full-CRUD Enforcement Grep — repo-grep check script asserting no file other than `lib/librarian.js` itself (and Eleanor's own capability dispatch path, once it exists) imports `queryLibrary`/`writeLibrary` or references `lib/librarian.js` at all. Enforces `ARCHITECTURE.md` §19c's "no other agent's capability... touches `the_Library` directly" for **both reads and writes** — a rule this session (`S-APPLE-04a-design`, 2026-07-02) confirmed has already been violated live once (`AA-99`, `ai-enrichment.js`'s direct `queryLibrary()` call) and was nearly built against a second time in the same session before John caught it. Same category as `SE-02` (no-conditionals grep) but for an import boundary instead of a control-flow pattern — prevents this specific mistake from ever landing silently again. | ❌ Missing | S-ARCH-ENFORCE-06 (design required) |

---

## Full Session Order

Moved to `docs/SESSIONS.md` (2026-07-01 cleanup — this table duplicated session history already tracked there). See SESSIONS.md "Full Session Order (archived from FEATURES.md)" section.

---

MI now/next backlog: `docs/FEATURES.md` / `docs/FEATURES-NEXT.md`
Full architecture decisions: `docs/ARCHITECTURE.md`
