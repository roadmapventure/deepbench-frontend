# DeepBench — Design Session Guide (Claude Code)
> For Claude.ai web/Desktop design sessions, use DeepBench-Session-Init.md instead.

---

## Standing Rule — No Coding in Design Sessions

**Design sessions produce documents only.** No code is written, no files in `src/` or `api/` are touched, no commits contain code changes. The session ends when the kickoff doc is committed to `dev`.

Coding happens in a separate Claude Code session, started with:
```
Read docs/kickoffs/[filename].md and CLAUDE-STATE.md, then execute it.
```

This separation is what enforces branch discipline. A coding session starts cold, reads the kickoff doc, and switches to `dev` as its first act. Blurring the boundary is how code ends up on `main` without a review gate.

---

## Standing Rule — Automated Design→Code→Verify Loop (added 2026-07-02, John)

**Once a kickoff doc is committed, the design session spawns the coding session itself** — via the `Agent` tool, foreground, no `isolation` param. **Revised 2026-07-07 (concurrent-sessions rule, see `CLAUDE.md`):** "operates directly on the real working tree" now means this design session's own manually-created worktree (see `CLAUDE.md`'s concurrent-sessions hard rule), not the shared main checkout — the spawned coding agent inherits that isolation rather than getting a second nested one, and pushes straight to `dev` from there via the fetch-rebase-push-retry discipline `CLAUDE.md` specifies. Before this change (single-session use), "the real working tree" meant the shared checkout directly; with multiple concurrent sessions that assumption breaks, hence the worktree requirement. The prompt passed is exactly the bordered code block the kickoff doc already ends with: `Read docs/kickoffs/[filename].md and CLAUDE-STATE.md, then execute it.` — self-contained, no other context, so the spawned agent starts exactly as cold as a human-started session would. **This does not weaken the No-Coding-in-Design-Sessions rule above** — the design session's own reasoning process still writes zero code; it only spawns a fresh, memory-less agent that does, the automated equivalent of John opening a second window and pasting the prompt himself.

**When the coding agent finishes** (tests pass, build succeeds, committed and pushed to `dev`), its full report returns directly into the design session — no manual paste needed. The design session then runs Step 5 (below) itself: Manual QA Checklist verified directly against live systems (Supabase, `git status`, Vercel logs where reachable), not handed to John to run. Accept on indirect evidence, explicitly documented, for whatever genuinely can't be checked directly (e.g. no Vercel connection in this environment) — same as established precedent, just no longer gated on John confirming it.

**Still stop and ask John, mid-flow, when:** the coding agent's own report surfaces a genuine scope conflict, an ambiguous finding, or a decision the kickoff doc didn't already resolve — same bar that already makes sessions stop today (e.g. `S-ARCH-AGENT-LOOP-02` halting rather than patching inline, per John's call at the time). Routine PASS-through-to-close-out needs no human checkpoint; a real judgment call still does.

**Always report the outcome to John at the end regardless** — what shipped, test results, QA results, PASS/FAIL — even though he didn't have to run anything himself. Automating the loop removes his manual steps, not his visibility into what happened.

**This supersedes `feedback-manual-qa-gate`'s "wait for John's PASS/FAIL" for this flow specifically** — the design session is now the one confirming PASS/FAIL. That memory's underlying concern (never silently closing out after a completion report without real verification) still fully applies — it's just the design session doing the verifying now, not John.

---

## Standing Rule — Version-Paired Session Naming

Every design session must be tagged with the version number of the kickoff doc(s) it produces, matching the version the paired coding session will carry. This makes the design ↔ coding pairing visible at a glance in `CLAUDE-STATE.md` and `docs/FEATURES.md`.

Format: `S-[FEATURE-ID]-design (v[X.X.X])` for the design session, `S-[FEATURE-ID] (v[X.X.X])` for the coding session that executes its kickoff doc. Sub-sessions (`a`/`b`) each get their own version per the existing sub-session versioning rule (`STANDARDS.md` Section 1).

Applies from S-APPLE-01a-design (v5.3.0) onward.

---

## Standing Rule — Backlog Capture

**Any feature, agent, or requirement named during a design session must be written to the right feature-inventory file immediately — not deferred to session close-out.**

This applies to items mentioned casually in conversation, not just items with a full spec. A one-line placeholder with ❌ Missing status is enough. Do not let the session end without the entry existing.

**(added 2026-07-07 — 3-file split)** The feature inventory is split across three files by John's priority rule: "anything for the MI page to work, from backend to frontend, that is speed, loop, harness, and charts goes to now. Anything MI outside of that is next, and anything not related to making MI successful goes to later." — `docs/FEATURES.md` (now), `docs/FEATURES-NEXT.md` (other MI), `docs/FEATURES-LATER.md` (everything else). Classify a new item into the right file when you add it; when genuinely unsure between now/next, ask John rather than guessing.

---

## Step 1 — Orient (read these, in order, stop when you have enough)

**Before any of these three: run `CLAUDE.md`'s read-only bootstrap check** (`git fetch origin dev`, then read `git show origin/dev:<path>` directly — don't diff it against the local file, CRLF/LF line-ending differences make a literal diff show "changed" even with zero real drift) — the shared checkout's disk copy isn't kept in sync with `origin/dev`, so these three files may be stale until your own worktree exists.

