# DeepBench v5.1 — Session Standards & Testing

> These are the rules. Every coding session follows them exactly.
> Last updated: 2026-06-24 | Section 11 added — agent build completeness standard

---

## Section 1: Session Naming & Versioning

Session name format: `S[number]-[FEATURE-ID]-[short-name]`

Version header — line 1 of every .jsx and .js file touched:
```js
// DeepBench v5.1.X | filename.jsx | brief description
```

Feature ID comment:
```jsx
{/* FEATURE: XX-00 — Description */}   // JSX
// FEATURE: XX-00 — Description         // JS
```

Sub-session rule:
- S[X]a takes its version as normal
- S[X]b takes the NEXT increment
- Both have fully separate kickoff docs

Design sessions carry the same version tag as the coding session whose kickoff doc they produce — e.g. `S-APPLE-01a-design (v5.3.0)` pairs with `S-APPLE-01a (v5.3.0)`. Locked in `CLAUDE-DESIGN.md` ("Standing Rule — Version-Paired Session Naming"), applies from S-APPLE-01a-design (v5.3.0) onward.

Branch: commit directly to `dev`. No feature branches.
`dev → main` only when John explicitly confirms.

---

## Section 2: Session Scope Rules

1. One feature per session
2. Max 3 files modified per session
3. Max 4 tasks per kickoff doc
4. If Claude Code shows "compacting" — **STOP immediately**, exit, start fresh
5. Node.js test must pass before any commit
6. `npm run build` must pass before any commit
7. Browser console check required after every deploy

**Signs a session is too big:** kickoff doc has >4 tasks, >3 files modified, session runs >20 min, or compacting starts. Split into S[X]a and S[X]b.

---

## Section 3: Mandatory Kickoff Doc Structure

Every kickoff doc must have these 11 sections in order:

1. **SESSION** header (name, version, branch, files to read first)
2. **CONTEXT** (what the feature does, why it exists)
3. **AI PATTERN CHECK** — does this feature have an opportunity to use an AI pattern not yet wired in? Name the pattern + service, or mark N/A. Never skip.
4. **STUB definitions** if any (e.g. `const MICHELLE = {...}`)
5. **TASKS** (max 4, each with exact code spec)
6. **DESIGN RULES** (tokens, fonts, styling — required for UI sessions)
7. **SCOPE RULES** (what NOT to touch)
8. **NODE.JS TEST** (full code written out — not described, not referenced)
9. **CLAUDE CODE VERIFICATION CHECKLIST**
10. **COMMIT instruction** — must include `git push origin dev` after the commit
11. **MANUAL QA CHECKLIST** (session-specific, max 12 items)

Claude Code has no memory and no Drive access. Every kickoff doc must be fully self-contained — no "as discussed" or "refer to standards" references.

**Kickoff doc compliance check before issuing:**
- [ ] All 11 sections present
- [ ] Architect Review complete: no duplicate functionality introduced — grepped for existing implementations
- [ ] Architect Review complete: all cross-references verified consistent across every file that shares them
- [ ] Architect Review complete: DB columns verified against actual schema before speccing any read/write
- [ ] Architect Review complete: no layer violations in task specs
- [ ] AI Pattern Check section present — names pattern + service, or explicitly marks N/A
- [ ] Node.js test is full code (not described)
- [ ] Category K tests if touching mergedSteps or Supabase JSONB
- [ ] Category L live API test if touching any api/ endpoint
- [ ] Category M consistency test if touching any cross-referenced data (see Section 4)
- [ ] Manual QA is session-specific
- [ ] No external references
- [ ] Design tokens present if UI work
- [ ] Files to read listed in Step 0

---

## Section 4: Node.js Test Requirements

Every session must include a Node.js test file:
- Pure Node.js only — no app imports
- Run with: `node test-[session-id].mjs`
- Deleted before committing
- Must show `ALL TESTS PASS` to proceed

### Test Categories

