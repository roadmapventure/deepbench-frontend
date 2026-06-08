# S-MIGRATE-UX — Design Notes
> Session: S-MIGRATE-UX | Date: 2026-06-08 | Status: ✅ COMPLETE
> This doc captures all UX/UI design decisions made this session.
> The S-MIGRATE-01 design session reads this doc before designing the coding kickoff.

---

## Screen 1 — Roster (`/bench`)

### Decision: Adopt NIGP "Build your analyst team." design verbatim

**Adopt from NIGP `TeamBuilder.jsx`:**
- Headline: "Build your analyst team." (replaces "Your bench.")
- Subtitle: "Each analyst is a trainable AI agent with their own specialty, knowledge base, and price per report. The more you feed them, the sharper they get."
- Illustrated SVG avatars per agent (inline SVG in TeamBuilder.jsx lines ~292–333) — skin tone, hair, collar, extras (Bob: tie, Mike: glasses, Robyn: bun, Brent: field vest, Pat/Christy: bob, Chloe: freckles). Avatar config lives in a `cfg` object keyed by agent id.
- 5-stop labeled skill bar with tick marks at 30/55/75/90 and labels: Trainee · Developing · Proficient · Expert · Principal (replaces plain fill bar).

**Remove:**
- "Back to Dashboard" button — DeepBench AppShell handles nav
- "Test My Team" button from header — see WK-XX below

**Keep from DeepBench:**
- Stats strip unchanged (Bench Size · Annual Salary · Annual Value · Reports / Mo · Trainable Agents)
- "Add a Player" action: moved to right side of stats strip as a subtle `+` text/link (not a primary button)
- Vacancy card at end of grid — stays as primary click-target for `/bench/new`. Clicking it navigates to `/bench/new` (same as current).
- All other card content: specialty, situational awareness bar, show/hide details drawer, action row (View Profile / Add Training)

**Feature documented for future (WK-XX):**
- "Test My Team" — batch-run all bench agents against a sample dataset to compare output quality. Entry point: button on Roster screen header. Belongs in the Work session chain (S-WORK-XX, not yet scheduled). Do not implement in S-MIGRATE-01 or S-MIGRATE-02.

---

## Screen 2 — Personnel File (`/bench/:agentId`)

### Decision: Adopt NIGP left-sidebar nav layout

**Adopt from NIGP `PersonnelScreen.jsx`:**
- Left sidebar nav replaces horizontal tab bar
- Nav structure (2 groups, not 3):
  ```
  OVERVIEW
    ◈ Profile

  CONFIGURE
    ▣ Resume
    ◎ Training
    ⬟ Playbook
  ```
- "OPERATE" section label: **gone**
- "Assignments" and "Completed Projects" nav items: **gone** (see below)
- "← Team Builder" bottom-left button: **gone**
- Page header: same (breadcrumb + "The personnel file of {name}." serif headline + 3 stat badges)
- Profile tab 2-col layout: Left (ID Badge card + Compensation card), Right (Readiness Score + Intelligence Configuration + Quick Stats)
- NIGP's Quick Stats card includes Situational Awareness bar + Skill Level bar (already has them — keep)

**Remove from NIGP:**
- "← Back to Dashboard" from NIGP top bar — DeepBench AppShell handles this
- "← Team Builder" bottom-left button

**Keep from DeepBench (additive to NIGP):**
- **Active Work Assignments** section below the 2-col grid on Profile tab — mock data, not wired yet
- **Recently Completed** section below Active Work Assignments — mock data, not wired yet
- These sections are the replacement for the removed "Assignments" and "Completed Projects" nav items
- The MOCK_ENTRIES / AGENT_TASKS / AGENT_COMPLETED data from DeepBench's PersonnelScreen can be reused as-is

**Profile tab avatar:**
- Stays as initial circle (same as NIGP PersonnelScreen ProfileTab) — illustrated avatar is Roster-only

**Future sessions (do NOT scope in S-MIGRATE-01 or S-MIGRATE-02):**
- Resume sub-page: design in a future session pulling from NIGP
- Training sub-page: design in a future session pulling from NIGP (NIGP has inline Teach + Test sub-views — much better than separate routes)
- Playbook sub-page: design in a future session pulling from NIGP
- When Training inline sub-views adopted: `TeachScreen.jsx` and `TestTeamScreen.jsx` become deprecated routes
- Assignments + Completed: live wiring to `tasks` table filtered by agent_id — future session

---

## Session Split

| Session | Scope | Files | Status |
|---------|-------|-------|--------|
| S-MIGRATE-01-design | Design session: produce coding kickoff for S-MIGRATE-01 | — | ← NEXT |
| S-MIGRATE-01 | **Visual port only**: Roster NIGP design + Personnel File left-nav layout | RosterScreen.jsx, PersonnelScreen.jsx, agents.js (avatar config) | ⏳ Pending |
| S-MIGRATE-02 | **Data wiring**: Training tab live `/api/load-entries` + Playbook tab live `output_format` CRUD | PersonnelScreen.jsx (or extracted tab files) | ⏳ Pending |

---

## Key Source Files for S-MIGRATE-01

| What to port | Source location |
|---|---|
| Illustrated SVG avatars | `C:\Projects\nigp-analyzer\src\TeamBuilder.jsx` lines ~290–333 (AgentAvatar function + cfg object) |
| 5-stop labeled skill bar | `C:\Projects\nigp-analyzer\src\TeamBuilder.jsx` lines ~336–348 (SkillBar function) |
| Roster masthead + layout | `C:\Projects\nigp-analyzer\src\TeamBuilder.jsx` lines ~363–420 (RosterScreen function) |
| Personnel left-nav structure | `C:\Projects\nigp-analyzer\src\PersonnelScreen.jsx` lines ~49–60 (NAV_GROUPS) |
| Personnel page header | `C:\Projects\nigp-analyzer\src\PersonnelScreen.jsx` lines ~255–293 (PageHeader function) |
| Profile tab layout | `C:\Projects\nigp-analyzer\src\PersonnelScreen.jsx` lines ~299–406 (ProfileTab function) |

---

## What S-MIGRATE-01 Must NOT Touch

- `ResumeTab.jsx` — already live and working, do not modify
- `mergeSteps.js` — step merge logic, never touch without dedicated session
- `AppShell.jsx` — nav shell, not in scope
- `agents.js` — only add avatar config data; do not modify existing agent properties
- `CLAUDE.md` Section 7 (Three Named Step Operations) — locked
