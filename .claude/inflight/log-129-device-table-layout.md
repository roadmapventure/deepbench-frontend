# log-129-device-table-layout

Worktree: `.claude/worktrees/log-129-device-table-layout` (branch `session/log-129-device-table-layout`)

Follow-up on `LOG-121`/`LOG-127` (both archived): John reviewed the shipped By Platform
User drawer and asked for two changes, both confirmed:

1. **Table layout.** By Source / By Caller currently render as bordered card-rows; John
   expected a real table (header row, plain rows, no per-row box) matching the original
   mock. Converting both, plus the new section below, to match.
2. **New By Device section**, a third reconciling cut of the same rows (Desktop/Mobile/
   Unknown), aggregate across everyone — not nested per caller.

Started 2026-08-01 CST.