**A. Data Shape Tests**
**B. Logic Tests**
**C. String Safety Tests** — required for any string operations on potentially undefined
**D. Component Lifecycle Tests** — required for useEffect / useRef
**E. SessionStore / URL Param Tests** — required for any navigate() or storage
**F. Supabase Column Alignment Tests** — required for any DB operations
**G. API Response Tests** — required for Anthropic API calls
**H. Routing / Navigation Tests** — required for any navigate() calls
**I. Step Merge Logic Tests** — required for any plan regeneration work
**J. UI Stub / Byline Tests** — required for agent presence / attribution UI
- Stub has all required keys (name, code, initials)
- No undefined values in any byline state
- Pulsing dot logic correct: shown in loading, hidden in static
- Label strings compose correctly from stub without inline literals

**K. Component State Initialization Tests** — REQUIRED for any session touching mergedSteps, initial load, Supabase JSONB reads/writes, or pendingArchive. Added after S14/S14p duplicate-step bugs. Non-negotiable.

Mandatory K tests:
- `initializeStepsFromSupabase()` does NOT call `mergeSteps()`
- No duplicate step IDs on initial load (test with 1 step, 3 steps, null, undefined)
- `initializeStepsFromFirstPlan()` calls `mergeSteps([], new, [])`
- `updateStepsFromPlan()` calls `mergeSteps(active, new, archived)`
- `saveStepsToSupabase()` writes FULL array preserving `pendingArchive`
- `handleApprove` strips `pendingArchive` ONLY from approved step
- Round-trip: write → re-read → all data intact
- Active/archived split on load by `mergeStatus` field
- Unanswered HITL detection uses `q.a` (persisted) not ephemeral state
- Label-based dedup (not ID-based) for LLM-generated steps
- Answers snapshot overlaid before unanswered detection fires

**M. Cross-Reference Consistency Tests** — REQUIRED for any session that touches data shared across more than one file: `PATTERN_CATALOG`, `aiPatterns.js` (`AI_PAT` constants, `AGENT_PATTERNS` map), AiBadge label strings, `SERVICE_CATALOG`, `AGENT_NAMES`, `AVATAR_CFG`, `agent_configs` schema, or any shared constant map. Also required for any session that introduces a new constant, slug, or status flag that will be referenced in more than one file.

Mandatory M tests:
- Every pattern slug referenced in `AGENT_PATTERNS` or any AiBadge label exists in `PATTERN_CATALOG`
- Every pattern slug in `PATTERN_CATALOG` with `active: true` is NOT listed in the Platform Roadmap (roadmap only shows `active: false`)
- Every pattern slug in `PATTERN_CATALOG` with `active: false` is NOT listed as a live badge on any currently-executing feature
- Every pattern name in `SERVICE_CATALOG[*].patterns` arrays is `active: true` in `PATTERN_CATALOG` — roadmap-only patterns must not appear in any service's patterns list (root cause of AI-36p: Reflection was removed from AI_PAT labels but remained in SERVICE_CATALOG.patterns for 4 services)
- Every service slug in `SERVICE_CATALOG` with `roadmap: 'now'` has a corresponding live implementation (verified by checking that the relevant `api/` route or inline logic exists)
- No slug, constant, or status value appears with conflicting definitions across the files that reference it
- Any new constant introduced this session is defined in exactly one place and imported everywhere else — never redefined

**L. Live API Integration Tests** — REQUIRED for any session that modifies an `api/` endpoint, modifies code that calls an `api/` endpoint, adds retry logic, or changes any payload sent to an API endpoint. Added after S14p4b — a change to `handleUpdatePlan` caused the planning agent to intermittently return no steps. Pure logic tests cannot catch LLM response shape issues. A live call test catches these before the code ships.

How to run: `node --env-file=.env.local test-[session-id]-api.mjs`
Requires `ANTHROPIC_API_KEY` in `.env.local`. Delete before committing.

Mandatory L tests for any `api/plan.js` change or call site change:
- POST to `/api/plan` with a representative goal and steps
- Confirm response contains a `tool_use` block (not text)
- Confirm `tool_use` block has `input.steps` array
- Confirm `input.steps.length > 0`
- Confirm each step has: `id`, `label`, `type`, `text` fields
- Log `PLAN API: PASS` or `PLAN API: FAIL` explicitly
- If FAIL: do NOT commit — fix the payload first

