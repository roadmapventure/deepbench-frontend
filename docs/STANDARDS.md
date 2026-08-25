# DeepBench — Session Standards & Testing

> These are the rules. Every coding session follows them exactly.
> (Header de-versioned 2026-08-23 — a hardcoded version/date in a title is the stale-version-in-prose pattern; the current version lives in `CLAUDE-STATE.md`. Change history: git log on this file.)

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

**Every session gets a version strictly greater than `CLAUDE-STATE.md`'s current "Version in dev" — never reuse it, even for sessions within the same major-version architecture track.** Enforced by `CLAUDE-DESIGN.md` Step 4 (explicit version-assignment step) and Step 5c (close-out bump, unchanged instruction but now backstopped by the assignment-time check). History: `docs/SESSIONS.md`.

Branch: every session works on its own `session/<name>` worktree branch (branched from
`origin/dev`) and lands work with `git push origin HEAD:dev` — see `CLAUDE.md`'s hard rules.
*(Corrected 2026-08-23: the old "commit directly to `dev`, no feature branches" wording
predates the 2026-07-07 worktree discipline.)*
`dev → main` only when John explicitly confirms.

---

## Section 2: Session Scope Rules

1. One feature per session
2. Max 3 files modified per session
3. Max 4 tasks per kickoff doc
4. If Claude Code shows "compacting" — **STOP immediately**, exit, start fresh
5. Node.js test must pass before any commit — for any Category K or M session, the suite must also pass (SES-009a). **The specced command is `node --env-file-if-exists=.env.local tests/regression/run-all.js`** (`SES-61`, `v7.0.253`). Three rules on invoking it, the first two from real false results found 2026-07-28 (`SES-28`), the third from one found 2026-07-29 and re-measured 2026-08-25:
   - **`run-all.js` is the gate — never spec `node tests/regression/<file>.js` as the suite check** in a kickoff doc, runbook, or checklist. Each test file now self-runs when invoked directly (`SES-28`), so a bare invocation is real rather than vacuous, but only `run-all.js` runs all of them. (history: `docs/SESSIONS.md`)
   - **Run it against current dependencies.** A worktree has no `node_modules` of its own and resolves up to the shared checkout's tree, which may predate `package-lock.json` — run `npm install` in the worktree first. (history: `docs/SESSIONS.md`)
   - **Give it credentials, or it can go green having verified nothing that needs them.** A test half needing `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` declares itself not-run and its file still reports `[PASS]`. **Measured live 2026-08-25 by runner cycle `860efe52`, on a real failure rather than a hypothetical:** the bare command reported **`68/68 passed`** while the credentialed command on the identical tree reported **`67/68`** — `SES-177-claude-state-renderer.js` was failing on real `CLAUDE-STATE.md` drift, and the specced invocation could not see it. `SES-180` (b)'s **`NOT A FULL RUN:`** line announces the gap; it is deliberately **not** a failure (gating on it would paint CI permanently red where credentials are absent), so reading that line is the reader's job and this rule is what makes the credentials available in the first place.
     - **Use `--env-file-if-exists=`, never bare `--env-file=`.** This is not style. `node --env-file=.env.local` **hard-errors** (`node: .env.local: not found`) wherever the file is absent — which is *every* unattended cloud runner cycle, since `.env.local` is git-ignored and never exists in a fresh clone. So the obvious form of this fix breaks the environment that runs the suite most often. Both arms verified on Node 22.22 rather than assumed: missing file → `not found. Continuing without it.` and the run proceeds; present file → the variables load.
     - **Credentials are not the same thing as spend.** Halves that cost real money stay gated on their own explicit flag (`DAT-12`'s `DAT12_LIVE_CHI`, two ~60 s LLM journeys) and this rule does not turn them on. A couple of REST reads should always run; a paid journey should not run because someone passed a credentials flag.
     - Where credentials come from an exported environment instead of a file (a runner cycle reading `runner_secrets`), the flag is a harmless no-op and the halves run anyway. Secrets are read by name and exported; they never go into a committed file.
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
10. **COMMIT instruction** — must include `git push origin HEAD:dev` after the commit (never bare `git push origin dev` — canonical statement and rationale: `CLAUDE.md`'s "Push with `HEAD:dev`, never bare `dev`" hard rule)
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
- [ ] Verification checklist (kickoff doc section 9 above, not STANDARDS.md Section 9) lists only session-specific checks — standing categories referenced by name, not re-derived
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

**Persistence (added 2026-07-21, SES-009a):** any Category K test written this session is also persisted as a new file in `tests/regression/`, named `<feature-id>-<slug>.js`, importing the real implementation under test (never a hardcoded reimplementation) — unlike the session's own inline test, this file is never deleted.

**M. Cross-Reference Consistency Tests** — REQUIRED for any session that touches data shared across more than one file: `PATTERN_CATALOG`, `aiPatterns.js` (`AI_PAT` constants, `AGENT_PATTERNS` map), AiBadge label strings, `SERVICE_CATALOG`, `AGENT_NAMES`, `AVATAR_CFG`, `agent_configs` schema, or any shared constant map. Also required for any session that introduces a new constant, slug, or status flag that will be referenced in more than one file.

Mandatory M tests:
- Every pattern slug referenced in `AGENT_PATTERNS` or any AiBadge label exists in `PATTERN_CATALOG`
- Every pattern slug in `PATTERN_CATALOG` with `active: true` is NOT listed in the Platform Roadmap (roadmap only shows `active: false`)
- Every pattern slug in `PATTERN_CATALOG` with `active: false` is NOT listed as a live badge on any currently-executing feature
- Every pattern name in `SERVICE_CATALOG[*].patterns` arrays is `active: true` in `PATTERN_CATALOG` — roadmap-only patterns must not appear in any service's patterns list (root cause of AI-36p: Reflection was removed from AI_PAT labels but remained in SERVICE_CATALOG.patterns for 4 services)
- Every service slug in `SERVICE_CATALOG` with `roadmap: 'now'` has a corresponding live implementation (verified by checking that the relevant `api/` route or inline logic exists)
- No slug, constant, or status value appears with conflicting definitions across the files that reference it
- Any new constant introduced this session is defined in exactly one place and imported everywhere else — never redefined

**Persistence (added 2026-07-21, SES-009a):** any Category M test written this session is also persisted as a new file in `tests/regression/`, same convention as Category K above.

**L. Live API Integration Tests** — REQUIRED for any session that modifies an `api/` endpoint, modifies code that calls an `api/` endpoint, adds retry logic, or changes any payload sent to an API endpoint. Pure logic tests cannot catch LLM response shape issues; a live call test catches these before the code ships.

**Current rule, consolidated 2026-07-21 (`SES-005`) from 4 previously-separate dated amendments — full history/rationale for each in git blame, not restated here:**
- **Scoping breadth:** a full live round trip is required only for what's genuinely novel in the session — a mechanism path, tool combination, or schema interaction not yet exercised live before. It is not required, one-for-one, for every additional data row reapplying an already-proven mechanism on a structurally identical shape. Category F (schema/data alignment) still applies to every row regardless.
- **Loop-closure proof specificity:** when a live test's pass condition is "does the downstream agent's output reflect a new write," the proof must be uniquely traceable to that specific write — content verbatim/near-verbatim to the new entry, or a direct citation to its row id — never a generic keyword also reachable from pre-existing seeded content.
- **`delegation_required` intent standard:** any `delegation_required` intent's Category L test must confirm (a) the final result reaches a proper `final_delegation` shape or a thrown/guarded error, never a bare narration string accepted as an ordinary final answer, and (b) if the request checkpoints/resumes mid-flight (forceable via `__setTestBudgetMs(0)`), the persisted `delegation_required` value on the resulting `durable_hops` row matches the original capability's own trait.

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
- [ ] **A Skill's instruction text and its output schema change together** — any session adding, removing or renaming a field an agent is told to produce must edit **both** `skill_profiles.method`/`objective` **and** `traits.schema` (`properties` *and* `required`), then prove the field arrives with one real live call. *(Added 2026-07-29, `AGT-36b`.)* An instruction naming a field the schema does not declare is one the model structurally cannot obey, and **every string-level check still passes** — the `method` text greps clean, the build is green, the unit tests are green, and the missing field only shows up as a `undefined` in live output. (history: `docs/SESSIONS.md`)
- [ ] **Every Manual QA item tests only the change under test.** *(Added 2026-07-29, `S-SES-62`.)* Before issuing a kickoff, read each QA item and ask what would have to be true for it to pass. If any item also depends on a *different* row's behavior, it is that row's acceptance criterion, not this one's — move it there and say so. An item that bundles two or three tickets' behavior makes a correct, shipped fix look unverifiable, and the honest-looking response is to leave the row open indefinitely. Corollary, same session: **do not size a blocker from two samples.** Run `CLAUDE-DESIGN.md` Step 4's generalization counter-example check against a *severity* claim too, not only a scope-narrowing one. (history for both: `docs/SESSIONS.md`)

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
- [ ] All mandatory K tests (Section 4) pass — see Section 4 for the full list
- [ ] Persisted copy added to `tests/regression/`, the suite passes — **invoked per Section 2 rule 5**, which is where the command and its three invocation rules live (`SES-61`: a bare `node tests/regression/run-all.js` skips every credential-gated half and still reports PASS)

### Category M — Cross-Reference Consistency
- [ ] All mandatory M tests (Section 4) pass — see Section 4 for the full list
- [ ] Persisted copy added to `tests/regression/`, the suite passes — **invoked per Section 2 rule 5**, which is where the command and its three invocation rules live (`SES-61`: a bare `node tests/regression/run-all.js` skips every credential-gated half and still reports PASS)
- [ ] `node scripts/check-ai-logging-coverage.js` run and reviewed for any session adding or touching a real LLM/embedding call site — new CRITICAL findings must be resolved before commit; new WARNING findings must at least be looked at and either fixed or explicitly logged as a follow-up ID, not silently ignored

### Category L — Live API Integration
- [ ] Live API test file written and run before commit — asserts against Section 4's mandatory test lists for whichever endpoint(s) this session touches
- [ ] `test-[session]-api.mjs` deleted before commit
- [ ] Loop-closure/round-trip live tests check for content uniquely tied to the new write (Section 4) — not a generic keyword

**Added 2026-07-07 (John's explicit call — a coding session's own live testing ran to ~22 minutes this way, a real cost against the real Anthropic/Supabase backend, not overhead):** run each live scenario **once** by default. Only repeat a scenario when the session's actual goal is measuring an intermittent-failure rate (state that goal explicitly in the kickoff/report) — not as generic extra assurance after a first pass already succeeded. If a first pass fails on a transient, already-tracked issue (e.g. a known flaky backend call), report it honestly and move on; don't loop retrying to manufacture more confidence than the one real data point provides.

---

## Section 6: Browser Test Checklist

**Rewritten 2026-07-28 (`SES-015`, v6.3.209).** This section used to open *"After every Vercel deploy:"* — an assumption that does not hold. A push to `dev` is not a deploy.

### Step 0 — Confirm the preview is current (before every other step)

```
node scripts/check-deploy-current.js
```

**It must exit 0.** A non-zero exit means **stop**: do not run any of the remaining checks, and do not report PASS or FAIL for the feature. A run against a stale preview is not a weaker result, it is a result about a different build — and it is indistinguishable from a real one in either direction, so it can fake a green just as easily as a red.

Exit codes: `0` the serving deployment contains your commit · `1` not covered (stale preview / no build fired / poll budget expired) · `2` the check could not run at all (no `VERCEL_TOKEN`, Vercel API unreachable). **Exit 2 is not a pass** — the deploy was never checked.

Useful arguments: `--worktree=<path>` (default `process.cwd()`), `--sha=<sha>` (default `HEAD`), `--timeout=<seconds>` (default 300), `--json`.

Coverage is an **ancestor** test, not equality: the gate passes when the serving commit *contains* yours. With 5–7 concurrent sessions the deployed tip is normally ahead of your commit, and an equality check would fail almost always — a gate that fails almost always gets ignored within a day.

### Why this is step 0 — the measured reality

Measured across the 156 commits on `origin/dev` since 2026-07-28 12:00 CST, against every `dev` deployment Vercel actually produced: median commit→build lag **37 s**, p90 **852 s** (14 min), max **2,973 s** (49.5 min), **44/156 (28%)** waiting >5 min, **31/156 (20%)** waiting >10 min — plus a ~46-minute window that produced no `dev` build at all. Full table and history: `docs/SESSIONS.md`.

### Two QA paths, different sufficiency — do not collapse them

| QA path | Edge cache? | What is sufficient |
|---|---|---|
| `api/` route (e.g. the CHI regression driver's `POST /api/capabilities/execute`) | **No** — measured `X-Vercel-Cache: MISS` on POST | The step 0 SHA gate alone |
| Frontend screen (visual QA) | **Yes** — measured `X-Vercel-Cache: HIT`, `Age: 298`; `Cache-Control: no-cache` and `Pragma: no-cache` both failed to bust it | The SHA gate **plus** the bundle-grep second layer below |

### Frontend second layer — bundle grep

The edge cache on the HTML document is real and header-proof, so for **frontend visual QA only**, after step 0 passes, also confirm the bundle you are actually served contains your change:

1. Fetch `location.origin` with `{ cache: 'reload' }`.
2. Extract the bundle path with `assets/index-[A-Za-z0-9_-]+\.js`.
3. Fetch that asset and assert it `.includes('<a string unique to your change>')`.

JSX prop names survive minification and make reliable markers. (This supersedes `docs/BETA.md` §2b's prescription, which listed bundle-grep *alone* — insufficient for the serverless regression path it was listed to protect, because that driver calls a function and there is no static asset to grep.)

### When step 0 fails

A manual API trigger is not available on this plan — `POST /v13/deployments` returns **402 Payment Required**. Waiting does not help once nothing is queued (observed to persist 46 minutes). The working remedy is to push another commit, which triggers a build containing yours:

```
git -C "<worktree>" commit --allow-empty -m "chore: poke Vercel dev webhook (no build fired for <sha7>)"
git -C "<worktree>" push origin HEAD:dev
```

The script prints this remedy itself on the `no-build-fired` verdict.

### Browser steps (only after step 0 exits 0)

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
If NEW REQUIREMENT: file it as a `public.backlog_items` row per `docs/runbooks/session-setup.md` step 3c (never a `docs/FEATURES*.md` edit — those are legend-only stubs).

**Feature inventory Status column vocabulary (added 2026-07-16).** The `Status` column in `docs/FEATURES.md`, `docs/FEATURES-NEXT.md`, and `docs/FEATURES-LATER.md` must be exactly one of `✅ Done`, `🔶 Partial`, or `❌ Missing` — no other text in that cell. Any elaboration (what shipped, what's still open, measured results, caveats) goes in the Feature cell's own prose, which is already the norm for how these rows are written — every row in these files already carries full narrative detail there. Do not append descriptive text to the Status cell itself (e.g. `✅ Fixed and verified`, `✅ Closed`, `✅ Root cause fixed and measured`, `🔶 Partial (visual redesign needed)`). It exists because free-texted phrasing evaded the `session-hygiene` skill's Done-row archival check — history: `docs/SESSIONS.md`. When archiving a row to `docs/FEATURES-ARCHIVE.md`, normalize its Status cell to exactly `✅ Done` regardless of what completion phrasing the source row used.

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
| BUG-10: `api/extract.js` 500 — "Cannot find package 'pdf-parse'" on Vercel | `pdf-parse` and `jszip` were missing from DeepBench `package.json`. `npm run build` and Node.js tests pass locally because Vite only bundles frontend and local node_modules are available. The gap only surfaces on Vercel at runtime. | Before any session that adds or modifies an `api/` function: run `node scripts/check-api-deps.js` (added `SES-010`, mechanizes this exact audit — every `api/` import checked against `package.json` `dependencies`, exit 1 on any CRITICAL finding). | Dependency audit (pre-commit) |

---

## Section 9: Retired — moved to backlog (2026-07-21, `SES-005`)

**This numbered slot is intentionally kept, not renumbered** — `CLAUDE-DESIGN.md` and other docs cite "STANDARDS.md Section 11/12" by number; removing this slot would silently invalidate every such cross-reference. The content previously here (`S-POLISH-01`'s deferred "Update Plan immediate click race condition" fix) was a stale bug-tracking entry embedded in a general standards doc, not a standard — it now lives as `PRO-1` in `docs/FEATURES-LATER.md`, the first real usage of the `PRO-` prefix per `docs/SCREEN-INVENTORY.md`'s Task Instructions → Project Management mapping.

---

## Section 10: Change Log

**Root-cause narratives for these entries moved 2026-08-01 (`SES-68`) — history: `docs/SESSIONS.md`.** Every dated change statement below is unchanged; only the "Root cause: …" tails were relocated verbatim.

| Date | Change |
|------|--------|
| 2026-06-15 | Architect Review added as mandatory Step 6 in CLAUDE-DESIGN.md kickoff doc generation: duplicate functionality check, cross-reference integrity check, layer violation check, schema alignment check. Category M added — cross-reference consistency tests required for any session touching shared constants, slugs, or status flags across multiple files. Kickoff doc compliance checklist updated with Architect Review gate and Category M requirement. |
| 2026-06-15 | AI Pattern Check added as mandatory Section 3 in kickoff doc (11 sections total). Design sessions must check PATTERN_CATALOG + SERVICE_CATALOG before choosing implementation approach. |
| 2026-06-06b | Sub-session versioning, category J |
| 2026-06-06c | Drive scope rule |
| 2026-06-06i | Category K added — component state initialization. Three-operation separation mandated. `saveStepsToSupabase` canonical function mandated. |
| 2026-06-07a | Category L added — live API integration tests. Retry logic test requirements. Payload integrity test requirements. Bug pattern library added (8 patterns). |
| 2026-06-09 | BUG-9 added — `readAsDataURL` binary corruption on PDF extract. `readAsArrayBuffer` + Uint8Array + btoa mandated for all file upload. L test requirements added for api/extract.js. |
| 2026-06-09 | BUG-10 added — missing `pdf-parse` + `jszip` in package.json. Dependency audit rule added: every api/ import must exist in package.json dependencies before commit. |
| 2026-06-24 | Section 11 added — agent build completeness standard. Every agent must ship all 23 required fields + AVATAR_CFG + AGENT_PRONOUNS + Supabase row in one session. No partial entries. |
| 2026-06-24 | Section 12 added — canonical model ID standard (BUG-20) and SERVICE_CATALOG roadmap update rule (BUG-22). |
| 2026-07-02 | Section 1 strengthened — version must strictly increment every session, never be reused. `CLAUDE-DESIGN.md` Step 4 now has an explicit version-assignment step. |
| 2026-07-02 | Category L scoping breadth guidance added — full live round trips required for genuinely novel mechanism paths, not one-for-one for every data row reapplying an already-proven mechanism to a structurally identical shape. |
| 2026-07-07 | Mandatory root cause protocol gains Step 1 (renumbering the rest) — check `https://status.claude.com/api/v2/summary.json` for an Anthropic-side incident (Claude API / Claude Sonnet / Claude Code) overlapping the failure's timestamp before doing any code-level root-causing. |
| 2026-07-08 | Category L strengthened — loop-closure proof specificity requirement. |
| 2026-07-28 | Section 6 rewritten (`SES-015`, v6.3.209) — `node scripts/check-deploy-current.js` becomes step 0 of every browser test, and a non-zero exit stops the run rather than warning. Canonical statement of the rewritten rule — including the two-path sufficiency split, the 402 / poke-commit remedy, and the `docs/BETA.md` §2b supersession — is Section 6 itself; root cause: `docs/SESSIONS.md`. |
| 2026-07-16 | Section 7 gains a Status column vocabulary rule — canonical statement is Section 7; root cause: `docs/SESSIONS.md`. `session-hygiene` SKILL.md Section 3 updated to match any `✅`-prefixed Status cell going forward. |

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

**Mechanized 2026-07-21 (`SES-010`).** `node scripts/check-model-ids.js` sweeps `api/`, `lib/`, and `src/` for this exact pattern — flags any short-form id used as a value (not a `MODEL_ID_NORMALIZE`-style lookup key), CRITICAL for server-side (a possible real API-call bug, not just a logging one), WARNING for client-side. Run before commit on any session touching a `model:` field. First run (2026-07-21) found live, pre-existing violations: `api/brief.js` and `lib/agent-run.js` both pass `"claude-sonnet-4-5"` as a real server-side call value, and `src/contexts/FetchContext.jsx`'s `logAICall()` call site uses `"claude-haiku-4-5"`. Not fixed by this session — flagged for whoever picks up the fix.

**Why:** The AI Audit panel groups by model string. Short-form and full-version IDs produce two separate rows for the same model, splitting cost and call counts. An AI Transparency screen with fragmented model data or "Unknown provider" labels fails its purpose.

### SERVICE_CATALOG roadmap field rule

When any `api/` route or service capability ships in a coding session, that session MUST update the corresponding `SERVICE_CATALOG` entry in `useAIActivity.js` from `roadmap: 'next'` (or `'later'`) to `roadmap: 'now'` in the same commit.

The Platform Roadmap section of the AI Audit panel shows all services where `roadmap !== 'now'`. A live service appearing in the roadmap is incorrect and will mislead any architect reviewing the panel.

**Add to CLAUDE-DESIGN.md AI Audit wiring checklist:** "SERVICE_CATALOG `roadmap` updated to `'now'` for any service that ships in this session."

---

## Section 13: Canonical Test-Engine Vocabulary

**Settled by John 2026-07-29 (`design-ses-57`). Sweep tracked by `SES-60`.**

The CHI end-to-end regression tooling had accumulated two names that read like product
concepts but are not — nothing a DeepBench user ever encounters. Use these exact terms:

| Do NOT use | Canonical term |
|------------|----------------|
| "driver", "the regression driver", "the CHI driver" | **Test engine** |
| "case 24", "case #24", "the news-door case" | **Regression test #24** |

**Why it matters, John's own framing:** "driver" and "case 24" read as platform vocabulary,
which forces a translation step every time a session reports test results — and invites the
reader to think a *product* behavior is under discussion when it is a *test artifact*. The
news door itself **is** a real user-facing feature; regression test #24 is the test *of* it.
Keep that distinction visible in every report.

**Scope of the term:** `scripts/chi-true-regression.mjs` and the runbook/report vocabulary
around it. This is test tooling only — it never ships to the browser and never appears on the
beta surface.

**This is not a blind find-and-replace.** "driver" is an ordinary English word and appears in
this repo in at least four unrelated senses that must be left alone (verified 2026-07-29):

- `src/nigp-lookup.js` — NIGP commodity-code product data ("Line Drivers", "Engine/Driver
  Performance", "Driver and Hardware Support Programs"). Real content, 11 hits.
- `docs/WORKING-WITH-JOHN.md` — "Deadlines are never a silent **driver** of scope," plus the
  `feedback-deadline-not-driver` memory filename.
- `docs/APPLE-DATA-ROOM-SOURCE-DATA.md` — "Price/value as upgrade **driver**" (business data).
- `src/hooks/useAIActivity.js`, `docs/kickoffs/v6.3.134-LOG-36-*`, `v6.1.28-*`, `v6.0.45-*` —
  "the log is the driver," "growth drivers," "dual-driver reasoning."

Any session doing this rename reviews each hit rather than replacing by string.
