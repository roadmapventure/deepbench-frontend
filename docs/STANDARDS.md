# DeepBench v5.1 — Session Standards & Testing

> These are the rules. Every coding session follows them exactly.
> Last updated: 2026-07-15 | Section 7 corrected — self-verify flow (was stale since 2026-07-02's Automated Design→Code→Verify Loop)

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

**Every session gets a version strictly greater than `CLAUDE-STATE.md`'s current "Version in dev" — never reuse it, even for sessions within the same major-version architecture track.** This broke 2026-07-02: `S-ARCH-AGENT-LOOP-01`, `S-APPLE-02b`, `S-ARCH-PM-BROKER-01`, and `S-ARCH-LOOP-PATCH-01` all stamped `v6.0.0` into their version headers instead of incrementing session-over-session, because nothing in `CLAUDE-DESIGN.md`'s kickoff-doc checklist explicitly said to bump it — the old checklist only said to "confirm current version," not increment past it. Fixed in `CLAUDE-DESIGN.md` Step 4 (explicit version-assignment step) and Step 5c (close-out bump, unchanged instruction but now backstopped by the assignment-time check).

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
3. **AI PATTERN CHECK** — does this feature have an opportunity to use an AI pattern not yet wired in? Name the pattern + service. If N/A, one line is enough (e.g. "N/A — no api/ route touched this session") — do not write a justifying paragraph. Never skip the section itself.
4. **STUB definitions** if any (e.g. `const MICHELLE = {...}`)
5. **TASKS** (max 4, each with exact code spec)
6. **DESIGN RULES** (tokens, fonts, styling — required for UI sessions)
7. **SCOPE RULES** (what NOT to touch)
8. **NODE.JS TEST** (full code written out — not described, not referenced)
9. **CLAUDE CODE VERIFICATION CHECKLIST** — session-specific checks only (see "Standing rules by reference" below)
10. **COMMIT instruction** — must include `git push origin dev` after the commit
11. **MANUAL QA CHECKLIST** (session-specific, max 12 items)

**Standing rules by reference (added 2026-07-01).** Claude Code carries persistent cross-session memory now — the "Claude Code has no memory" premise this rule used to rest on is out of date. A kickoff doc no longer needs to restate a standing rule in full prose; naming it is enough (e.g. "STANDARDS.md Section 11 applies to all 6 agents" instead of re-listing all 23 fields; "Category M applies — see STANDARDS.md Section 5" instead of re-deriving the checklist). This applies specifically to **standing rules** — things that are true every session and don't change: the 23-field agent standard, the AI Audit wiring requirement, the Always Required / Category J/K/L/M checklist items in Section 5, the known bug patterns in Section 8.

It does **not** apply to **session-specific facts** — the exact field values, exact file paths, exact scope boundaries, exact test assertions for *this* session. Those still must be fully spelled out. "As discussed" or "refer to standards" is still forbidden when what's being deferred is content specific to this session, not a standing rule. The test: could Claude Code look this up in `STANDARDS.md`, `docs/ARCHITECTURE.md`, or its own memory and get the exact same answer regardless of which session is running? If yes, reference it. If the answer depends on *this* session's specifics, spell it out.

**Kickoff doc compliance check before issuing:**
- [ ] All 11 sections present
- [ ] Architect Review complete: no duplicate functionality introduced — grepped for existing implementations
- [ ] Architect Review complete: all cross-references verified consistent across every file that shares them
- [ ] Architect Review complete: DB columns verified against actual schema before speccing any read/write
- [ ] Architect Review complete: no layer violations in task specs
- [ ] AI Pattern Check section present — names pattern + service, or one-line N/A
- [ ] Node.js test is full code (not described)
- [ ] Category K tests if touching mergedSteps or Supabase JSONB
- [ ] Category L live API test if touching any api/ endpoint
- [ ] Category M consistency test if touching any cross-referenced data (see Section 4)
- [ ] Verification checklist (Section 9) lists only session-specific checks — standing categories referenced by name, not re-derived
- [ ] Manual QA is session-specific
- [ ] Session-specific facts (values, fields, files, scope) fully spelled out — no "as discussed" for anything that isn't a standing rule
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

**Scoping breadth for Category L when a session applies an already-proven mechanism to more data of the same shape (added 2026-07-02, `S-ARCH-AGENT-LOOP-03`):** a full live multi-turn round trip is required for whatever's genuinely novel in the session — a mechanism path, tool combination, or schema interaction not yet exercised live before. It is not required, one-for-one, for every additional data row that reapplies a mechanism already proven live by a prior session on a structurally identical shape. `S-ARCH-AGENT-LOOP-03` ran 4 full live L-tests (25 min, repeated 55s-timeout retries) when 3 of the 4 (`ci-routing-intent`, `intake-commit-intent`, `intake-failure-intent`) re-exercised the exact `can_request_help`/`request_help` path already proven live twice by `S-ARCH-AGENT-LOOP-02`/`S-ARCH-LOOP-PATCH-02` on the same schema shape — only the 4th (`qg-review-intent`'s novel `delegate_to_agent`-from-`task_context` path) carried real incremental risk. Category F (schema/data alignment, cheap and deterministic) still applies to every row regardless; reserve the expensive full live round trip for the case(s) actually establishing new behavior.

