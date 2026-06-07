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
9. **Never compress silently.** If context compression is approaching, STOP immediately and alert John with this exact message:

   > "⚠️ WARNING: Session is approaching compression.
   > Recommend stopping here to preserve context integrity.
   > Current progress: [summarize what was completed this session].
   > Remaining tasks: [list what is not yet done].
   > Start a new session to continue."

   Do NOT proceed with compression. Do NOT compress automatically. Wait for John's response. John will either confirm stop or explicitly say "continue" to override.

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
> For current session state, see docs/SESSIONS.md.

**Current version in dev:** v5.1.17 (commit a72e1bd)
**Next session:** S15a — Dashboard UX Review
**Do NOT merge dev → main** — John has not confirmed.

**Open blocking question:**
- Q5 (BLOCKS S11): Agent step output destination — A, B, or C. (Decision needed before S11.)

---

## 14. NIGP Source Repo — Read-Only Reference

Local path: `C:\Projects\nigp-analyzer`
GitHub: `roadmapventure/nigp-analyzer`
Rule: **READ ONLY — never modify, never commit to this repo.**
Only commit to deepbench-frontend on dev branch.

When porting a feature from NIGP to DeepBench:
1. Read the specified NIGP source file(s) directly
2. Understand the logic, data shapes, and edge cases as-built
3. Adapt to DeepBench patterns before integrating:
   - Replace NIGP tokens/colors with DeepBench Treasury palette (`src/tokens.js`)
   - Replace NIGP component structure with DeepBench conventions
   - Replace NIGP naming conventions with DeepBench naming conventions
   - Add version header and FEATURE comment to every file touched
   - Add ✦ AI badge if the ported feature has any AI-touched elements
4. Never rewrite from scratch — always extract from working NIGP code
5. Node.js test must cover the ported logic before committing
6. If NIGP code references a library not in DeepBench `package.json`, flag it before proceeding — do not install without John's confirmation

---

*Full standards and testing detail: `/docs/STANDARDS.md`*
*Full feature inventory: `/docs/FEATURES.md`*
*Full architecture: `/docs/ARCHITECTURE.md`*

---

## 13. After Every Commit

After every successful commit and push, always do the following without being told:

1. Update the Current Session State in Section 12 of this file — increment the version number to reflect the commit.
2. Commit and push that change to dev with message: `docs: update version state after [session name]`

Do NOT mark a feature as ✅ Done in docs/FEATURES.md until John explicitly confirms QA passed and the session is closed. Features stay at their current status until John says: "Close [FEATURE-ID] — mark complete"

When John says that, update docs/FEATURES.md — change the feature status to ✅ Done and session column to the closed session name, then commit and push with message: `docs: mark [FEATURE-ID] complete`
