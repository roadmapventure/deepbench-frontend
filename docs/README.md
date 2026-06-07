# DeepBench v5.1 — Documentation

This `/docs` folder contains the permanent reference documentation for the DeepBench codebase. These files are read by Claude Code at the start of every session via `CLAUDE.md` in the repo root.

---

## Files

| File | Purpose | Who Uses It |
|------|---------|-------------|
| `/CLAUDE.md` (repo root) | **Auto-read by Claude Code every session.** Compact briefing covering stack, rules, design system, agent roster, critical patterns, and pre-commit checklist. | Claude Code (automatic) |
| `docs/ARCHITECTURE.md` | Full technical architecture: routing, database schema, external services, AI architecture, locked decisions. | Claude Code (referenced in kickoff docs) |
| `docs/STANDARDS.md` | Complete coding and testing standards: session scope rules, kickoff doc structure, Node.js test categories, verification checklist, browser checklist, manual QA rules. | Claude Code (referenced in kickoff docs) |
| `docs/FEATURES.md` | Full feature inventory: all features by area, status, assigned session, open questions. Static snapshot — live version in Google Drive. | Claude Code + John |
| `docs/SESSIONS.md` | Session log, how-to-start guides for coding and UX review sessions, architectural decisions log. | John + Claude.ai |

---

## Google Drive Docs (live source of truth for planning)

| Document | ID |
|----------|----|
| Session Queue & Context | `1izzrv7pF7lLZSAlV-AAwWLVh_uGKGrNGioqva1YXSn4` |
| Standards Master | `19G6BZsxqfF3wQKtLl6P_KT9MqtkmxEfRTLBfj7mXccE` |
| Feature Inventory | `1NNRE65of3bj7wMzHg3cVIFKq_k1CHvdKicFsW5V8L-I` |
| PRD | `1zkz7EdnMoNHHoGRLEu6dQdiz1iUGdEQsJ5HlWzOCZhE` |
| Mock | `1uY9IMXwHoMfKFdeK9cUlMnjIiHhhWGbuxFFNs8q6WZI` |

Always fetch Drive docs by ID — never search by name (searching returns stale versions).

---

## Rule: Claude.ai Owns Drive. Claude Code Owns GitHub.

**Claude.ai** updates Google Drive docs (Session Queue, Feature Inventory, Standards Master) after every session.

**Claude Code** reads from GitHub (CLAUDE.md, docs/) at the start of every session.

John does not manually manage either. John's job is: describe what you want → approve → report QA results.
