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

## Standing Rule — Skill/Capability Disclosure When Updating Agent Competencies (added 2026-07-16, John's explicit call)

**Before proposing or writing any content that creates, edits, or touches a Skill (`skill_profiles` row) or an agent's competency, state the answers to these explicitly — as part of the conversational walkthrough with John, not buried in a kickoff doc:**

- Is this creating a **new** Skill record, or editing an existing one? If new: what are you naming it (slug), and what Skill type (Identity/Behavior/Knowledge/Intent/Format/Guardrails)?
- What **Capability** (`capability_slug`) is it assigned to — name it.
- Does that Capability already have other Skills attached? List them.
- Who (which Agent(s)) is that Capability assigned to (`agent_capability_assignments`) — name them.

**Verify every answer live against Supabase, every time — never from memory, a prior session's finding, or `AGENT-COMPETENCY-MODEL.md`'s own examples.** This is the same discipline as the standing verify-never-assert-from-memory rule (`CLAUDE.md`), applied specifically to Skill/Capability/Agent work because a wrong assumption here silently mis-scopes the edit (e.g. editing a Skill shared across Capabilities/Agents without realizing the blast radius). Applies to every session touching `skill_profiles`/`capability_skill_profiles`/`agent_capability_assignments` — content-authoring sessions (like `AA-194`) and structural/code sessions alike.

---

## Standing Rule — Backlog Capture

**Any feature, agent, or requirement named during a design session must be written to the right feature-inventory file immediately — not deferred to session close-out.**

This applies to items mentioned casually in conversation, not just items with a full spec. A one-line placeholder with ❌ Missing status is enough. Do not let the session end without the entry existing.

**(added 2026-07-07 — 3-file split)** The feature inventory is split across three files by John's priority rule: "anything for the MI page to work, from backend to frontend, that is speed, loop, harness, and charts goes to now. Anything MI outside of that is next, and anything not related to making MI successful goes to later." — `docs/FEATURES.md` (now), `docs/FEATURES-NEXT.md` (other MI), `docs/FEATURES-LATER.md` (everything else). Classify a new item into the right file when you add it; when genuinely unsure between now/next, ask John rather than guessing.

**(added 2026-07-08 — Type tag, John's explicit call)** Every row in `docs/FEATURES.md` and `docs/FEATURES-NEXT.md` also gets a `Type` tag (Continuity/Speed/Architecture/Feature/Tech Debt/Data/Observability — full definitions in `docs/FEATURES.md`'s "Type Taxonomy" section). Assign the type that actually fits when logging a new item; if none of the existing types genuinely fit, add a new one to the taxonomy rather than forcing a close-but-wrong tag. Do not apply this retroactively to `docs/FEATURES-LATER.md` or `docs/FEATURES-ARCHIVE.md` unless a session is already touching a row there for another reason.