1. `CLAUDE-STATE.md` — current version, next session, open blockers
2. `docs/FEATURES.md` — **now** feature backlog (MI speed/loop/harness/charts) and session queue. Read `docs/FEATURES-NEXT.md` (other MI backlog) or `docs/FEATURES-LATER.md` (everything else) only when the session's actual scope is there.
3. `docs/SESSIONS.md` — session log (only if you need version history)

Report back after Step 1:
- Current version in dev (state it as the `origin/dev` version you just fetched, not whatever the shared checkout's file said before that fetch)
- Next scheduled session
- Any open blocking questions
- "What would you like to work on?"

---

## Step 2 — Pull in context only when the session needs it

| Read this | When |
|-----------|------|
| `docs/STANDARDS.md` | Generating a kickoff doc |
| `docs/PRD.md` + `docs/MOCK-NOTES.md` | Any design or UX session |
| `docs/ARCHITECTURE.md` | Session touches layer boundaries, migration work, or S-MIGRATE / S-BENCH / S-INFRA chain |
| `docs/STYLE-GUIDE.md` | Any session with UI work — read before designing, update at close |
| `docs/ENV-VARS.md` | Features that call external services |
| Relevant source files in `src/` | Read before designing against any existing component |

Do not pre-load all of these. Read only what the session requires.

---

## Step 3 — What This App Is

DeepBench v5.1 — AI agent workforce platform for government procurement intelligence.
- Live: `https://deepbench.roadmapventure.com`
- Dev: `https://deepbench-frontend-git-dev-roadmapventures-projects.vercel.app`
- Owner: John Leonard / Roadmap Venture
- Repos: `roadmapventure/deepbench-frontend` (frontend) + `roadmapventure/deepbench-backend` (Railway)

---

## Step 4 — How to Generate a Kickoff Doc

1. Read `docs/FEATURES.md` — confirm feature ID, status, dependencies. If the feature isn't there, check `docs/FEATURES-NEXT.md`/`docs/FEATURES-LATER.md` before assuming it's undocumented — it may simply live in a different priority tier.
2. Read `docs/STANDARDS.md` — confirm relevant test categories
3. Read `docs/SESSIONS.md` — confirm current version and next session
4. For UI work: read `docs/PRD.md` + `docs/MOCK-NOTES.md` + `docs/STYLE-GUIDE.md`
5. Read relevant source files in `src/` directly — confirm what already exists
6. **Architect Review** — mandatory before writing any task spec. Check all four:
   - **Duplicate functionality:** grep for any function, component, hook, or constant the session plans to create. If it already exists anywhere in the codebase, reuse it — do not build a parallel implementation.
   - **Cross-reference integrity:** for every catalog, constant, status flag, or label the session touches, verify every file that references it agrees on the current value and state. A contradiction between files (e.g. a pattern marked active on a badge but inactive in the catalog) must be resolved in this design session — never deferred to coding.
   - **Layer violations:** confirm every new piece of logic lands in the correct architecture layer. Capability logic belongs in Layer 3 (`api/capabilities/`), not inline in React components (Layer 2). Flag violations before speccing the task.
   - **Schema alignment:** for any DB column read or written, verify the column name and type against the actual Supabase schema or existing code before speccing the task. Never assume a column exists because a design doc mentions it.
   - **Delegation legitimacy (added 2026-07-02, S-ARCH-AGENT-LOOP-02-design):** for every hand-off, backup, or review decision point the session specs, write out `ARCHITECTURE.md` §19d's sniff-test answer for *that specific relationship* — does the requesting agent actually reason about whether/who to ask, or is this a fixed relationship (even one expressed as a capability_slug rather than an agent_id)? Citing that a delegation mechanism exists in the doc is not the same as confirming this use of it passes the test. Also re-check the full relevant source file for an existing generic primitive before declaring any mechanism unbuilt — don't stop at the one function/branch shape you expected it to take. **Confirmed gap (2026-07-02, `S-ARCH-AGENT-LOOP-03-design`):** reading a dispatch file's branch structure (e.g. `execute.js`'s `if (turn.tool_name === ...)` shape) is not the same as reading each tool's actual description/docstring (e.g. the `REQUEST_HELP_TOOL`/`DELEGATE_TO_AGENT_TOOL` literals in `request-receivable.js`) — a mechanism's real legitimacy rule can live entirely in the tool description text, not in the control flow around it. A session concluded new harness code was needed for a "return reviewed work to its original author" case before re-reading `delegate_to_agent`'s own description closely enough to see it already permits any legitimately-supplied candidate (task_context included, not only `request_help`'s returned list — `request_help` is only cited as an example source, per the tool's own wording). Before declaring any mechanism unbuilt: read the full text of every related tool/function definition, not just the branches that dispatch to it. **Scripted-value check (added 2026-07-06, `S-ARCH-DISPLAY-LOOP-01-design`, `PLATFORM-AGENT-RULEBOOK.md` AR-2.8):** for any new live tool-call argument that's meant to express agent judgment (e.g. a boolean like `is_final` on a delegation tool), read the exact `method`/instructional text a session plans to write for it — if that text tells the model the literal value to output rather than a criterion to reason from, it's a static trait wearing a tool-call-argument costume, the same failure class as `AA-98`, just one layer further down the stack (a harness-level argument instead of a capability's own output field). Caught this session before the kickoff doc was executed, not after.
   - **Locked-section staleness check (added 2026-07-02, S-ARCH-AGENT-LOOP-02-design):** before trusting any `ARCHITECTURE.md` LOCKED section's body text, check whether it contradicts a fact already sitting in this session's context — a `CLAUDE-STATE.md` session summary, a prior message this conversation. Root cause this session: §19d's "Two delegation paths" paragraph (written by `S-ARCH-OWNERSHIP-02-design`) described a fast path as current and legitimate, but `CLAUDE-STATE.md`'s own session summary — already read at Step 1 of *this same session* — said that exact path was "eliminated entirely" by a later same-day session. The contradiction sat unreconciled until John caught the downstream mistake it caused. LOCKED means "don't casually re-litigate the decision," not "immune to going stale when a same-day follow-up session changes it without looping back to amend the earlier prose." If a locked section and an already-known fact disagree, the disagreement itself is the finding — stop and resolve it before proposing scope, never resolve it silently in the direction the locked section implies just because it's marked LOCKED.

   If any check reveals a contradiction, duplication, or violation — resolve it now. Do not write a kickoff doc that contains a known inconsistency.

