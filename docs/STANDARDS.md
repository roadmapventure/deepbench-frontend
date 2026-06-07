# DeepBench v5.1 — Session Standards & Testing

> These are the rules. Every coding session follows them exactly.
> Claude Code is self-contained — it has no memory of previous sessions,
> no Drive access, no awareness of prior conversations.
> Every kickoff doc must be fully self-contained with no external references.

---

## Session Scope Rules

1. One feature per session (one Feature ID or tightly related group)
2. Max 3 files modified per session
3. Max 4 tasks per kickoff doc
4. If Claude Code shows "compacting" — **STOP immediately**, exit, start fresh
5. Node.js test must pass before any commit
6. `npm run build` must pass before any commit
7. Browser console check required after every deploy

**Signs a session is too big:**
- Kickoff doc has more than 4 tasks
- More than 3 files being modified
- Session runs longer than 20 minutes
- Claude Code starts compacting

If too big: split into S[X]a and S[X]b. S[X]a must be QA-closed before S[X]b begins.

---

## Session Naming & Versioning

Session name format: `S[number]-[FEATURE-ID]-[short-name]`
Example: `S08-DB16-completed-tasks`

Sub-session rule:
- S[X]a takes the version it would have gotten as a full session
- S[X]b takes the NEXT increment
- Both must have fully separate kickoff docs

**Version header — line 1 of every .jsx and .js file touched:**
```js
// DeepBench v5.1.X | filename.jsx | brief description
```

**Feature ID comment:**
```jsx
{/* FEATURE: XX-00 — Description */}   // JSX files
// FEATURE: XX-00 — Description         // JS files
```

Branch: commit directly to `dev`. No feature branches.
`dev → main` only when John explicitly confirms.

---

## Mandatory Kickoff Doc Structure

Every kickoff doc must contain these 10 sections in order:

1. **SESSION** header (name, version, branch, files to read first)
2. **CONTEXT** (what the feature does, why it exists)
3. **STUB definitions** if any (e.g. `const MICHELLE = {...}`)
4. **TASKS** (max 4, each with exact code spec)
5. **DESIGN RULES** (tokens, fonts, styling — required for UI sessions)
6. **SCOPE RULES** (what NOT to touch)
7. **NODE.JS TEST** (must run and pass before commit)
8. **CLAUDE CODE VERIFICATION CHECKLIST** (Claude Code completes this)
9. **COMMIT instruction**
10. **MANUAL QA CHECKLIST** (John completes this after deploy)

**Critical:** Every kickoff doc must include:
- Instruction to read `CLAUDE.md` first (list all files to read in Step 0)
- The full Node.js test written out (not referenced — actual code)
- The full verification checklist (copied from this doc)
- All context needed — **no "as discussed" references**
- Design system tokens when UI work is involved

**Do NOT write kickoff docs that say "refer to standards" — Claude Code cannot access this file.**

---

## Node.js Test Requirements

Every session must include a Node.js test file that:
- Tests the core logic before any code is committed
- Uses **no imports from the app** (pure Node.js only)
- Runs with: `node test-[session-id].mjs`
- Is **deleted** before committing
- Must show `ALL TESTS PASS` to proceed

### Test Categories

Pick the relevant categories for the session:

**A. Data Shape Tests**
**B. Logic Tests**
**C. String Safety Tests** — required for any string operations
**D. Component Lifecycle Tests** — required for useEffect / useRef
**E. SessionStore / URL Param Tests** — required for any navigation
**F. Supabase Column Alignment Tests** — required for any DB operations
**G. API Response Tests** — required for any Anthropic API calls
**H. Routing / Navigation Tests** — required for any navigate() calls
**I. Step Merge Logic Tests** — required for any plan regeneration work
**J. UI Stub / Byline Tests** — required for agent presence / attribution UI
   - Verify stub object has all required keys (name, code, initials)
   - Verify no undefined values in any byline state
   - Verify pulsing dot logic: shown in loading states, hidden in static states
   - Verify all label strings compose correctly from stub without inline literals
**K. mergedSteps / Supabase JSONB Tests** — required for mergedSteps/Supabase sessions
**L. API Endpoint Tests** — required for api/ endpoint sessions (live API test)

---

## Claude Code Verification Checklist

Claude Code completes these before committing. Every item must be checked.

### Always Required
- [ ] Version header updated to `vX.X.X` on every file touched
- [ ] `FEATURE: [ID]` comment present in every file touched
- [ ] Node.js test — ALL TESTS PASS
- [ ] `npm run build` — zero errors
- [ ] Zero red errors in browser console (check after Vercel deploy)

### Feature ID Badge Audit (every session)
- [ ] FeatureBadge added for this session's feature ID
- [ ] Badge is inside a wrapper with `position: relative`
- [ ] Badge renders unconditionally OR is on always-visible outer wrapper
- [ ] If section is conditional: badge added to BOTH outer wrapper AND inside section
- [ ] Test with `?debug=features` on dev URL — confirm badge visible

