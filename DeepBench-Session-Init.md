<!-- DeepBench v7.0.186 | DeepBench-Session-Init.md | SES-120 — rewritten from a process doc into a POINTER doc. It taught the retired markdown-era ceremony: fetch docs/FEATURES.md as "the backlog", update its rows, move ✅ Done rows to FEATURES-ARCHIVE.md, file new work as ❌ Missing. None of that has been true since v7.0.112/v7.0.113 (John's "table is authority" call) — tickets live in public.backlog_items and those files are legend-only stubs. RETIRED, not deleted: John confirmed the claude.ai browser and mobile chat surfaces are still in use, so this doc still has a job — it is just a smaller one. The boundary it now states is the whole point: a chat surface has no SQL and no git, so it ORIENTS and DISCUSSES; a Claude Code session FILES and BUILDS. The board's chat-readable copy is docs/backlog/BACKLOG-SNAPSHOT.md, which is exactly right for a surface without SQL. Orientation that is still true (what the app is, URLs, tokens/roster/architecture pointers, file access, Desktop setup) is kept as-is. -->

# DeepBench — Session Initiation
Loaded automatically at the start of every Claude.ai session in this project.

This doc frames the session and points at the real sources. **Nothing here restates a rule or a
ticket** — every fact lives in exactly one home, and the homes are on GitHub, so nothing in this doc
can go stale against them.

---

## Step 0 — What this surface is for

You are on a **chat surface** (claude.ai in the browser, or mobile). You have no SQL connection and
no git access.

| This surface (claude.ai chat) | Claude Code |
|---|---|
| Orient: what is the state, what is queued, what did the last session do | File and build |
| Discuss and decide: scope, UX, priority, what a ticket really means | Write code, run tests, push to `dev` |
| Draft a kickoff doc for a Code session to execute | Write to `public.backlog_items` and claim version numbers |
| Read anything on GitHub | Everything that mutates the repo or the board |

**So: never try to update the backlog from here.** The board is a Supabase table
(`public.backlog_items`); it is not a file you can edit, and the markdown files that used to hold it
are stubs. If a discussion here produces a new ticket or a status change, the deliverable is *the
decision plus a kickoff doc* — a Code session files it.

---

## Step 1 — Fetch live state

Raw base: `https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/`

Fetch these before doing anything else:

**Rules and the session router** — `CLAUDE.md`
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/CLAUDE.md

**Current version, blockers, in-flight sessions** — `CLAUDE-STATE.md`
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/CLAUDE-STATE.md

**The board** — `docs/backlog/BACKLOG-SNAPSHOT.md`
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/docs/backlog/BACKLOG-SNAPSHOT.md

`BACKLOG-SNAPSHOT.md` is the git-committed copy of `public.backlog_items`, regenerated at every
runner ship point. It is the authoritative offline copy of the board, not a mirror — which is what
makes it the right source for a surface that cannot run SQL. **It is large (~650 KB).** Don't try to
read it end to end on mobile: search it for the ticket ID or a keyword, or read its header (which
documents the row format and carries the ticket count and payload `sha256`) and ask for the slice
you need. Ordering is `backlog_items.queue`; the board **is** the queue.

Then report back:
1. Current version in `dev`
2. What is at the top of the queue
3. Any open blocking questions
4. "What would you like to work on?"

---

## Step 2 — Additional files (fetch when relevant)

Raw base: `.../dev/docs/`

- `SESSIONS.md` — session history and the "found live" rationale behind the rules
- `STANDARDS.md` — test categories, standing rules, the 11-section kickoff structure
- `PRD.md` + `MOCK-NOTES.md` — spec + UI conventions → any design or UX session
- `ARCHITECTURE.md` — new capability route, Layer 1–3 boundaries, migrations, §19v (the runner's
  governing section). Not needed for isolated UI fixes.
- `STYLE-GUIDE.md` — any session with UI work; read before designing
- `ENV-VARS.md` — features that call external services
- `REPO-SNAPSHOT.md` — the **source tree** snapshot (a different artifact from the backlog
  snapshot), **only** when filesystem MCP is unavailable (see Step 8)

`docs/FEATURES.md`, `FEATURES-NEXT.md` and `FEATURES-LATER.md` are **legend-only stubs** since
`v7.0.113`. `FEATURES.md` is still worth fetching for one thing — the **Priority Class legend**
(`P1 - Improves John's Skills` … `P10 - Tooling`), which is the canonical list. It holds no tickets.
`docs/FEATURES-ARCHIVE.md` is a frozen historical archive; nothing is ever appended to it.

---

## Step 3 — What this app is

DeepBench — AI agent workforce platform. Users build a bench of specialized AI agents, assign them
work tasks, and manage output through dashboards. Scope/positioning: **`docs/ARCHITECTURE.md` §0** —
not restated here (restated facts drift, per this doc's own rule).

- **Live:** https://deepbench.roadmapventure.com
- **Dev:** https://deepbench-frontend-git-dev-roadmapventures-projects.vercel.app
- **Owner:** John Leonard / Roadmap Venture
- NIGP Analyzer v4 remains live at nigp.roadmapventure.com — do not modify

Full stack, repos, URLs and layer boundaries: **`docs/ARCHITECTURE.md` §10–11.** Not restated here —
it drifts.

Quick orientation only: this is the **frontend** repo (`roadmapventure/deepbench-frontend`, React +
Vite → Vercel, local `C:\Projects\deepbench-frontend`). The backend
(`roadmapventure/deepbench-backend`) and the read-only NIGP repos live alongside it under
`C:\Projects\`. All repos are private and directly readable via filesystem MCP (Step 8).

**GitHub workflow:** `dev` is the working branch; fast-forward merge `dev → main` only after John's
explicit sign-off (`CLAUDE.md` hard rule).

---

## Step 4 — Design system (locked)

Palette, fonts and token values have one home — **`src/tokens.js`** (the values) and
**`docs/STYLE-GUIDE.md`** (usage). Always reference `src/tokens.js`; never hardcode a hex or a
font-family. Read the STYLE-GUIDE before designing any UI.

Claude.ai rendering rule: kickoff docs are rendered as **artifact panels** (copy icon accessible) —
never as downloadable files or raw markdown.

---

## Step 5 — Agent roster

The roster's single source of truth is **`src/data/agents.js`** — read it directly. Never rely on a
hardcoded list or count in this doc: a count here goes stale the moment any agent session ships
(this step once listed "8 agents" with a Michelle-is-a-stub note that was wrong for weeks). Required
fields → `docs/STANDARDS.md` §11; config model → `docs/ARCHITECTURE.md` §14.

---

## Step 6 — Critical file locations

| Component | File | Notes |
|---|---|---|
| Update Steps button | StepList.jsx | NOT TaskInstructionsScreen.jsx |
| Design tokens | src/tokens.js | Never hardcode values |
| Agent roster | src/data/agents.js | Source of truth — read directly, don't trust roster tables in docs |
| AI heartbeat | AIDiamond.jsx | Do not refactor without a dedicated session |
| Step merge logic | mergeSteps.js | Three named operations only |

---

## Step 7 — How to generate a kickoff doc

When John says "generate kickoff doc for [session]":

1. Confirm the ticket's ID, status, `tier` and `priority_class` in
   `docs/backlog/BACKLOG-SNAPSHOT.md`; relevant test categories in `docs/STANDARDS.md`; current
   version and recent history in `CLAUDE-STATE.md` + `docs/SESSIONS.md`; spec and UI conventions in
   `docs/PRD.md` + `docs/MOCK-NOTES.md`.
2. Read the relevant source files directly via filesystem MCP (preferred) or `REPO-SNAPSHOT.md`
   (fallback) — confirm what already exists rather than assuming.
3. If UI work: ask John for a screenshot, or describe the mock for approval.
4. Write the doc to the canonical **11-section** kickoff structure, enumerated in
   `docs/STANDARDS.md` §3. Apply the **standing-rules-by-reference** discipline (same section): name
   a standing rule ("STANDARDS.md §11 applies"), don't restate it in full prose; session-specific
   facts (exact values, files, scope) are still spelled out in full. Section 9 (COMMIT) uses
   `git push origin HEAD:dev` (`CLAUDE.md` hard rule), never bare `git push origin dev`.
5. Name it `docs/kickoffs/[version]-[ticketId]-[shortName].md`. **You cannot save it from here** —
   hand it to John as an artifact panel; the Code session writes it into the repo.
6. End with a bordered code block containing the exact Claude Code start prompt — including the
   model line (`CLAUDE-DESIGN.md` standing rule: a prompt without a model line is incomplete,
   2026-07-28; also tell John the model in chat):
   ```
   Read docs/kickoffs/[filename].md and CLAUDE-STATE.md, then execute it.
   Model: [the model the kickoff doc names — default Opus 5 for coding]
   ```

**What this surface does NOT do at close:** it does not mark the ticket `designed`, does not insert
new ticket IDs, and does not bump the version. Those are Supabase and counter writes — the Code
session's close-out, per `CLAUDE-DESIGN.md` steps 9–10. Handing over a decision without those writes
is expected here; handing one over *without a kickoff doc* is how a decision gets lost and
redesigned from scratch.

---

## Step 8 — Repo file access

**Option A — Filesystem MCP (preferred for Desktop chat sessions).** Configured in Claude Desktop.
Read any file in `C:\Projects\deepbench-frontend` and `C:\Projects\deepbench-backend` directly — no
need to ask John to paste, or to announce it. Read silently and incorporate what you find.

**Option B — raw GitHub (browser and mobile).** Every path in this doc is fetchable from the raw
base in Step 1. This is the normal route on a surface with no MCP.

**Option C — `docs/REPO-SNAPSHOT.md` (fallback).** The source-tree snapshot, for when filesystem MCP
is unavailable and a raw fetch per file is too slow. If it shows `[NOT YET GENERATED]`, ask John to
run the regeneration prompt in a Code session.

**Option D — direct paste (last resort).** Ask John to paste file contents only when the options
above are unavailable or stale.

---

## Step 9 — Reference

**Google Drive** was retired as a source of truth 2026-06-07. GitHub is the single master. Do not
fetch from or update Drive docs.

**Claude Desktop setup.** Filesystem MCP connected paths: `C:\Projects\deepbench-frontend`,
`C:\Projects\deepbench-backend`. Config: `C:\Users\jleon\AppData\Roaming\Claude\claude_desktop_config.json`.
To reconnect if MCP drops: Settings → account name → Connectors → filesystem → enable (may need an
off/on toggle and a permission grant once per session).

**Claude Code in Desktop** operates identically to Claude Code in the cmd window — same auto-read of
`CLAUDE.md`, same git access, same local file access. No additional setup needed.
