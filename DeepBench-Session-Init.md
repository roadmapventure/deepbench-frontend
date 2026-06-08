# DeepBench — Session Initiation
Loaded automatically at the start of every Claude.ai session in this project.
This doc frames the session. Current technical state comes from GitHub.

---

## Step 1 — Fetch Live State from GitHub

Fetch these files before doing anything else:

**CLAUDE.md** (current state, rules, design system):
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

**Standards and test categories:**
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/docs/STANDARDS.md

**Full PRD and feature spec:**
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/docs/PRD.md

**Screen-by-screen mock and UI conventions:**
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/docs/MOCK-NOTES.md

**Environment variables reference:**
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/docs/ENV-VARS.md

**Codebase inventory (GitHub fallback — use when filesystem MCP is unavailable):**
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/docs/REPO-SNAPSHOT.md

**Architecture decisions:**
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/docs/ARCHITECTURE.md

**When to fetch each:**
- PRD + MOCK-NOTES → any design or UX session
- STANDARDS → when generating a kickoff doc
- ENV-VARS → when designing features that call external services
- REPO-SNAPSHOT → only when filesystem MCP is unavailable (see Step 11)
- ARCHITECTURE → when a feature touches core architectural decisions

---

## Step 3 — What This App Is

DeepBench v5.1 — AI agent workforce platform. Users build a bench of specialized AI agents, assign them work tasks, and manage output through dashboards. Initially targeting government procurement intelligence, now generalizing to any business domain.

- **Live:** https://deepbench.roadmapventure.com
- **Dev:** https://deepbench-frontend-git-dev-roadmapventures-projects.vercel.app
- **Owner:** John Leonard / Roadmap Venture
- NIGP Analyzer v4 remains live at nigp.roadmapventure.com — do not modify

---

## Step 4 — Stack and Repos

| Layer | Tech | Repo | Local Path |
|---|---|---|---|
| Frontend | React + Vite | roadmapventure/deepbench-frontend → Vercel | C:\Projects\deepbench-frontend |
| Backend | Node.js + Playwright | roadmapventure/deepbench-backend → Railway | C:\Projects\deepbench-backend |
| NIGP Frontend | React | roadmapventure/nigp-analyzer (read-only) | C:\Projects\nigp-analyzer |
| NIGP Backend | Node.js | roadmapventure/nigp-analyzer-agent-api (read-only) | C:\Projects\nigp-analyzer-agent-api |
| Database | Supabase + pgvector | — | — |
| Storage | Supabase bucket task-data | — | — |
| AI | Anthropic Claude (Haiku + Sonnet) | — | — |
| Embeddings | OpenAI text-embedding-3-small | — | — |

**GitHub workflow:** dev branch is working branch. Fast-forward merge dev → main only after John explicitly confirms QA passed.