### Component Lifecycle (for any useEffect or useRef)
- [ ] Will this component re-mount? If yes, useRef is NOT safe
- [ ] Run-once guards use context state (survives re-mounts) not useRef
- [ ] useEffect dependency array is correct — list all dependencies
- [ ] No infinite loops — trace what triggers the effect

### Supabase Operations (for any DB read/write)
- [ ] All column names verified against actual schema
- [ ] No columns inserted that don't exist in schema
- [ ] Error handling present (`console.error` only — never block user)
- [ ] Loading state shown while data fetches

### String Safety (for any string operations on data)
- [ ] No raw `.startsWith()` / `.replace()` / `.trim()` on potentially undefined
- [ ] `str()` helper or `typeof` guard applied to all row-derived string calls
- [ ] Tested with null and undefined inputs in Node test

### Navigation / Session Storage (for any navigate() or storage)
- [ ] `sessionStorage.setItem` called synchronously before `navigate()`
- [ ] `q` URL param uses user content not agent content
- [ ] URL debug params stripped from goal/content fields
- [ ] Agent ID resolves to full agent object before use in UI

### Step Color Coding Preservation (for any plan regeneration work)
- [ ] Every step output from `mergeSteps()` retains its `type` field (agent | hitl | subagent)
- [ ] Color rendering tested before AND after a plan regeneration cycle
- [ ] New steps render with brass left border (`#b6873a`)
- [ ] Unchanged steps render normally with existing color coding intact
- [ ] Archived steps render in grey collapsible drawer — no color coding
- [ ] HITL steps remain flag red (`#a83319`) after regeneration
- [ ] Sub-agent steps remain blue after regeneration
- [ ] Agent steps remain brass (`#b6873a`) after regeneration

### Agent Presence / Byline UI (for any agent attribution work)
- [ ] Agent stub defined once per file — no inline string literals
- [ ] Pulsing dot uses `animate-pulse` + brass (`#b6873a`), 4×4px `rounded-full`
- [ ] Dot is removed (not just hidden) when loading state resolves
- [ ] Byline uses Inter `text-xs` — no borders or cards around it
- [ ] All label states tested against stub in Node.js test category J

---

## Browser Test Checklist

Claude Code runs this after every Vercel deploy before reporting back:

1. Open the dev URL
2. Open browser DevTools → Console tab
3. Screenshot console — confirm zero red errors
4. Navigate to the screen being tested
5. Run the feature's specific test steps
6. Test with `?debug=features` — confirm feature ID badge visible
7. Watch the screen for 5 seconds — confirm no loops or flickering
8. Check Network tab for any 4xx/5xx errors

**Dev URL:** `https://deepbench-frontend-git-dev-roadmapventures-projects.vercel.app`

---

## Manual QA Checklist Rules

John runs these after every deploy. This is the final gate — session does not close until all items pass.

- Steps in logical user flow order (navigate → interact → observe)
- Each step = single observable action with clear PASS/FAIL answer
- Specific enough to have a clear PASS/FAIL answer
- Include regression steps for any screen touched
- Maximum 12 steps per session
- Always end with: *"Report back PASS/FAIL/NEW REQUIREMENT for each item"*

If FAIL: Claude writes a patch kickoff doc to fix it before moving on.
If NEW REQUIREMENT: Claude adds it to `docs/FEATURES.md` and the Feature Inventory in Google Drive.
Session only closes when ALL items PASS.

---

## Known Issues Log

| ID | Issue | Root Cause | Fix | Status |
|----|-------|------------|-----|--------|
| POLISH-01 | Update Plan immediate click race — unanswered questions disappear (browser refresh restores) | Stale closure in `handleUpdatePlan` reads `mergedSteps` before `setMergedSteps` from `handleAnswerChange` commits | Add `useRef` to always hold latest `mergedSteps`: `const mergedStepsRef = useRef(mergedSteps); useEffect(() => { mergedStepsRef.current = mergedSteps; }, [mergedSteps]);` then read `mergedStepsRef.current` in `handleUpdatePlan`. File: `TaskInstructionsScreen.jsx` only. | Deferred to S-POLISH-01 |

---

## New Requirements During Build

When a new requirement is discovered during a session:

1. Add to this file under a `## Discovered Requirements` section with format:
   `[FEATURE-ID] | Description — Found: S[X]. Planned session: S[Y]`
2. Claude Code reports it at end of session for John to review
3. John adds it to the Feature Inventory in Google Drive

### Discovered Requirements

| ID | Description | Found | Planned |
|----|-------------|-------|---------|
| DB-16 | Completed task cards clickable | S06 | S08 ✅ Done |
| DB-17 | Task title editable + AI-suggested | S06 | S14 ✅ Done |
| DB-18 | Auto-select best agent when none chosen | S07 | S13 (deferred) |
| AW-15 | Pre-populated goal appends instead of replaces | S05 | post-core |
| AW-16 | Update Plan button wires answers + regenerates | S06 | S09 ✅ Done |
| TI-13 | Step color coding lost after regeneration | BUG | S10a ✅ Fixed |
| SH-10 | React error boundary | S03 | S-future |
