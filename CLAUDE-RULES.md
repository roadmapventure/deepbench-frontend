# DeepBench — Rules & Reference
> Read this during a session when you need a specific rule or pattern. Not required at session start.

---

## 1. Versioning

Every session increments the minor version. Current base: **v5.1.x**

Version header — **line 1 of every .jsx and .js file touched:**
```js
// DeepBench v5.1.X | filename.jsx | brief description
```

Feature ID comment:
```jsx
{/* FEATURE: XX-00 — Description */}   // JSX
// FEATURE: XX-00 — Description         // JS
```

Session name format: `S[number]-[FEATURE-ID]-[short-name]`

---

## 2. Session Rules (Non-Negotiable)

1. One feature per session — one Feature ID or tightly related group.
2. Max 3 files modified per session.
3. Max 4 tasks per session.
4. Node.js test must pass before any commit. Run: `node test-[session-id].mjs`
5. `npm run build` must pass before any commit.
6. If compacting starts — STOP. Exit session, start fresh.
7. Never merge `dev → main` without John's explicit sign-off.

Signs a session is too big: kickoff doc has >4 tasks, >3 files, session runs >20 min, or compacting starts. Split into S[X]a and S[X]b.

---

## 3. Design System — Treasury Palette (Locked)

All tokens live in `src/tokens.js`. Never hardcode these values.

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

## 4. Agent Roster

Current roster (20 agents as of v5.3.0) lives in `src/data/agents.js` — read it directly. Do not maintain a hardcoded roster table in this file; it will go stale the next time an agent session ships (this table listed 7 agents and a "Michelle is a stub" note long after both were out of date).

Agent system prompts / capability logic live in Supabase (`agent_configs`, `skill_profiles`, `capabilities`) — NOT hardcoded in `agents.js`. `agents.js` holds identity/display fields only (see STANDARDS.md Section 11 for the required field list).

---

## 5. Three Named Step Operations (Locked — do not change)

```
initializeStepsFromSupabase()    — direct set, no mergeSteps
initializeStepsFromFirstPlan()   — mergeSteps([], new, [])
updateStepsFromPlan()            — mergeSteps(active, new, archived)
```

- `mergeSteps()` is the single source of truth for step state.
- `saveStepsToSupabase()` writes full array including archived.
- `pendingArchive` preserved in all writes — stripped only on user approve.
- Answers persisted on `step.questions[n].a` — not ephemeral state.
- `stepsContext` for LLM strips `mergeStatus`, `pendingArchive`, `title_edited`.

---

## 6. AI Call Standards

| Rule | Requirement |
|------|-------------|
| Model selection | Haiku for classification/routing/short answers. Sonnet only for complex reasoning, ReAct loops, long-form briefings. |
| Structured output | Use Claude tool use / `response_format` for structured data. Never parse free-text JSON. |
| Token budgeting | Every Claude call must have explicit `max_tokens`. |
| Streaming | Only where UX benefit justifies server overhead. Not for routing/classification. |
| `✦ AI` badge | Every AI-touched UI element gets this badge. Deterministic logic does NOT. |

---

## 7. Critical Code Patterns

**String safety** — never raw `.startsWith()` / `.replace()` / `.trim()` on potentially undefined:
```js
// Wrong
row.vendor.startsWith('A')
// Right
str(row.vendor).startsWith('A')
```

**Navigation + sessionStorage** — always synchronous before navigate():
```js
sessionStorage.setItem('key', value);  // MUST be before navigate()
navigate('/destination');
```

**useEffect + useRef** — if component re-mounts, useRef is NOT safe for run-once guards. Use context state instead.

**File upload base64 encoding** — always use `readAsArrayBuffer` → `Uint8Array` → `btoa(binary)`. Never use `readAsDataURL` for binary files (PDF, DOCX). See BUG-9 in `docs/STANDARDS.md`.

**Agent ID** — must resolve to full agent object before use in any UI.

---

## 8. Supabase Schema Reference

**`tasks` table key columns:** `id`, `tenant_id`, `title`, `agent_id`, `type`, `status`, `priority`, `due`, `steps` (JSONB), `mapping` (JSONB), `ai_result` (JSONB), `csv_path`, `has_hitl`

**Storage bucket:** `task-data` — path pattern: `{tenant_id}/{task_id}/{filename}.csv`

**Existing tables:** `knowledge_entries`, `agent_configs`, `agent_run_log` — all have `tenant_id` column.

Always verify column names against actual schema before writing. Never insert columns that don't exist.

---

## 9. Before Every Commit — Checklist

- [ ] Version header updated on every file touched
- [ ] `FEATURE: [ID]` comment present in every file touched
- [ ] Node.js test — ALL TESTS PASS
- [ ] `npm run build` — zero errors
- [ ] FeatureBadge added for this session's feature ID
- [ ] Zero red errors in browser console after Vercel deploy
- [ ] `?debug=features` on dev URL — confirm feature badge visible
- [ ] `docs/FEATURES.md` updated — feature IDs marked ✅ Done with commit hash
- [ ] `docs/STYLE-GUIDE.md` updated — any new style rule added
- [ ] `api/` dependency audit — if any `api/` file modified: verify every import is in `package.json` `dependencies` (not `devDependencies`). See BUG-10.

> ⛔ HARD STOP — Manual QA gate:
> When a coding completion report is pasted, the ONLY valid next action is to present the Manual QA Checklist from Section 10 of the kickoff doc.
> Do NOT update FEATURES.md, do NOT bump the version, do NOT commit.
> Wait for John to report PASS/FAIL. If any item FAILS, generate a patch kickoff doc.

---

## 10. Stack Reference

| Layer | Tech |
|-------|------|
| Frontend | React + Vite → Vercel |
| Backend | Node.js + Playwright → Railway |
| Database | Supabase (tasks, RAG, agent configs, run logs) |
| Storage | Supabase Storage bucket `task-data` |
| AI | Anthropic Claude (Haiku + Sonnet) |
| Embeddings | OpenAI `text-embedding-3-small` |

- Live: `https://deepbench.roadmapventure.com`
- Dev: `https://deepbench-frontend-git-dev-roadmapventures-projects.vercel.app`
- Repos: `roadmapventure/deepbench-frontend` + `roadmapventure/deepbench-backend`

Full standards: `docs/STANDARDS.md`
Full features: `docs/FEATURES.md`
Architecture: `docs/ARCHITECTURE.md`
Style guide: `docs/STYLE-GUIDE.md`