7. **AI Pattern Check** — before deciding on implementation approach, ask: does this feature have an opportunity to use an AI pattern not yet wired in DeepBench? Check `PATTERN_CATALOG` and `SERVICE_CATALOG` (in `src/hooks/useAIActivity.js`). Name the pattern and the service that would carry it. If yes, include it in the design. If no, mark N/A in the kickoff doc — a single line is enough ("N/A — no api/ route touched"), not a justifying paragraph. Do not skip the section itself.
8. If UI work: describe mock for John's approval before writing the kickoff doc
9. **Serverless function check:** Count files in `api/`. If the session adds a new `api/` file, the count must stay at or under 12 (Vercel Hobby limit). If adding one would reach 13+, the kickoff doc must include a merge task for an existing pair of related `api/` files — or route the new capability to Railway instead. State the pre/post count explicitly in the kickoff doc scope section.
10. **Assign the version — do not reuse the current one.** Read `CLAUDE-STATE.md`'s "Version in dev" and increment it for this session's version tag, even if this session is in the same major-version architecture track as the last one. Reusing the current version is the default failure mode here — it broke 2026-07-02 (`STANDARDS.md` Section 1, Section 10 change log) when 4 consecutive sessions all stamped `v6.0.0`. This is the version that goes in the kickoff filename, the "SESSION" header, and every file's version-header comment.
11. Write kickoff doc with all 11 required sections
12. Save to `docs/kickoffs/[version]-[featureId]-[featureName].md`

**Standing rules by reference (added 2026-07-01, see STANDARDS.md Section 3):** Claude Code has persistent cross-session memory now — a kickoff doc does not need to restate a standing rule (23-field agent standard, AI Audit wiring requirement, Section 5 verification checklist categories, known bug patterns) in full prose. Name it instead: "STANDARDS.md Section 11 applies" is sufficient. Session-specific facts — exact values, files, scope, test assertions for *this* session — still must be fully spelled out. This shrinks Section 3 (AI Pattern Check, when N/A) and Section 9 (Verification Checklist) the most; it does not change Section 5 (TASKS) or Section 8 (Node.js test), which are inherently session-specific content, not restated rules.