**Loop-closure proof specificity (added 2026-07-08, found during `AA-110`'s investigation into `S-APPLE-05`'s Category L test):** when a live test's pass condition is "does the downstream agent's output reflect a new write," the proof must be uniquely traceable to that specific write — not a generic keyword or theme also reachable from pre-existing seeded content. Root cause: `S-APPLE-05`'s loop-closure check searched Marcus's answer for the word "enablement" as proof his response depended on Elena's new `the_reasoning` write — but "enablement" is an existing theme in the seeded Data Room, so Marcus can (and does) say it from pre-existing content alone, with zero dependency on the new write. A tighter proof checks for content verbatim or near-verbatim to the specific new entry, or a direct citation to that entry's row id (`the_reasoning.id` / `the_library.id`), not a generic subject-matter keyword.

**`delegation_required` intent testing standard (added 2026-07-08, `AA-148`):** any `delegation_required` intent's Category L test must confirm two things, not just one — (a) the final result reaches a proper `final_delegation` shape or a thrown/guarded error, never a bare narration string silently accepted as an ordinary final answer, and (b) if the request checkpoints/resumes mid-flight (forceable deterministically via `__setTestBudgetMs(0)`), the persisted `delegation_required` value on the resulting `durable_hops` row matches the original capability's own trait. Root cause: `AA-142`'s narration guard existed but was live-proven silently inert on any request that checkpointed mid-flight, because `resumeCapability()` hardcoded `delegationRequired: false` — a gap `AA-142`'s own session flagged as accepted/deferred but never live-tested, so it shipped and later fired in production undetected. A Category L test that only exercises the non-checkpointing path cannot catch this class of bug.

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

Complete every item before committing. This is the canonical "standing checklist" — kickoff doc Section 9 references the categories that apply by name (e.g. "Category M applies") instead of re-deriving them; it only spells out checks specific to that session.

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
- [ ] Loop-closure/round-trip live tests check for content uniquely tied to the new write (verbatim phrasing or a direct row-id citation) — not a generic keyword also reachable from pre-existing seeded data
- [ ] `PLAN API: PASS` confirmed in test output
- [ ] `TITLE API: PASS` confirmed (if title.js involved)
- [ ] Retry logic tested: empty → retry → success path confirmed
- [ ] Retry logic tested: empty → retry → empty → error thrown
- [ ] Payload integrity: no `mergeStatus`/`pendingArchive` in `stepsContext`
- [ ] `task.steps` for `stepsContext` is `mergedToSet.active` after Update Plan

**Added 2026-07-07 (John's explicit call — a coding session's own live testing ran to ~22 minutes this way, a real cost against the real Anthropic/Supabase backend, not overhead):** run each live scenario **once** by default. Only repeat a scenario when the session's actual goal is measuring an intermittent-failure rate (state that goal explicitly in the kickoff/report) — not as generic extra assurance after a first pass already succeeded. If a first pass fails on a transient, already-tracked issue (e.g. a known flaky backend call), report it honestly and move on; don't loop retrying to manufacture more confidence than the one real data point provides.

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

**Updated 2026-07-15 — this section was stale since before the 2026-07-02 Automated Design→Code→Verify Loop rule (`CLAUDE-DESIGN.md`) and still said John runs these himself; that hasn't been true for the default flow in weeks.** Default flow: the design session runs this checklist itself, directly against live systems (Supabase, `git status`/`git log`, the dev URL, preview tools for UI), and confirms PASS/FAIL — John is not expected to run it and shouldn't be asked to. Session does not close until all items pass, same as before — it's who runs them that changed, not the gate itself. Only if John starts a coding session manually and pastes a completion report himself does the original "John runs these" path apply.

Rules for writing the checklist itself (unchanged):
- Steps in logical user flow order
- Each step = single observable action with clear PASS/FAIL answer
- Include regression steps for any screen touched
- Maximum 12 steps per session
- Whoever runs it (design session by default) ends with: *"PASS/FAIL/NEW REQUIREMENT for each item"* in the close-out report

**If any QA item FAILS — mandatory root cause protocol (do not skip):**