Mandatory L tests for any `api/extract.js` change or `extractTextFromFile` call site change:
- Real call (or binary round-trip simulation) that verifies high-byte values survive base64 encoding intact
- Confirm `readAsArrayBuffer` + `Uint8Array` → `btoa(binary)` pattern is used — NOT `readAsDataURL`
- Confirm payload keys are `{ fileData, fileType, fileName }` JSON — NOT FormData
- Confirm `fileData` decodes to valid binary (PDF magic bytes `%PDF-` survive round-trip)
- Log `EXTRACT API: PASS` or `EXTRACT API: FAIL` explicitly

Mandatory L tests for any `api/title.js` change:
- Real call with representative goal and steps array
- Confirm response has `taskTitle` (string, non-empty)
- Confirm response has `stepTitles` (array, length matches input)
- Log `TITLE API: PASS` or `TITLE API: FAIL` explicitly

Retry logic tests (when adding retry to any API call):
- Simulate first call returning empty steps — confirm retry fires
- Simulate retry returning valid steps — confirm flow continues
- Simulate both calls failing — confirm error thrown with "after retry"
- Confirm retry uses identical payload to first call
- Confirm retry does not fire when first call succeeds

Payload integrity tests (when stepsContext or payload changes):
- Build full `userMsg` string with test data
- Confirm `stepsContext` includes step label, type, and text
- Confirm `stepsContext` does NOT include `mergeStatus` or `pendingArchive`
- Confirm `answeredQuestions` reads `q.a` not a separate answers object
- Confirm `task.steps` used for `stepsContext` is `mergedToSet.active` (not `stepsToMerge` or raw `newSteps`)

---

## Section 5: Claude Code Verification Checklist

Complete every item before committing.

### Always Required
- [ ] Version header on every file touched
- [ ] `FEATURE: [ID]` comment at every change location
- [ ] Node.js test — ALL TESTS PASS
- [ ] `npm run build` — zero errors
- [ ] Zero red errors in browser console after deploy

### Feature ID Badge Audit (every session)
- [ ] FeatureBadge added for this session's feature ID
- [ ] Badge inside wrapper with `position: relative`
- [ ] Badge renders unconditionally or on always-visible outer wrapper
- [ ] Test with `?debug=features` on dev URL

### Component Lifecycle (for any useEffect or useRef)
- [ ] Will this component re-mount? If yes, useRef is NOT safe
- [ ] Run-once guards use context state (not useRef)
- [ ] useEffect dependency array correct
- [ ] No infinite loops

### Supabase Operations (for any DB read/write)
- [ ] All column names verified against actual schema
- [ ] No columns inserted that don't exist
- [ ] Error handling: `console.error` only — never block user
- [ ] Loading state shown while data fetches

### String Safety (for any string operations on data)
- [ ] No raw `.startsWith()` / `.replace()` / `.trim()` on potentially undefined
- [ ] `str()` helper or `typeof` guard applied
- [ ] Tested with null and undefined in Node test

### Navigation / Session Storage
- [ ] `sessionStorage.setItem` called synchronously before `navigate()`
- [ ] `q` URL param uses user content not agent content
- [ ] Agent ID resolves to full agent object before use in UI

### Step Color Coding Preservation (for any plan regeneration work)
- [ ] Every step output from `mergeSteps()` retains its `type` field
- [ ] Color rendering tested before AND after regeneration cycle
- [ ] New steps: brass left border `#b6873a`
- [ ] HITL steps: flag red `#a83319` after regeneration
- [ ] Sub-agent steps: blue after regeneration
- [ ] Archived steps: grey collapsible drawer
- [ ] Agent steps: brass `#b6873a` after regeneration

### Agent Presence / Byline UI
- [ ] Agent stub defined once per file
- [ ] Pulsing dot: `animate-pulse` + brass `#b6873a`, 4×4px `rounded-full`
- [ ] Dot removed (not just hidden) when loading resolves
- [ ] Byline: Inter `text-xs`, no borders or cards

