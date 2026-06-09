# DeepBench — Claude Code Session Briefing

> **Read this file first, every session, before touching any code.**
> This is the single source of truth for how to work in this codebase.
> Full detail on architecture, standards, and testing lives in `/docs/`.

---

## 0. Session Bootstrap

**At the start of every new session, before doing anything else, ask:**
> "Are we designing or coding?"

**If designing:**
1. Read `C:\Projects\deepbench-frontend\DeepBench-Session-Init.md` and `CLAUDE.md`
2. Execute all steps in the init file
3. Report back:
   - Current version
   - Next session
   - Open blocking questions
4. Ask: "What would you like to work on?"
5. Save the kickoff doc to `docs/kickoffs/[version]-[featureId]-[featureName].md`
6. End the design session with a clearly bordered code block containing the exact build session start prompt:
   ```
   Read CLAUDE.md then read docs/kickoffs/[filename].md and execute it.
   ```
7. Commit and push to `dev`

**If coding:** Read `CLAUDE.md` only and begin immediately.

> **Rule: Every coding session must be preceded by a design session that produces a kickoff doc. No exceptions. Never skip straight to coding.**

---

## 1. What This App Is

**DeepBench v5.1** — AI workforce platform for government procurement intelligence.
- Live: `https://deepbench.roadmapventure.com`
- Dev: `https://deepbench-frontend-git-dev-roadmapventures-projects.vercel.app`
- Owner: John Leonard / Roadmap Venture
- Repos: `roadmapventure/deepbench-frontend` (this repo) + `roadmapventure/deepbench-backend` (Railway)

DeepBench is the platform shell. The NIGP Spend Analyzer is the data analysis engine inside it, reached via task assignment at `/work/[taskId]/analyze`.

---

## 2. Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite, deployed to Vercel |
| Backend | Node.js + Playwright, deployed to Railway |
| Database | Supabase (tasks, RAG, agent configs, run logs) |
| Storage | Supabase Storage bucket `task-data` |
| AI | Anthropic Claude (Haiku for classification/routing, Sonnet for reasoning/briefings) |
| Embeddings | OpenAI `text-embedding-3-small` for RAG |
| Auth | None in Phase 1 — single hardcoded `CURRENT_USER` |

Branch strategy: commit directly to `dev`. **Never merge `dev → main` without John's explicit confirmation.**

---

## 3. Session Rules (Non-Negotiable)

1. **Read `CLAUDE.md` first** — you're doing it now. Good.
2. **One feature per session** — one Feature ID or tightly related group.
3. **Max 3 files modified per session.**
4. **Max 4 tasks per session.**
5. **Node.js test must pass before any commit.** Run: `node test-[session-id].mjs`
6. **`npm run build` must pass before any commit.**
7. **If compacting starts — STOP.** Exit session, start fresh.
8. **Never merge `dev → main`** without John's explicit sign-off.

Signs a session is too big: kickoff doc has >4 tasks, >3 files being modified, session runs >20 min, or compacting starts. Split into S[X]a and S[X]b.

---

## 4. Versioning

Every session increments the minor version. Current base: **v5.1.x**

Version header format — **line 1 of every .jsx and .js file touched:**
```js
// DeepBench v5.1.X | filename.jsx | brief description
```

Feature ID comment format:
```jsx
{/* FEATURE: XX-00 — Description */}   // JSX
// FEATURE: XX-00 — Description         // JS
```

Session name format: `S[number]-[FEATURE-ID]-[short-name]`
Example: `S08-DB16-completed-tasks`

---

## 5. Design System — Treasury Palette (Locked)

All tokens live in `src/tokens.js`. Never hardcode these values — always use the token.

```
Background:  #ddd5be (paperDeep)   #f8f2e2 (card)    #f2ead4 (cardAlt)
Navy:        #12243c  #1a2e4a  #0b1929
Brass:       #b6873a  #886224  #e4c786
Moss:        #5a7538  #a6bc82
Flag red:    #a83319
Muted:       #786d52  #58503a
Lines:       #c8bb9a  #d8cbac
```

