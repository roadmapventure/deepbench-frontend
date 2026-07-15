# DeepBench v5.1 — Documentation

This `/docs` folder contains the permanent reference documentation for the DeepBench codebase. These files are read by Claude Code at the start of every session via `CLAUDE.md` in the repo root.

---

## Files

| File | Purpose | Who Uses It |
|------|---------|-------------|
| `/CLAUDE.md` (repo root) | **Auto-read by Claude Code every session.** Compact briefing covering stack, rules, design system, agent roster, critical patterns, and pre-commit checklist. | Claude Code (automatic) |
| `docs/ARCHITECTURE.md` | Full technical architecture: routing, database schema, external services, AI architecture, locked decisions. | Claude Code (referenced in kickoff docs) |
| `docs/STANDARDS.md` | Complete coding and testing standards: session scope rules, kickoff doc structure, Node.js test categories, verification checklist, browser checklist, manual QA rules. | Claude Code (referenced in kickoff docs) |
| `docs/FEATURES.md` | Full feature inventory: all features by area, status, assigned session, open questions. Live, git-tracked — this file itself is the source of truth, not a snapshot of anything else. | Claude Code + John |
| `docs/SCREEN-INVENTORY.md` | **New 2026-07-15.** Real Product Area → Screen → Child Screen taxonomy (Home/Work/Bench/Platform), pulled from `main.jsx`/`AppShell.jsx`, not the feature-ID area-prefix legend — resolves several screen-naming mismatches. Read before proposing a feature-ID format redesign or naming any new screen. | Claude Code + John |
| `docs/SESSIONS.md` | Session log, how-to-start guides for coding and UX review sessions, architectural decisions log. | John + Claude.ai |

---

## Google Drive — retired 2026-06-07, do not use for DeepBench project information

**This project's planning docs used to live in Google Drive; they don't anymore.** Everything — feature inventory, session state, standards, PRD, mocks — now lives in this repo's `.md` files under git, which is the only source of truth. The Drive doc IDs that used to be listed here are stale by definition (nothing has written to them since the 2026-06-07 migration) and must not be fetched or treated as current for anything DeepBench-related, even if a Drive connector is available in a given session.

**Updated 2026-07-15 (John's explicit call):** if a session has Google Drive/Docs access as a tool, do not use it to look up DeepBench information under any circumstances — the `.md` files in this repo are always more current. Drive access, if used at all in a DeepBench session, is for something the user explicitly asks for by name (e.g. "check this specific Drive doc I'm sharing with you"), never as a default information source.

**Claude Code** reads from GitHub (`CLAUDE.md`, `docs/`) at the start of every session — this has been true since the migration and remains the only correct source.

John does not manually manage tracking docs. John's job is: describe what you want → approve → report QA results (the last of which is now largely automated too — see `CLAUDE.md`'s self-verify hard rule).
