<!-- DeepBench | docs/README.md | Rewritten 2026-08-23 (Selfbuild sweep, docs/SELFBUILD-RETIREMENT-LEDGER.md) — the old version claimed FEATURES.md was "the source of truth" and listed 6 files; the backlog lives in public.backlog_items now. -->
# DeepBench — Documentation Index

One-page index. Every fact has exactly one home; this page only points.

**Start here:** `/CLAUDE.md` (repo root) — the session router and hard rules. It routes every
session and points at everything below.

## Where things live

| Need | Home |
|---|---|
| Session router, hard rules | `/CLAUDE.md` (repo root) |
| **The backlog / ticket board** | **`public.backlog_items` (Supabase)** — not a file. Git-committed copy: `docs/backlog/BACKLOG-SNAPSHOT.md`. `docs/FEATURES*.md` are legend-only stubs (ID format, Type taxonomy, Priority Class legend) |
| Session procedures (worktree, counters, inflight, push) | `docs/runbooks/session-setup.md` + the rest of `docs/runbooks/` |
| Governance modes (Manual / Automated / open) | `docs/GOVERNANCE-MODES.md` |
| The Selfbuild project charter | `docs/SELFBUILD-CHARTER.md` |
| Architecture (stack, schema, layers, §19v runner invariants) | `docs/ARCHITECTURE.md` |
| Coding/testing standards, kickoff structure | `docs/STANDARDS.md` |
| Working with John (autonomy tiers, communication) | `docs/WORKING-WITH-JOHN.md` |
| Session history + rationale behind the rules | `docs/SESSIONS.md` |
| Rules/statements retired by the Selfbuild project | `docs/SELFBUILD-RETIREMENT-LEDGER.md` |

## Standing notes

- **Google Drive was retired 2026-06-07** — this repo's git-tracked files are the only source
  of truth. Never fetch DeepBench information from Drive, even if a connector is available,
  unless John names a specific Drive doc explicitly.
- John does not manually manage tracking docs. His job: describe what he wants → approve →
  judge evidence (briefing Accept/Reverse/Rework, or in-chat for manual sessions).