Fonts: `Fraunces` (display/serif), `Inter` (body), `JetBrains Mono` (mono/labels)
Corner ornaments: 9px brass SVG, absolute positioned on cards.

---

## 6. Agent Roster (Current — `src/data/agents.js`)

| Code | Name | Role |
|------|------|------|
| JR-01 | Chloe Okafor | Junior Procurement Analyst |
| SR-02 | Mike Alvarez | Senior Procurement Analyst |
| PR-04 | Bob Whitfield | Professional Analyst / Legal |
| MK-05 | Christy Park | Marketing Designer |
| CN-03 | Robyn Castellanos | NIGP Consultant / Strategist |
| DR-06 | Brent Matthews | Web Agent (Railway + Playwright) |
| IR-07 | Pat Smiley | Intern Researcher (isIntern:true, no RAG) |

**Michelle Manning (PP-01)** — to be added in S-BENCH-01. Until then, use only this stub where needed:
```js
const MICHELLE = { name: "Michelle Manning", code: "PP-01", initials: "MM" }
```
Michelle's system prompt lives in Supabase `agent_configs` — NOT in code. Do not hardcode it.

---

## 7. Three Named Step Operations (Locked — do not change)

```
initializeStepsFromSupabase()    — direct set, no mergeSteps
initializeStepsFromFirstPlan()   — mergeSteps([], new, [])
updateStepsFromPlan()            — mergeSteps(active, new, archived)
```

`mergeSteps()` is the single source of truth for step state.
`saveStepsToSupabase()` writes full array including archived.
`pendingArchive` preserved in all writes — stripped only on user approve.
Answers persisted on `step.questions[n].a` — not ephemeral state.
`stepsContext` for LLM strips `mergeStatus`, `pendingArchive`, `title_edited`.

---

## 8. AI Call Standards

| Rule | Requirement |
|------|-------------|
| Model selection | Haiku for classification/routing/short answers. Sonnet only for complex reasoning, ReAct loops, long-form briefings. |
| Structured output | Use Claude tool use / `response_format` for structured data. Never parse free-text JSON. |
| Token budgeting | Every Claude call must have explicit `max_tokens`. |
| Streaming | Only where UX benefit justifies server overhead (task planning, AI Review). Not for routing/classification. |
| `✦ AI` badge | Every AI-touched UI element gets this badge. Deterministic logic (flags, HHI, column detection) does NOT. |

---

## 9. Critical Code Patterns

**String safety** — never raw `.startsWith()` / `.replace()` / `.trim()` on potentially undefined:
```js
// Wrong
row.vendor.startsWith('A')
// Right — use str() helper or typeof guard
str(row.vendor).startsWith('A')
```

**Navigation + sessionStorage** — always synchronous before navigate():
```js
sessionStorage.setItem('key', value);  // MUST be before navigate()
navigate('/destination');
```

**useEffect + useRef** — if component re-mounts, useRef is NOT safe for run-once guards. Use context state instead.

**File upload base64 encoding** — always use `readAsArrayBuffer` → `Uint8Array` → `btoa(binary)`. Never use `readAsDataURL` for binary files (PDF, DOCX). `readAsDataURL` corrupts binary base64 silently. See BUG-9 in `docs/STANDARDS.md`.

**Agent ID** — must resolve to full agent object before use in any UI.

---

## 10. Before Every Commit — Checklist