### Category K — Component State Initialization
- [ ] `initializeStepsFromSupabase()` — no `mergeSteps()` call
- [ ] `initializeStepsFromFirstPlan()` — `mergeSteps([], new, [])`
- [ ] `updateStepsFromPlan()` — `mergeSteps(active, new, archived)`
- [ ] Each operation has its own code path — no sharing
- [ ] `saveStepsToSupabase()` writes full array with archived
- [ ] `pendingArchive` preserved in all writes
- [ ] `handleApprove` strips `pendingArchive` from approved step only
- [ ] Unanswered detection uses answers snapshot not stale state
- [ ] Label-based dedup (not ID-based)
- [ ] Active/archived split on load by `mergeStatus`

### Category M — Cross-Reference Consistency
- [ ] Every pattern slug in AiBadge labels / AGENT_PATTERNS exists in PATTERN_CATALOG
- [ ] No active-false pattern appears as a live badge on a currently-executing feature
- [ ] No now-tier service slug is absent from the codebase (route or inline logic exists)
- [ ] No slug or constant is defined in more than one place with conflicting values
- [ ] Any new constant introduced is defined once and imported — not redefined inline

### Category L — Live API Integration
- [ ] Live API test file written and run before commit
- [ ] `test-[session]-api.mjs` deleted before commit
- [ ] `PLAN API: PASS` confirmed in test output
- [ ] `TITLE API: PASS` confirmed (if title.js involved)
- [ ] Retry logic tested: empty → retry → success path confirmed
- [ ] Retry logic tested: empty → retry → empty → error thrown
- [ ] Payload integrity: no `mergeStatus`/`pendingArchive` in `stepsContext`
- [ ] `task.steps` for `stepsContext` is `mergedToSet.active` after Update Plan

---

## Section 6: Browser Test Checklist

After every Vercel deploy:
1. Open dev URL
2. DevTools → Console → zero red errors
3. Navigate to screen being tested
4. Run feature-specific test steps
5. Test with `?debug=features` — confirm badge visible
6. Watch 5 seconds — no loops or flickering
7. Network tab — no 4xx/5xx errors

**Dev URL:** `https://deepbench-frontend-git-dev-roadmapventures-projects.vercel.app`

---

## Section 7: Manual QA Checklist Rules

John runs these after every deploy. Session does not close until all items pass.

Rules:
- Steps in logical user flow order
- Each step = single observable action with clear PASS/FAIL answer
- Include regression steps for any screen touched
- Maximum 12 steps per session
- Always end with: *"Report back PASS/FAIL/NEW REQUIREMENT for each item"*

**If any QA item FAILS — mandatory root cause protocol (do not skip):**

Before writing a patch kickoff doc, perform a full root cause analysis:
1. Read the actual error message in full — not just the status code
2. Read every file in the execution path (browser → frontend call site → API handler → package.json → runtime environment)
3. Compare against the working reference implementation (NIGP or equivalent) line by line
4. Identify the deepest root cause — not the closest symptom
5. Confirm the fix addresses the root cause, not just the surface error

Do not patch the call site before checking the server. Do not check the server before checking its dependencies. Do not assume the bug is in the last file you touched.

A bug that fails QA once should not fail QA twice. If it does, the root cause analysis was not deep enough.

If FAIL: write a patch kickoff doc targeting the confirmed root cause only.
If NEW REQUIREMENT: add to `docs/FEATURES.md`.

---

## Section 8: Known Bug Patterns (learn from these — test for them explicitly)

