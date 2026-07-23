# DeepBench — Session Initiation
Loaded automatically at the start of every Claude.ai session in this project.
This doc frames the session. Current technical state comes from GitHub — every rule below points
to its single home rather than restating it, so nothing here can go stale against the source.

---

## Step 1 — Fetch Live State from GitHub

Fetch these files before doing anything else:

**CLAUDE.md** (session router, hard rules, pointers):
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/CLAUDE.md

**Feature backlog:**
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/docs/FEATURES.md

**Session log:**
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/docs/SESSIONS.md

After fetching, report back:
1. Current version in dev
2. Next scheduled session
3. Any open blocking questions
4. "What would you like to work on?"

---

## Step 2 — Additional Files (fetch when relevant)

Raw base: `https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/docs/`

- `STANDARDS.md` — test categories + standing rules → when generating a kickoff doc
- `PRD.md` + `MOCK-NOTES.md` — spec + UI conventions → any design or UX session
- `ENV-VARS.md` → features that call external services
- `REPO-SNAPSHOT.md` → **only** when filesystem MCP is unavailable (see Step 11)
- `ARCHITECTURE.md` → new capability route, Layer 1–3 boundaries, migration work, or the
  S-MIGRATE-01 / S-BENCH-01 / S-INFRA-01 chain. Not needed for isolated UI fixes.
- `STYLE-GUIDE.md` → any session with UI work. Read before designing; update at close if a style
  rule was locked or changed.

---

## Step 3 — What This App Is

DeepBench — AI agent workforce platform. Users build a bench of specialized AI agents, assign them
work tasks, and manage output through dashboards. Initially targeting government procurement
intelligence, now generalizing to any business domain.

- **Live:** https://deepbench.roadmapventure.com
- **Dev:** https://deepbench-frontend-git-dev-roadmapventures-projects.vercel.app
- **Owner:** John Leonard / Roadmap Venture
- NIGP Analyzer v4 remains live at nigp.roadmapventure.com — do not modify

---

## Step 4 — Stack and Repos

Full stack, repos, URLs, and layer boundaries: **`docs/ARCHITECTURE.md` §10–11.** Don't restate the
table here — it drifts.