**(added 2026-07-15, John's explicit call — the `task_773e8b06` incident)** A `spawn_task` chip's `task_XXXXXXXX` ID is Claude Code's own session-tracking mechanism, not part of this project's feature-tracking system — it must never be the only identifier a piece of DeepBench work is known by. If a finding is significant enough to spin off via `spawn_task`, give it a real backlog ID (whichever of `FEATURES.md`/`FEATURES-NEXT.md`/`FEATURES-LATER.md` fits) in the same breath the task is spawned, and cite that ID — never the raw `task_XXXXXXXX` — in any coordination note or cross-reference to that work afterward. This is exactly what went wrong with `task_773e8b06`: never anchored to a durable ID at creation, so multiple sessions repeated "`task_773e8b06` is running separately, not blocking" as unverified fact for a full day, and the task's own session later failed to recognize a third-person mention of its own opaque ID as being about itself — see [[feedback-coordination-note-self-reference]]. A real ID at spawn time would have prevented both failure modes: sessions cite "blocked on `AA-191`," not "blocked on some session I have to go check on," and a session reading about its own backlog row doesn't have the same self-reference ambiguity a bare process ID does.

---

## Step 1 — Orient (read these, in order, stop when you have enough)

**Your session worktree should already exist by this point** (`CLAUDE.md`'s router sets it up as the very first action, before any reads). Read all three of these — and everything else this session touches — from that worktree path, never the shared checkout at `C:/Projects/deepbench-frontend` directly. A worktree freshly branched from `origin/dev` is correct by construction, so no separate fetch+`git show` freshness check is needed (retired 2026-07-15 — see `CLAUDE.md`).

**Mandatory, added 2026-07-15 (was previously an optional skill run "if you thought to"; with 5-7 concurrent sessions, drift compounds too fast for that to be reliable):** run the `session-hygiene` skill's checks 1, 2, 3, and 5 now, before Step 1's reads — sizes/greps only, costs near-nothing. Check 5 (stale worktrees) matters most under real concurrency: don't assume `CLAUDE-STATE.md`'s "In flight now" is a complete picture of what's on disk. Report any findings briefly, same as the skill always has; don't silently fix without flagging first.

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
   - **Multi-site bug pattern → shared-service check (added 2026-07-16, John caught this, not the session itself — see `AA-192`):** if the same bug shape shows up at 2+ call sites, the default hypothesis is a missing/incomplete migration onto an existing shared service, not N independent bugs needing N independent patches. Before scoping per-site fixes, check: (a) does `ARCHITECTURE.md` already LOCK a shared-service rule this bug shape violates (e.g. §12/§13's "every Layer 3 route logs via the shared server-side service, no client-side guessing")? (b) is there a prior migration effort (like `AA-190`'s 9-site `logActivity()` migration) whose site list this call site is conspicuously absent from — that absence is itself the finding, not a reason to assume it's out of scope. **Concretely, this session first proposed changing a client-side helper's signature and reapplying that fix at 3 separate call sites (`DashboardScreen.jsx`, `PersonnelScreen.jsx`, `TeachScreen.jsx`) — all 3 shared one underlying route (`api/brief.js`) that was simply never migrated onto the shared `logActivity()` service everything else already uses.** Migrating the shared route once (root) collapsed 3 parallel per-site fixes into 1 route fix + trivial "delete the now-redundant client call" cleanups, and fixed a bigger co-located bug (wrong model logged, not just missing tokens) at the source instead of 3 times. Ask explicitly: "is this fix touching the shared thing, or patching around it in every place that calls it?"
   - **Cross-reference integrity:** for every catalog, constant, status flag, or label the session touches, verify every file that references it agrees on the current value and state. A contradiction between files (e.g. a pattern marked active on a badge but inactive in the catalog) must be resolved in this design session — never deferred to coding.
   - **Layer violations:** confirm every new piece of logic lands in the correct architecture layer. Capability logic belongs in Layer 3 (`api/capabilities/`), not inline in React components (Layer 2). Flag violations before speccing the task.
   - **Schema alignment:** for any DB column read or written, verify the column name and type against the actual Supabase schema or existing code before speccing the task. Never assume a column exists because a design doc mentions it.
   - **Delegation legitimacy (added 2026-07-02, S-ARCH-AGENT-LOOP-02-design):** for every hand-off, backup, or review decision point the session specs, write out `ARCHITECTURE.md` §19d's sniff-test answer for *that specific relationship* — does the requesting agent actually reason about whether/who to ask, or is this a fixed relationship (even one expressed as a capability_slug rather than an agent_id)? Citing that a delegation mechanism exists in the doc is not the same as confirming this use of it passes the test. Also re-check the full relevant source file for an existing generic primitive before declaring any mechanism unbuilt — don't stop at the one function/branch shape you expected it to take. **Confirmed gap (2026-07-02, `S-ARCH-AGENT-LOOP-03-design`):** reading a dispatch file's branch structure (e.g. `execute.js`'s `if (turn.tool_name === ...)` shape) is not the same as reading each tool's actual description/docstring (e.g. the `REQUEST_HELP_TOOL`/`DELEGATE_TO_AGENT_TOOL` literals in `request-receivable.js`) — a mechanism's real legitimacy rule can live entirely in the tool description text, not in the control flow around it. A session concluded new harness code was needed for a "return reviewed work to its original author" case before re-reading `delegate_to_agent`'s own description closely enough to see it already permits any legitimately-supplied candidate (task_context included, not only `request_help`'s returned list — `request_help` is only cited as an example source, per the tool's own wording). Before declaring any mechanism unbuilt: read the full text of every related tool/function definition, not just the branches that dispatch to it. **Scripted-value check (added 2026-07-06, `S-ARCH-DISPLAY-LOOP-01-design`, `PLATFORM-AGENT-RULEBOOK.md` AR-2.8):** for any new live tool-call argument that's meant to express agent judgment (e.g. a boolean like `is_final` on a delegation tool), read the exact `method`/instructional text a session plans to write for it — if that text tells the model the literal value to output rather than a criterion to reason from, it's a static trait wearing a tool-call-argument costume, the same failure class as `AA-98`, just one layer further down the stack (a harness-level argument instead of a capability's own output field). Caught this session before the kickoff doc was executed, not after.
   - **Locked-section staleness check (added 2026-07-02, S-ARCH-AGENT-LOOP-02-design):** before trusting any `ARCHITECTURE.md` LOCKED section's body text, check whether it contradicts a fact already sitting in this session's context — a `CLAUDE-STATE.md` session summary, a prior message this conversation. Root cause this session: §19d's "Two delegation paths" paragraph (written by `S-ARCH-OWNERSHIP-02-design`) described a fast path as current and legitimate, but `CLAUDE-STATE.md`'s own session summary — already read at Step 1 of *this same session* — said that exact path was "eliminated entirely" by a later same-day session. The contradiction sat unreconciled until John caught the downstream mistake it caused. LOCKED means "don't casually re-litigate the decision," not "immune to going stale when a same-day follow-up session changes it without looping back to amend the earlier prose." If a locked section and an already-known fact disagree, the disagreement itself is the finding — stop and resolve it before proposing scope, never resolve it silently in the direction the locked section implies just because it's marked LOCKED.

   If any check reveals a contradiction, duplication, or violation — resolve it now. Do not write a kickoff doc that contains a known inconsistency.

