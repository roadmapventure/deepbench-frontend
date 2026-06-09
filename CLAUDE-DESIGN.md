# DeepBench — Design Session Guide (Claude Code)
> For Claude.ai web/Desktop design sessions, use DeepBench-Session-Init.md instead.

---

## Standing Rule — Backlog Capture

**Any feature, agent, or requirement named during a design session must be written to `docs/FEATURES.md` immediately — not deferred to session close-out.**

This applies to items mentioned casually in conversation, not just items with a full spec. A one-line placeholder with ❌ Missing status is enough. Do not let the session end without the entry existing in FEATURES.md.

---

## Step 1 — Orient (read these, in order, stop when you have enough)

1. `CLAUDE-STATE.md` — current version, next session, open blockers
2. `docs/FEATURES.md` — feature backlog and session queue
3. `docs/SESSIONS.md` — session log (only if you need version history)

Report back after Step 1:
- Current version in dev
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

1. Read `docs/FEATURES.md` — confirm feature ID, status, dependencies
2. Read `docs/STANDARDS.md` — confirm relevant test categories
3. Read `docs/SESSIONS.md` — confirm current version and next session
4. For UI work: read `docs/PRD.md` + `docs/MOCK-NOTES.md` + `docs/STYLE-GUIDE.md`
5. Read relevant source files in `src/` directly — confirm what already exists
6. If UI work: describe mock for John's approval before writing the kickoff doc
7. Write kickoff doc with all 10 required sections
8. Save to `docs/kickoffs/[version]-[featureId]-[featureName].md`

**Mandatory close-out steps (do not skip):**
9. Update `docs/FEATURES.md` — mark designed features, add new feature IDs, update session order table
10. Update `CLAUDE-STATE.md` — set next session, clear resolved blockers
11. If UI work: update `docs/STYLE-GUIDE.md` with any rules locked this session
12. Commit and push `docs/FEATURES.md`, `CLAUDE-STATE.md`, and the kickoff doc to `dev`
13. End with a clearly bordered code block — the exact Claude Code coding session start prompt:
    ```
    Read docs/kickoffs/[filename].md and CLAUDE-STATE.md, then execute it.
    ```

---

## Step 5 — How to Close a Session

### 5a — Wait for Claude Code to confirm
Node.js tests pass + `npm run build` succeeds. Do not proceed until both confirmed.

### 5b — Present Manual QA Checklist (mandatory)
When John pastes the Claude Code completion report, respond with the Manual QA Checklist from Section 10 of the kickoff doc:
> "Before I close this out — please run these manual checks on the dev URL and report back PASS or FAIL for each item."

⛔ Do NOT update FEATURES.md or CLAUDE-STATE.md until John reports QA results.

### 5c — Act on QA results
- **All PASS** → Mark feature IDs ✅ Done in `docs/FEATURES.md`, update `CLAUDE-STATE.md` (bump version, set next session), commit and push both to dev.
- **Any FAIL** → Full root cause analysis first. Read complete execution path. Compare against NIGP reference. A bug that fails QA once must not fail QA twice. Generate a patch kickoff doc.
- **New requirement found** → Add to `docs/FEATURES.md` as ❌ Missing. Commit and push.

---

## Step 6 — Agent Roster (quick ref)

| Code | Name | Role |
|------|------|------|
| JR-01 | Chloe Okafor | Junior Procurement Analyst |
| SR-02 | Mike Alvarez | Senior Procurement Analyst |
| PR-04 | Bob Whitfield | Professional Analyst / Legal |
| MK-05 | Christy Park | Marketing Designer |
| CN-03 | Robyn Castellanos | NIGP Consultant / Strategist |
| DR-06 | Brent Matthews | Web Agent (Railway + Playwright) |
| IR-07 | Pat Smiley | Intern Researcher (isIntern:true, no RAG) |
| PP-01 | Michelle Manning | Project Manager — stub until S-BENCH-01 |
| TR-08 | Susan Smith | Trainer Agent — stub until S-BENCH-01b |

---

## Step 7 — Repo Access

All local files are directly readable at `C:\Projects\deepbench-frontend\`.
Read source files directly — do not fetch from GitHub URLs in Claude Code sessions.