- [ ] Version header updated (`// DeepBench v5.1.X`) on every file touched
- [ ] `FEATURE: [ID]` comment present in every file touched
- [ ] Node.js test — **ALL TESTS PASS**
- [ ] `npm run build` — zero errors
- [ ] FeatureBadge added for this session's feature ID
- [ ] Zero red errors in browser console after Vercel deploy
- [ ] `?debug=features` on dev URL — confirm feature badge visible
- [ ] `docs/FEATURES.md` updated — this session's feature IDs marked ✅ Done with commit hash, session order table row marked ✅ DONE
- [ ] `docs/STYLE-GUIDE.md` updated — any new style rule or pattern locked this session added to the guide and change log
- [ ] **`api/` dependency audit** — if any `api/` file was added or modified: verify every `import`/`require` in that file is listed in `package.json` `dependencies` (not `devDependencies`). `npm run build` does NOT catch missing serverless deps. See BUG-10.

> ⛔ **HARD STOP — Manual QA gate:**
> When a coding completion report is pasted, the ONLY valid next action is to present the Manual QA Checklist from Section 10 of the kickoff doc.
> Do NOT update FEATURES.md, do NOT bump the version, do NOT commit close-out docs, do NOT summarize the session as done.
> Wait for John to report PASS/FAIL on every item. If any item FAILS, generate a patch kickoff doc. Close only after all items PASS.

---

## 11. Supabase Schema Reference

**`tasks` table key columns:** `id`, `tenant_id`, `title`, `agent_id`, `type`, `status`, `priority`, `due`, `steps` (JSONB), `mapping` (JSONB), `ai_result` (JSONB), `csv_path`, `has_hitl`

**Storage bucket:** `task-data` — path pattern: `{tenant_id}/{task_id}/{filename}.csv`

**Existing tables:** `knowledge_entries`, `agent_configs`, `agent_run_log` — all have `tenant_id` column.

For any Supabase operation: verify column names against actual schema before writing. Never insert columns that don't exist.

---

## 12. Current Session State

> **This section should be updated at the end of each session.**
> For the definitive session queue, see Google Drive Session Queue doc.
> Current Queue Doc ID: `1izzrv7pF7lLZSAlV-AAwWLVh_uGKGrNGioqva1YXSn4`

**Current version in dev:** v5.1.25
**Next session:** S-MIGRATE-04 — Edit Course inline sub-view → `Read CLAUDE.md then read docs/kickoffs/v5.1.26-PE11-edit-course.md and execute it.`
**Architecture:** `docs/ARCHITECTURE.md` — north star document, written S-ARCH-01 — read before any structural work
**Do NOT merge dev → main** — John has not confirmed.

**Open blocking question:**
- Q5 (BLOCKS S11): Agent step output destination — A, B, or C. (Decision needed before S11.)

**Known gaps confirmed 2026-06-08 (post S-MIGRATE-01b manual test):**
- Training tab: load/toggle/delete wiring + NIGP card layout → S-MIGRATE-02
- Training tab: Add Courses inline sub-view → S-MIGRATE-03 (design done ✓)
- Training tab: Edit Course inline sub-view → S-MIGRATE-04 (needs design session)
- Playbook tab: all buttons non-functional → S-MIGRATE-05 (needs design session)
- Resume tab: confirmed working ✓
- Future session needed: **S-BENCH-UX-01** — full Bench UI review (Roster + Personnel File polish punch list). Schedule after S-MIGRATE-02 when all tabs are live.

**Migration decisions locked 2026-06-08 (S-MIGRATE-UX design session):**
- NIGP and DeepBench share the same Supabase instance (confirmed via env vars)
- Migration approach: design-first (Option B) — never import NIGP file structure; port only live API wiring logic
- All existing API endpoints needed for migration already exist in DeepBench: `/api/load-entries`, `/api/agent-configs`, `/api/ingest`, `/api/extract`, `/api/brief`, `/api/rag-query`
- Session chain: S-MIGRATE-UX (done) → S-MIGRATE-01-design (done) → S-MIGRATE-01a (done, 621eb31) → S-MIGRATE-01b (done, 8660e42) → S-MIGRATE-02 (next) → S-MIGRATE-03 → S-MIGRATE-04 → S-MIGRATE-05 → S-BENCH-UX-01
- ResumeTab pattern (ConfigCard + AddConfigForm + apiGetConfigs/apiPatchConfig/apiDeleteConfig) is the proven model — Playbook tab follows same pattern