7. **AI Pattern Check** — before deciding on implementation approach, ask: does this feature have an opportunity to use an AI pattern not yet wired in DeepBench? Check `PATTERN_CATALOG` and `SERVICE_CATALOG` (in `src/hooks/useAIActivity.js`). Name the pattern and the service that would carry it. If yes, include it in the design. If no, mark N/A in the kickoff doc — a single line is enough ("N/A — no api/ route touched"), not a justifying paragraph. Do not skip the section itself.
8. If UI work: describe mock for John's approval before writing the kickoff doc
8b. **Mandatory stop-gate, all sessions, added 2026-07-15 (was previously only a memory rule, never written into this doc — that gap is why a kickoff doc has started before John was ready more than once):** after scoping is done (Architect Review + AI Pattern Check + mock if UI), stop here. Summarize the proposed fix in plain conversational language — not kickoff-doc prose — restating the specific scope/approach about to be written (exact copy if any, exact files, exact behavior change), and wait for an explicit yes to *that specific thing*. Do not write or save the kickoff doc file until that yes lands. A vague "keep going" / "sounds good" only approves continuing the topic, not the specific scope just shown — especially once other exchanges have happened in between. If genuinely unsure whether the last reply approved the specific proposal or just the general direction, ask once, plainly, rather than proceeding on an assumption.
9. **Serverless function check:** Count files in `api/`. If the session adds a new `api/` file, the count must stay at or under 12 (Vercel Hobby limit). If adding one would reach 13+, the kickoff doc must include a merge task for an existing pair of related `api/` files — or route the new capability to Railway instead. State the pre/post count explicitly in the kickoff doc scope section.
10. **Assign the version — claim it atomically, never read-and-increment.** **Rewritten 2026-07-15:** the old instruction ("read `CLAUDE-STATE.md`'s Version in dev and increment locally") broke twice under real concurrency — 4 sessions all stamping `v6.0.0` on 2026-07-02, and `AZ-19`/`S-MOBILE-ROSTER-01` both independently claiming `v6.2.4` on a later date — because two sessions reading the same "current" number at nearly the same moment both compute the same "next" one before either pushes. Fixed at the source: claim the version from a single atomic Supabase counter instead of computing it yourself. Run via the Supabase MCP `execute_sql` (project `rallojeqnkgtxgsdsnqm`):
    ```sql
    UPDATE dev_version_counter
    SET patch = patch + 1, updated_at = now(), updated_by_session = '<short-session-name>'
    WHERE id = 1
    RETURNING major, minor, patch;
    ```
    Postgres serializes concurrent `UPDATE`s to the same row, so this is race-free by construction — no separate re-check-before-push step needed, unlike the old scheme. Use the returned `major.minor.patch` as-is: this is the version that goes in the kickoff filename, the "SESSION" header, and every file's version-header comment. Do this once, right when you're about to need the number (not far ahead of time) — small gaps in the sequence from an abandoned or redirected session are fine and expected, only collisions were ever the actual problem.
11. Write kickoff doc with all 11 required sections
12. Save to `docs/kickoffs/[version]-[featureId]-[featureName].md`

**Standing rules by reference (added 2026-07-01, see STANDARDS.md Section 3):** Claude Code has persistent cross-session memory now — a kickoff doc does not need to restate a standing rule (23-field agent standard, AI Audit wiring requirement, Section 5 verification checklist categories, known bug patterns) in full prose. Name it instead: "STANDARDS.md Section 11 applies" is sufficient. Session-specific facts — exact values, files, scope, test assertions for *this* session — still must be fully spelled out. This shrinks Section 3 (AI Pattern Check, when N/A) and Section 9 (Verification Checklist) the most; it does not change Section 5 (TASKS) or Section 8 (Node.js test), which are inherently session-specific content, not restated rules.