| Bug | Root Cause | Fix | Test Category |
|-----|------------|-----|---------------|
| BUG-1: `mergeSteps` called on initial load → duplicate steps | `initializeStepsFromSupabase` called merge instead of direct set | Direct set only, no merge | K initial load |
| BUG-2: `pendingArchive` stripped from Supabase write | `saveStepsToSupabase` wrote active only | Write full array including archived | K round-trip |
| BUG-3: Unanswered HITL detection reads stale React state | `handleUpdatePlan` read state before `setMergedSteps` committed | Build answers snapshot before running detection | K answers snapshot |
| BUG-4: ID-based dedup fails for LLM-regenerated step IDs | LLM generates new IDs each time | Dedup by `label.toLowerCase().trim()` not by ID | K label dedup |
| BUG-5: `task.steps` set to `stepsToMerge` (pre-merge) instead of `mergedToSet.active` (post-merge) → bad `stepsContext` → LLM returns no steps | `setTask` used wrong source | `setTask` uses `mergedToSet.active` for steps field | L payload integrity |
| BUG-6: LLM intermittently returns no steps (no retry) | No retry on empty response | Retry once on empty steps response | L retry logic |
| BUG-7: Ephemeral `answers[q.id]` state lost on refresh | Answers stored in React state only | Persist answers on `step.questions[n].a` in Supabase | K answer persistence |
| BUG-8: Archived steps lost after Update Plan | Save wrote active only | `saveStepsToSupabase` writes `[...active, ...archived]` | K supabase write |
| BUG-9: `extractTextFromFile` 500 on PDF — `readAsDataURL` corrupts binary base64 | `readAsDataURL` is not binary-safe for PDFs; corrupted bytes reach `pdf-parse` and throw | Always use `readAsArrayBuffer` → `Uint8Array` → `btoa(binary)` (NIGP pattern). Never use `readAsDataURL` for file upload. | L binary round-trip |
| BUG-10: `api/extract.js` 500 — "Cannot find package 'pdf-parse'" on Vercel | `pdf-parse` and `jszip` were missing from DeepBench `package.json`. `npm run build` and Node.js tests pass locally because Vite only bundles frontend and local node_modules are available. The gap only surfaces on Vercel at runtime. | Before any session that adds or modifies an `api/` function: audit all `import`/`require` statements in that file and verify every package is listed in `package.json` `dependencies` (not `devDependencies`). | Dependency audit (pre-commit) |

---

## Section 9: S-POLISH-01 — Deferred Known Issues

### Fix 1: Update Plan immediate click race condition

**Symptom:** Answer 1 question, click Update Plan immediately → unanswered questions disappear. Browser refresh restores them.

**Root cause:** Stale closure in `handleUpdatePlan` reads `mergedSteps` before `setMergedSteps` from `handleAnswerChange` commits.

**Fix:** Add `useRef` to always hold latest `mergedSteps`:
```js
const mergedStepsRef = useRef(mergedSteps);
useEffect(() => { mergedStepsRef.current = mergedSteps; }, [mergedSteps]);
```
Then read `mergedStepsRef.current` in `handleUpdatePlan` instead of `mergedSteps`.
3-line change. File: `TaskInstructionsScreen.jsx` only.

**Status:** Deferred — acceptable behavior for now. Fix after all other sessions complete.

---

## Section 10: Change Log

| Date | Change |
|------|--------|
| 2026-06-15 | Architect Review added as mandatory Step 6 in CLAUDE-DESIGN.md kickoff doc generation: duplicate functionality check, cross-reference integrity check, layer violation check, schema alignment check. Category M added — cross-reference consistency tests required for any session touching shared constants, slugs, or status flags across multiple files. Kickoff doc compliance checklist updated with Architect Review gate and Category M requirement. Root cause: AiBadge labels set from SVC design intent without verifying PATTERN_CATALOG active status — Reflection listed on Playbook badge while marked inactive in catalog. |
| 2026-06-15 | AI Pattern Check added as mandatory Section 3 in kickoff doc (11 sections total). Design sessions must check PATTERN_CATALOG + SERVICE_CATALOG before choosing implementation approach. |
| 2026-06-06b | Sub-session versioning, category J |
| 2026-06-06c | Drive scope rule |
| 2026-06-06i | Category K added — component state initialization. Three-operation separation mandated. `saveStepsToSupabase` canonical function mandated. |
| 2026-06-07a | Category L added — live API integration tests. Retry logic test requirements. Payload integrity test requirements. Bug pattern library added (8 patterns). |
| 2026-06-09 | BUG-9 added — `readAsDataURL` binary corruption on PDF extract. `readAsArrayBuffer` + Uint8Array + btoa mandated for all file upload. L test requirements added for api/extract.js. |
| 2026-06-09 | BUG-10 added — missing `pdf-parse` + `jszip` in package.json. Dependency audit rule added: every api/ import must exist in package.json dependencies before commit. |
| 2026-06-24 | Section 11 added — agent build completeness standard. Every agent must ship all 23 required fields + AVATAR_CFG + AGENT_PRONOUNS + Supabase row in one session. No partial entries. Root cause: Victoria Chen shipped without standard fields; RosterScreen crashed on `trainableBy.toUpperCase()`. |
| 2026-06-24 | Section 12 added — canonical model ID standard (BUG-20) and SERVICE_CATALOG roadmap update rule (BUG-22). Root cause: short-form model IDs in logAICall() call sites split model rows in AI Audit; services shipped without updating roadmap field left live services listed in Platform Roadmap. |