Before writing a patch kickoff doc, perform a full root cause analysis:
1. Check `https://status.claude.com/api/v2/summary.json` for an incident on Claude API / Claude Sonnet / Claude Code overlapping the failure's timestamp (added 2026-07-07 — Anthropic-side incidents can masquerade as DeepBench bugs; if a matching incident overlaps, log it as the cause and stop — do not root-cause an upstream outage as if it were a code defect)
2. Read the actual error message in full — not just the status code
3. Read every file in the execution path (browser → frontend call site → API handler → package.json → runtime environment)
4. Compare against the working reference implementation (NIGP or equivalent) line by line
5. Identify the deepest root cause — not the closest symptom
6. Confirm the fix addresses the root cause, not just the surface error

Do not patch the call site before checking the server. Do not check the server before checking its dependencies. Do not assume the bug is in the last file you touched.

A bug that fails QA once should not fail QA twice. If it does, the root cause analysis was not deep enough.

If FAIL: write a patch kickoff doc targeting the confirmed root cause only.
If NEW REQUIREMENT: add to `docs/FEATURES.md`.

**Feature inventory Status column vocabulary (added 2026-07-16).** The `Status` column in `docs/FEATURES.md`, `docs/FEATURES-NEXT.md`, and `docs/FEATURES-LATER.md` must be exactly one of `✅ Done`, `🔶 Partial`, or `❌ Missing` — no other text in that cell. Any elaboration (what shipped, what's still open, measured results, caveats) goes in the Feature cell's own prose, which is already the norm for how these rows are written — every row in these files already carries full narrative detail there. Do not append descriptive text to the Status cell itself (e.g. `✅ Fixed and verified`, `✅ Closed`, `✅ Root cause fixed and measured`, `🔶 Partial (visual redesign needed)`). This exists because free-texted status phrasing silently evaded the `session-hygiene` skill's Done-row archival check for weeks — the check only matched the literal string `✅ Done`, so any other completion phrasing never got flagged for archiving to `docs/FEATURES-ARCHIVE.md`. Found 2026-07-16; 12 backlogged rows recovered in one sweep once the check was broadened to match any Status cell starting with `✅` (see `.claude/skills/session-hygiene/SKILL.md` Section 3). When archiving a row to `docs/FEATURES-ARCHIVE.md`, normalize its Status cell to exactly `✅ Done` regardless of what completion phrasing the source row used.

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
| 2026-07-02 | Section 1 strengthened — version must strictly increment every session, never be reused. Root cause: 4 consecutive sessions (`S-ARCH-AGENT-LOOP-01`, `S-APPLE-02b`, `S-ARCH-PM-BROKER-01`, `S-ARCH-LOOP-PATCH-01`) all stamped `v6.0.0` because the kickoff-doc checklist only said to confirm the current version, not increment it. `CLAUDE-DESIGN.md` Step 4 now has an explicit version-assignment step. |
| 2026-07-02 | Category L scoping breadth guidance added — full live round trips required for genuinely novel mechanism paths, not one-for-one for every data row reapplying an already-proven mechanism to a structurally identical shape. Root cause: `S-ARCH-AGENT-LOOP-03` ran 4 full live tests (25 min, repeated 55s-timeout retries) for a 4-row data-only session where 3 rows re-exercised a mechanism already proven live twice by prior sessions — only 1 row (`qg-review-intent`'s `delegate_to_agent`-from-`task_context` path) was actually novel. |
| 2026-07-07 | Mandatory root cause protocol gains Step 1 (renumbering the rest) — check `https://status.claude.com/api/v2/summary.json` for an Anthropic-side incident (Claude API / Claude Sonnet / Claude Code) overlapping the failure's timestamp before doing any code-level root-causing. Root cause: John gets Claude status-page incident emails and had no standing step connecting them to QA-failure diagnosis — an upstream incident could otherwise get root-caused as a DeepBench code defect. |
| 2026-07-08 | Category L strengthened — loop-closure proof specificity requirement. Root cause: `AA-110`/`S-APPLE-05`'s "enablement" keyword check was satisfiable from pre-existing seeded content, not uniquely tied to the new write being tested. |
| 2026-07-16 | Section 7 gains a Status column vocabulary rule — `docs/FEATURES.md`/`FEATURES-NEXT.md`/`FEATURES-LATER.md`'s Status cell must be exactly `✅ Done` / `🔶 Partial` / `❌ Missing`, no appended descriptive text. Root cause: free-texted completion phrasing (`✅ Fixed and verified`, `✅ Closed`, etc.) evaded the `session-hygiene` skill's literal `✅ Done` Done-row check for weeks; 12 rows recovered in a broadened sweep. `session-hygiene` SKILL.md Section 3 updated to match any `✅`-prefixed Status cell going forward. |

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