All repos are private. Local paths at `C:\Projects\` are directly accessible via filesystem MCP — no need to ask John to paste file contents. See Step 11.

---

## Step 5 — Design System (Locked)

Treasury Palette — always reference src/tokens.js, never hardcode:

```
Background:  #ddd5be (paperDeep)   #f8f2e2 (card)    #f2ead4 (cardAlt)
Navy:        #12243c  #1a2e4a  #0b1929
Brass:       #b6873a  #886224  #e4c786
Moss:        #5a7538  #a6bc82
Flag red:    #a83319
Muted:       #786d52  #58503a
Lines:       #c8bb9a  #d8cbac
```

Fonts: Fraunces (display), Inter (body), JetBrains Mono (labels)
Corner ornaments: 9px brass SVG on cards.
✦ AI badge on every AI-touched UI element.

Kickoff docs rendered as artifact panels (copy icon accessible) — never as downloadable files or raw markdown.

---

## Step 6 — Agent Roster

| Code | Name | Role | Notes |
|---|---|---|---|
| JR-01 | Chloe Okafor | Junior Procurement Analyst | |
| SR-02 | Mike Alvarez | Senior Procurement Analyst | |
| PP-01 | Michelle Manning | Project Planner | Stub only until S-BENCH-01 |
| PR-04 | Bob Whitfield | Professional Analyst / Legal | |
| CN-03 | Robyn Castellanos | NIGP Consultant / Strategist | |
| MK-05 | Christy Park | Marketing Designer | |
| DR-06 | Brent Matthews | Web Agent (Railway + Playwright) | |
| IR-07 | Pat Smiley | Intern Researcher | isIntern:true, no RAG |

Michelle stub until S-BENCH-01: `const MICHELLE = { name: "Michelle Manning", code: "PP-01", initials: "MM" }`

AIDiamond.jsx — animated heartbeat component (S15a). Do not refactor without a dedicated session.

---

## Step 7 — Critical File Locations

| Component | File | Notes |
|---|---|---|
| Update Steps button | StepList.jsx | NOT TaskInstructionsScreen.jsx |
| Design tokens | src/tokens.js | Never hardcode values |
| Agent roster | src/data/agents.js | Do not add Michelle until S-BENCH-01 |
| Michelle avatar | MichelleAvatar.jsx | Stub — Supabase wiring S-BENCH-01 |
| AI heartbeat | AIDiamond.jsx | Do not refactor |
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

**Note:** You can now read local project files directly via filesystem MCP (see Step 11). You no longer need to ask John to paste file contents or wait for REPO-SNAPSHOT.md to load.

---

## Step 9 — How to Generate a Kickoff Doc

When John says "generate kickoff doc for [session]":

1. Fetch FEATURES.md — confirm feature ID, status, dependencies
2. Fetch STANDARDS.md — confirm relevant test categories
3. Fetch SESSIONS.md — confirm current version and next session
4. Fetch PRD.md + MOCK-NOTES.md — confirm spec and UI conventions
5. Read relevant source files directly via filesystem MCP (preferred) or REPO-SNAPSHOT.md (fallback) — confirm what already exists
6. If UI work: ask John for screenshot or describe mock for approval
7. Write kickoff doc with all 10 required sections
8. Save kickoff doc to `docs/kickoffs/[version]-[featureId]-[featureName].md`
9. **Update `docs/FEATURES.md` (mandatory — do not skip):**
   - Mark newly designed features with correct status (🔶 Partial) and session ID
   - Add any new feature IDs created during this design session
   - Add locked spec notes block for the feature (decisions made this session)
   - Update session order table if sessions were split or new sessions added
   - Remove any resolved blocking questions from Open Questions table
10. **Update `CLAUDE.md` Section 12 (mandatory — do not skip):**
    - Set "Next session" to the new session name + kickoff doc path
    - Clear any blocking questions that were resolved this session
11. Commit and push `docs/FEATURES.md`, `CLAUDE.md`, and the kickoff doc to `dev` in a single commit
12. End with a clearly bordered code block containing the exact Claude Code start prompt:
    ```
    Read CLAUDE.md then read docs/kickoffs/[filename].md and execute it.
    ```

**Why steps 9–11 are mandatory:** John opens the next design session by reading FEATURES.md to decide what to work on. If the backlog isn't updated at the end of this session, decisions made here are lost and will be redesigned from scratch.

---

## Step 10 — How to Close a Session

When John reports QA results:

- **All PASS** → give John this Claude Code prompt: "Close [FEATURE-ID] — mark complete in docs/FEATURES.md, session = [name]. Commit and push."
- **Any FAIL** → generate a patch kickoff doc
- **NEW REQUIREMENT** → give John this Claude Code prompt: "Add [requirement] to docs/FEATURES.md under [area] as ❌ Missing, session = S-future. Commit and push."

---

## Step 11 — Repo File Access

### Option A — Filesystem MCP (preferred for Desktop Chat sessions)
The filesystem MCP is configured and connected in Claude Desktop. You may read any file in `C:\Projects\deepbench-frontend` and `C:\Projects\deepbench-backend` directly without asking John to paste them.

Use this for:
- Reading existing components before designing against them
- Checking current implementation of any screen or feature
- Verifying file structure and exports
- Anything where knowing what's already built matters

To read a file, just do it — no need to ask permission or announce it. Read silently and incorporate what you find.

### Option B — REPO-SNAPSHOT.md (fallback / Claude Code sessions)
REPO-SNAPSHOT.md is still maintained and valuable — it's the primary source of truth for **Claude Code sessions**, which do not have filesystem MCP access.

Fetch when filesystem MCP is unavailable:
https://raw.githubusercontent.com/roadmapventure/deepbench-frontend/dev/docs/REPO-SNAPSHOT.md

If it shows `[NOT YET GENERATED]`, ask John to run the regeneration prompt (see Option C).

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
Ask John to paste specific file contents only when filesystem MCP is unavailable and REPO-SNAPSHOT.md is stale or unhelpful.

---

## Step 12 — Google Drive

Google Drive retired as source of truth as of 2026-06-07.
GitHub is the single master. Do not fetch from or update Drive docs.

---

## Step 13 — Claude Desktop Setup (Reference)

Filesystem MCP is configured in Claude Desktop for direct local file access.

**Connected paths:**
- `C:\Projects\deepbench-frontend`
- `C:\Projects\deepbench-backend`

**Config location:** `C:\Users\jleon\AppData\Roaming\Claude\claude_desktop_config.json`

**To reconnect if MCP drops:** Settings → account name → Connectors → filesystem → enable. You may need to toggle off/on and grant permission once per session.

**Claude Code in Desktop** operates identically to Claude Code in the cmd window — same auto-read of CLAUDE.md, same git access, same local file access. No additional setup needed.