**UX decisions locked 2026-06-08 (S-MIGRATE-UX — full detail in docs/kickoffs/S-MIGRATE-UX-design-notes.md):**
- Roster: illustrated SVG avatars, 5-stop labeled skill bar, DeepBench headline preserved ("Your bench."). "Add a Player" moves to subtle `+` in stats strip. Vacancy card stays as primary /bench/new entry point. "Test My Team" removed → documented as WK-XX for future.
- Personnel File: left-sidebar nav layout. 2 nav groups only: OVERVIEW (Profile) + CONFIGURE (Resume, Training, Playbook). No OPERATE section. "Assignments" and "Completed Projects" become sections on Profile tab (mock data).
- S-MIGRATE-01 scope: visual port only (RO-04, PE-07, PE-08, PE-09) — done.
- S-MIGRATE-02 scope: data wiring (PE-03 Training live add/edit/delete, PE-04 Playbook live CRUD)
- Future (not in S-MIGRATE-01/02): Training inline Teach+Test sub-views deprecate TeachScreen + TestTeamScreen; Assignments/Completed live wiring; S-BENCH-UX-01 UI polish review

**Architecture decisions made 2026-06-08 (not yet in ARCHITECTURE.md — S-ARCH-01 will write it):**
- Four-layer architecture locked: Shared Foundation / Product Modules / Agent Capability Services / Platform Services
- Capability Spectrum Model adopted: capabilities are independent of agents, have measurable depth levels (1–4), are assignable to agents, and are the product nucleus
- Per-agent LLM assignment + BYOK planned for S-INFRA-01
- Service adapter layer required for all external vendor calls (vendor portability)
- NIGP migration precedes S-BENCH-01 — new session S-MIGRATE-01 added
- Full session order revised — see arch-design-notes.md Section 10

---

## 13. Key File URLs (for Claude.ai fetching)

> Claude.ai fetches these directly via raw GitHub URL.
> Claude Code updates this list whenever files are added, renamed, or deleted.
> Base: https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/

### Screens
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/src/screens/AnalyzerScreen.jsx
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/src/screens/AssignWorkScreen.jsx
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/src/screens/BenchNewScreen.jsx
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/src/screens/DashboardScreen.jsx
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/src/screens/FetchScreen.jsx
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/src/screens/PersonnelScreen.jsx
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/src/screens/RosterScreen.jsx
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/src/screens/TaskInstructionsScreen.jsx
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/src/screens/TeachScreen.jsx
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/src/screens/TestTeamScreen.jsx
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/src/screens/analyzer/AIReviewTab.jsx
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/src/screens/analyzer/LocalSpendTab.jsx
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/src/screens/analyzer/VendorDiversityTab.jsx
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/src/screens/personnel/ResumeTab.jsx

### Components
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/src/components/AIActivityPanel.jsx
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/src/components/AIDiamond.jsx
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/src/components/DebugOverlay.jsx
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/src/components/MichelleAvatar.jsx
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/src/components/SharedUI.jsx
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/src/components/StepList.jsx
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/src/components/ui.jsx

### Data & Config
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/src/data/agents.js
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/src/tokens.js
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/src/main.jsx
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/src/AppShell.jsx

### API Routes
*(no `src/api/` directory exists — backend routes live in `deepbench-backend/src/server.js`)*

---

*Full standards and testing detail: `/docs/STANDARDS.md`*
*Full feature inventory: `/docs/FEATURES.md`*
*Full architecture: `/docs/ARCHITECTURE.md`*
*UI style guide (tokens, badges, patterns): `/docs/STYLE-GUIDE.md`*