**Mandatory kickoff doc compliance check — AI Audit wiring (never skip):**
Every kickoff doc for any `api/` route must explicitly spec:
- [ ] `logAICall()` call site at every AI operation in the route
- [ ] `SERVICE_CATALOG` entry in `useAIActivity.js` declaring which patterns the service uses
- [ ] `AI_TYPE_TO_SERVICE` mapping entry for the new service slug
If wiring these would push the session over 4 tasks or 3 files — split into `a` (build) and `b` (audit wiring). Never defer audit wiring to an unscheduled future session. Applies to deterministic routes too (`ai_type: 'deterministic'`).

**Mandatory close-out steps (do not skip):**
9. Update the feature inventory file(s) that own the rows this session touched — `docs/FEATURES.md` (now), `docs/FEATURES-NEXT.md`, or `docs/FEATURES-LATER.md`, whichever the feature ID actually lives in. Mark designed features, add new feature IDs to the correct now/next/later file (also update the session queue in `CLAUDE-STATE.md`, next step). The old "session order table" at the bottom of `FEATURES.md` was moved to `docs/SESSIONS.md` 2026-07-01.
10. Update `CLAUDE-STATE.md` — set next session, add this session to "Last 3 sessions" as a **one-line** entry (session, version, commit, one clause on what/why), and write the session's full detail directly to `docs/SESSIONS.md` in that same commit — do not leave the full paragraph sitting in `CLAUDE-STATE.md` for a future close-out to migrate "when it's about to fall off"; that deferred-migration step is what let `CLAUDE-STATE.md` balloon past its 4.6 KB baseline before (found and fixed 2026-07-07, doc-cleanup session). Also clear resolved blockers, and delete your own bullet from "In flight now" (`CLAUDE.md` concurrent-sessions rule §8).
11. If UI work: update `docs/STYLE-GUIDE.md` with any rules locked this session
12. Commit and push `docs/FEATURES.md`, `CLAUDE-STATE.md`, and the kickoff doc to `dev`
13. Show the bordered code block (the exact coding-session start prompt) for the record, then immediately use it as the `Agent` tool prompt per the Automated Design→Code→Verify Loop rule above — proceed straight to Step 5, no pause waiting for John to start a session manually:
    ```
    Read docs/kickoffs/[filename].md and CLAUDE-STATE.md, then execute it.
    ```

---

## Step 5 — How to Close a Session

### 5a — Spawn the coding session and wait for its report
Per the Automated Design→Code→Verify Loop rule above: spawn via `Agent`, foreground, the bordered `Read docs/kickoffs/...` prompt. Wait for its own report — Node.js tests pass + `npm run build` succeeds, committed and pushed to `dev`. (If John instead ran a coding session manually and pastes a completion report himself — still valid, same as before — proceed from here identically either way.)

### 5b — Run the Manual QA Checklist directly (no longer a human hand-off)
Take the Manual QA Checklist from Section 11 of the kickoff doc and verify each item directly — query Supabase, check `git status`/`git log`, hit the dev URL, check Vercel logs where reachable. Accept on indirect evidence only where genuinely unreachable in this environment, documented explicitly (not silently skipped). For UI/frontend work, use the preview tools to actually exercise the feature — don't skip to indirect evidence when a live check is possible.

⛔ Do NOT update FEATURES.md or CLAUDE-STATE.md until this verification is actually done — self-verification is not a rubber stamp, it carries the same weight the John-confirmed gate used to.

### 5c — Act on QA results
- **All PASS** → Move the feature ID's row from whichever of `docs/FEATURES.md`/`docs/FEATURES-NEXT.md`/`docs/FEATURES-LATER.md` it actually lives in to `docs/FEATURES-ARCHIVE.md` (✅ Done rows do not stay in any of the 3 active files — that's what caused `FEATURES.md` to balloon to 127.8 KB before the 2026-07-01 cleanup, and to 122 KB again before the 2026-07-07 now/next/later split), update `CLAUDE-STATE.md` (bump version, set next session), commit and push all touched files to dev.
- **Any FAIL** → Full root cause analysis first. Read complete execution path. Compare against NIGP reference. A bug that fails QA once must not fail QA twice. Generate a patch kickoff doc.
- **New requirement found** → Add to the correct now/next/later file as ❌ Missing (see Backlog Capture rule above). Commit and push.
- **Either way — report the full outcome to John** before ending the session: what shipped, test results, QA results, PASS/FAIL per item.

---

## Step 6 — Agent Roster

Current roster lives in `src/data/agents.js` — read it directly, do not rely on a hardcoded table here. A static roster list in this doc goes stale the moment any agent session ships (this table listed 14 agents when the real count was 20 before removal — including a "stub until S-BENCH-01" note on Michelle Manning after S-BENCH-01 had already shipped). If you need "who exists right now," grep `agents.js` for the `AGENTS` array.

---

## Step 7 — Repo Access

All local files are directly readable at `C:\Projects\deepbench-frontend\`.
Read source files directly — do not fetch from GitHub URLs in Claude Code sessions.