---

## Section 11: Agent Build Completeness Standard

Every agent added to `src/data/agents.js` MUST include ALL of the following fields in a single session. No partial entries permitted — a missing field crashes any component that iterates AGENTS.

**Required fields for every agent:**

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Unique slug — matches agents table PK in Supabase |
| `name` | string | Full name |
| `role` | string | Job title |
| `code` | string | Agent code (XX-00) |
| `hiredOn` | string | "Mon YYYY" |
| `trainer` | string | Who trained this agent |
| `arch` | string | Architecture label (e.g. "LLM Planning", "RAG", "Catalog") |
| `specialty` | string | 3 dot-separated specialties |
| `salary` | number | Annual salary |
| `value` | number | Billed value |
| `hourly` | number | Hourly rate |
| `reportHrs` | number | Avg hours per report |
| `reportCost` | number | hourly × reportHrs |
| `docs` | number | Training docs count |
| `classes` | number | Training classes count |
| `chunks` | number | RAG chunks count |
| `skill` | number | Skill score 0–100 |
| `situational` | number | Situational score 0–100 |
| `trainable` | boolean | Whether user can train this agent |
| `trainableBy` | string | Who manages training ("RMV", "NIGP", "None", etc.) |
| `revenueModel` | string | Revenue model label |
| `quip` | string | One-line character quip in double quotes |
| `color` | token | T.brass / T.moss / T.navy / T.muted |

**Also required in the same session:**
- `AVATAR_CFG` entry (skin, hair, collar, extra, border)
- `AGENT_PRONOUNS` entry (subject, object, possessive)
- Supabase `agents` table row (id, name, code, role, specialty, bio, tenant_id)

**Verification before commit:**
- [ ] Navigate to Bench tab — agent card renders without console errors
- [ ] Click agent card — Personnel File opens
- [ ] Zero red errors in DevTools Console

---

## Section 12: Canonical Model ID Standard

### Canonical Anthropic model IDs (always use these exact strings)

| Short-form (DO NOT USE) | Canonical (USE THIS) |
|-------------------------|----------------------|
| `claude-haiku-4-5` | `claude-haiku-4-5-20251001` |
| `claude-sonnet-4-5` | `claude-sonnet-4-6` |

**Rule:** Never use short-form model IDs in `logAICall()` call sites or server-side `ai_activity_log` inserts. Always use the canonical versioned string. `MODEL_ID_NORMALIZE` in `useAIActivity.js` normalizes legacy short-form IDs as a safety net — it is not a license to keep using short-form IDs in new code.

**Why:** The AI Audit panel groups by model string. Short-form and full-version IDs produce two separate rows for the same model, splitting cost and call counts. An AI Transparency screen with fragmented model data or "Unknown provider" labels fails its purpose.

### SERVICE_CATALOG roadmap field rule

When any `api/` route or service capability ships in a coding session, that session MUST update the corresponding `SERVICE_CATALOG` entry in `useAIActivity.js` from `roadmap: 'next'` (or `'later'`) to `roadmap: 'now'` in the same commit.

The Platform Roadmap section of the AI Audit panel shows all services where `roadmap !== 'now'`. A live service appearing in the roadmap is incorrect and will mislead any architect reviewing the panel.

**Add to CLAUDE-DESIGN.md AI Audit wiring checklist:** "SERVICE_CATALOG `roadmap` updated to `'now'` for any service that ships in this session."
