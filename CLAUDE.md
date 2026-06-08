# DeepBench — Claude Code Session Briefing

> **Read this file first, every session, before touching any code.**
> This is the single source of truth for how to work in this codebase.
> Full detail on architecture, standards, and testing lives in `/docs/`.

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

**Current version in dev:** v5.1.17 (commit 8b40037)
**Next session:** S16 — AI Audit implementation
**Do NOT merge dev → main** — John has not confirmed.

**Open blocking question:**
- Q5 (BLOCKS S11): Agent step output destination — A, B, or C. (Decision needed before S11.)
- Q-S16: Architect Checklist tab in AI Audit — in scope for S16 or deferred?

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