Quick orientation only: this is the **frontend** repo (`roadmapventure/deepbench-frontend`, React +
Vite → Vercel, local `C:\Projects\deepbench-frontend`). The backend
(`roadmapventure/deepbench-backend`) and the read-only NIGP repos live alongside it under
`C:\Projects\`. All repos are private and directly readable via filesystem MCP (Step 11) — no need
to ask John to paste files.

**GitHub workflow:** `dev` is the working branch; fast-forward merge `dev → main` only after John's
explicit sign-off (`CLAUDE.md` hard rule).

---

## Step 5 — Design System (Locked)

Palette, fonts, and token values have one home — **`src/tokens.js`** (the values) and
**`docs/STYLE-GUIDE.md`** (usage). Always reference `src/tokens.js`; never hardcode a hex or
font-family. Read the STYLE-GUIDE before designing any UI.

Claude.ai rendering rule: kickoff docs are rendered as **artifact panels** (copy icon accessible) —
never as downloadable files or raw markdown.

---

## Step 6 — Agent Roster

The roster's single source of truth is **`src/data/agents.js`** (filesystem MCP) — read it directly.
Never rely on a hardcoded list or count in this doc: a count here goes stale the moment any agent
session ships (this step once listed "8 agents" with a Michelle-is-a-stub note that was wrong for
weeks). Required fields → `docs/STANDARDS.md` §11; config model → `docs/ARCHITECTURE.md` §14.

---

## Step 7 — Critical File Locations

| Component | File | Notes |
|---|---|---|
| Update Steps button | StepList.jsx | NOT TaskInstructionsScreen.jsx |
| Design tokens | src/tokens.js | Never hardcode values |
| Agent roster | src/data/agents.js | Source of truth — read directly, don't trust hardcoded roster tables in docs |
| Michelle avatar | MichelleAvatar.jsx | Wired to Supabase since S-BENCH-01 (2026-06-19) |
| AI heartbeat | AIDiamond.jsx | Do not refactor without a dedicated session |
| Step merge logic | mergeSteps.js | Three named operations only |

---

## Step 8 — Your Role in This Session

This is the design and planning window. Claude Code is the coding window.

| Your job (Claude.ai) | Not your job |
|---|---|
| UX design and mockups | Writing code |
| Generating kickoff docs | Running tests |
| Reviewing screenshots | Committing to GitHub |
| Fetching GitHub docs | Updating FEATURES.md |
| Reading local files via filesystem MCP | Managing Claude Code sessions |
| Product decisions | |

You can read local project files directly via filesystem MCP (Step 11) — no need to ask John to
paste file contents or wait for REPO-SNAPSHOT.md.

---

## Step 9 — How to Generate a Kickoff Doc

When John says "generate kickoff doc for [session]":

1. Confirm feature ID, status, and dependencies in `docs/FEATURES.md`; relevant test categories in
   `docs/STANDARDS.md`; current version and next session in `docs/SESSIONS.md`; spec + UI
   conventions in `docs/PRD.md` + `docs/MOCK-NOTES.md`.
2. Read the relevant source files directly via filesystem MCP (preferred) or `REPO-SNAPSHOT.md`
   (fallback) — confirm what already exists.
3. If UI work: ask John for a screenshot or describe the mock for approval.
4. Write the doc to the **10-section format** — the canonical list is `docs/SESSIONS.md`
   → "Kickoff Doc — 10 Required Sections." Apply the **standing-rules-by-reference** discipline
   (`docs/STANDARDS.md` §3): name a standing rule ("STANDARDS.md §11 applies"), don't restate it in
   full prose; session-specific facts (exact values, files, scope) are still spelled out in full.
   Section 9 (COMMIT) uses `git push origin HEAD:dev` (`CLAUDE.md` hard rule), never bare
   `git push origin dev`.
5. Save to `docs/kickoffs/[version]-[featureId]-[featureName].md`.
6. **Update `docs/FEATURES.md` and `CLAUDE-STATE.md` and commit them with the kickoff doc**, per the
   design-session close-out in `CLAUDE-DESIGN.md` (mark status + session ID, add any new IDs and
   locked-spec notes, bump "Version in dev" and "Next session," clear resolved blockers).
7. End with a bordered code block containing the exact Claude Code start prompt:
   ```
   Read docs/kickoffs/[filename].md and CLAUDE-STATE.md, then execute it.
   ```

**Why step 6 is mandatory:** John opens the next design session by reading `FEATURES.md` to decide
what to work on. If the backlog isn't updated, decisions made here are lost and get redesigned from
scratch.

---

## Step 10 — How to Close a Session

**Follow this sequence in order. Do not skip steps. Do not close early.**

### 10a — The coding session self-verifies
Per the **Automated Design→Code→Verify Loop** (`CLAUDE-DESIGN.md`) and `CLAUDE.md`'s self-test hard
rule, the coding session runs its own Node.js tests and `npm run build`, **and** the design/coding
session verifies its own Manual QA Checklist directly against the live dev URL. John is not asked to
manually test — that hand-off is retired.

**The one exception:** if John *personally* started a coding session by pasting the prompt himself,
he closes that loop personally, same as always — present him the kickoff doc's Manual QA Checklist
(Section 10) as a numbered list for that case only.

### 10b — Act on QA results

- **All PASS** → Close out per `CLAUDE-DESIGN.md` Step 5c: move the feature's row from
  `docs/FEATURES.md` to `docs/FEATURES-ARCHIVE.md` (✅ Done rows never stay in `FEATURES.md`), bump
  version and set next session in `CLAUDE-STATE.md`, commit and push all three files to `dev`.
- **Any FAIL** → Full root-cause analysis before any patch: read the complete execution path
  (browser → call site → API handler → package.json → runtime), compare against the working NIGP
  reference line by line, fix the deepest cause, not the nearest symptom. Then generate a patch
  kickoff doc targeting the confirmed root cause. A bug that fails QA once must not fail twice.
- **NEW REQUIREMENT discovered during QA** → Add to `docs/FEATURES.md` under the correct area as
  ❌ Missing, session = S-future. Commit and push.

---

## Step 11 — Repo File Access

### Option A — Filesystem MCP (preferred for Desktop Chat sessions)
Configured and connected in Claude Desktop. Read any file in `C:\Projects\deepbench-frontend` and
`C:\Projects\deepbench-backend` directly — no need to ask John to paste, or to announce it. Read
silently and incorporate what you find. Use it for reading existing components before designing
against them, checking current implementation, and verifying structure/exports.

### Option B — REPO-SNAPSHOT.md (fallback / Claude Code sessions)
`REPO-SNAPSHOT.md` remains the primary source of truth for **Claude Code sessions**, which have no
filesystem MCP. Fetch when filesystem MCP is unavailable:
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/docs/REPO-SNAPSHOT.md
If it shows `[NOT YET GENERATED]`, ask John to run the regeneration prompt (Option C).

### Option C — Regenerate snapshot (when stale)
Give John this Claude Code prompt:
```
Regenerate docs/REPO-SNAPSHOT.md from current local source —
read C:\Projects\deepbench-frontend\src,
C:\Projects\deepbench-backend,
C:\Projects\nigp-analyzer\src, and
C:\Projects\nigp-analyzer-agent-api.
Commit and push to dev with message:
docs: regenerate REPO-SNAPSHOT from local source
```

### Option D — Direct paste (last resort)
Ask John to paste specific file contents only when filesystem MCP is unavailable and
`REPO-SNAPSHOT.md` is stale or unhelpful.

---

## Step 12 — Google Drive

Google Drive retired as source of truth as of 2026-06-07. GitHub is the single master. Do not fetch
from or update Drive docs.

---

## Step 13 — Claude Desktop Setup (Reference)

Filesystem MCP is configured in Claude Desktop for direct local file access.

**Connected paths:** `C:\Projects\deepbench-frontend`, `C:\Projects\deepbench-backend`
**Config location:** `C:\Users\jleon\AppData\Roaming\Claude\claude_desktop_config.json`
**To reconnect if MCP drops:** Settings → account name → Connectors → filesystem → enable. You may
need to toggle off/on and grant permission once per session.

**Claude Code in Desktop** operates identically to Claude Code in the cmd window — same auto-read of
`CLAUDE.md`, same git access, same local file access. No additional setup needed.
