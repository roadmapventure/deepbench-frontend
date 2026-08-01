# design-log-121

Worktree: `.claude/worktrees/design-log-121` (branch switched to `session/log-121-coding`
for the coding leg, per CLAUDE-DESIGN.md's Automated Design→Code→Verify Loop).

Design session for **LOG-121** (Observability, Post-beta) — caller attribution on every AI call.
Split into two coding sessions; `S-LOG-121a` (v7.0.34, capture side) kicked off from
`docs/kickoffs/v7.0.34-LOG-121a-caller-attribution-capture.md`. Migration
`log_121a_caller_attribution_columns` already applied live (5 nullable columns, no backfill).

`S-LOG-121b` (read side — `ip_org_cache` + IP→org resolver + the By Platform User drawer)
is designed in outline on the `LOG-121` row but has no kickoff doc yet.

Started 2026-08-01 12:40 CST.