**Mandatory kickoff doc compliance check — AI Audit wiring (never skip):**
Every kickoff doc for any `api/` route must explicitly spec:
- [ ] `logAICall()` call site at every AI operation in the route
- [ ] `SERVICE_CATALOG` entry in `useAIActivity.js` declaring which patterns the service uses
- [ ] `AI_TYPE_TO_SERVICE` mapping entry for the new service slug
If wiring these would push the session over 4 tasks or 3 files — split into `a` (build) and `b` (audit wiring). Never defer audit wiring to an unscheduled future session. Applies to deterministic routes too (`ai_type: 'deterministic'`).

**Added 2026-07-07 (John's explicit call — documentation writing was a real chunk of a ~90-min session that should take ~10 min): entry length caps, all three files.** "One-line" in step 10 below means an actual short line — 1-2 plain sentences, not a single run-on sentence with a dozen clauses strung together with em-dashes (that technically has no line break but reads as a paragraph). Default to 2-4 sentences for any `FEATURES.md`/`FEATURES-NEXT.md`/`FEATURES-LATER.md`/`FEATURES-ARCHIVE.md` row and any `CLAUDE-STATE.md` entry: what shipped, why, and the one caveat that matters, if any. Long narrative (root-cause detail, multiple named sub-findings, full verification blow-by-blow) is only worth it when the finding is genuinely novel or surprising enough that a future session would otherwise re-discover it the hard way — that's the exception, not the default. The code's own comments and the kickoff doc already carry implementation detail; don't restate it in the tracking docs.

**Mandatory close-out steps (do not skip):**
9. Update the feature inventory file(s) that own the rows this session touched — `docs/FEATURES.md` (now), `docs/FEATURES-NEXT.md`, or `docs/FEATURES-LATER.md`, whichever the feature ID actually lives in. Mark designed features, add new feature IDs to the correct now/next/later file (also update the session queue in `CLAUDE-STATE.md`, next step). The old "session order table" at the bottom of `FEATURES.md` was moved to `docs/SESSIONS.md` 2026-07-01.
10. Update `CLAUDE-STATE.md` — set next session, add this session to "Last 3 sessions" as a **one-line** entry (session, version, commit, one clause on what/why — see the length-cap note above), and write the session's full detail directly to `docs/SESSIONS.md` in that same commit — do not leave the full paragraph sitting in `CLAUDE-STATE.md` for a future close-out to migrate "when it's about to fall off"; that deferred-migration step is what let `CLAUDE-STATE.md` balloon past its 4.6 KB baseline before (found and fixed 2026-07-07, doc-cleanup session). Also clear resolved blockers, and delete your own bullet from "In flight now" (`CLAUDE.md` concurrent-sessions rule §8). **This same discipline applies to the "Session Queue" section below "Last 3 sessions":** if this session's item(s) in a Queue track just shipped, collapse them into that track's existing one-line "Done, collapsed" pointer immediately — don't leave a done item sitting there in full-paragraph form for a later pass to notice (found and fixed 2026-07-15, same drift class as the free-text section above, verified item-by-item against `FEATURES.md`/`FEATURES-ARCHIVE.md` before collapsing, not assumed from memory).
11. If UI work: update `docs/STYLE-GUIDE.md` with any rules locked this session
11b. **Mandatory, added 2026-07-15:** run the `session-hygiene` skill's checks 1-3 one more time against the files as they'll actually be committed, before the push in the next step — confirms this session's own close-out didn't reintroduce the drift it's supposed to prevent (un-archived Done rows, a 4th "Last 3 sessions" entry, an oversized file). Fix any hit before pushing, not after.
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

**Added 2026-07-07 (a backend-only fix took ~90 min end to end this way — John's explicit call to cut this) — scope re-verification to what the coding session didn't already prove:**
- **Backend/harness-only session (no UI touched):** if the coding session's own Category L live test already exercised the real pipeline end to end, do **one** quick spot-check (a single real scenario), not a full independent re-run of every Manual QA scenario. You are confirming the coding report is honest, not re-deriving its evidence from scratch.
- **UI/frontend session:** the existing rule stands unchanged — exercise the feature live via the preview tools. **Added 2026-07-15:** the in-app Browser preview tools (screenshot/read_page/computer/navigate) are always available, no setup needed — default to those. `claude-in-chrome` (real Chrome, needed only for logged-in-session or extension-specific testing) is deferred and must be loaded via `ToolSearch` before its first use each session — an unloaded tool erroring is not the same as "no browser access." Confirm the account's Chrome extension is actually disconnected (e.g. via `list_connected_browsers`) before reporting no access, rather than assuming it from a load failure.
- Either way, do not re-run a scenario multiple times "to be sure" once it passes once — if a transient/already-tracked issue fires (e.g. a known flaky backend call), note it and move on; don't loop retrying it to build extra confidence beyond what's already documented for that known issue.

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
