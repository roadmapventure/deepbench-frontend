# log-127-caller-merge-fix

Worktree: `.claude/worktrees/log-127-caller-merge-fix` (branch `session/log-127-caller-merge-fix`)

Patch session on `LOG-121`/`LOG-124` (both already archived): fixes a live identity-merge
defect found while John reviewed the By Platform User drawer 2026-08-01. Two changes, one
file (`src/hooks/useAIActivity.js`):

1. Collapse the `Internal (QA)` / `Public` host-based split back to exactly the three
   buckets John specified (him / Claude / everyone else) — `Internal (QA)` was never asked for.
2. Fix `identityForRow()`/`buildIdentityIndex()`'s name-donation rule: it currently reuses a
   labelled caller's name for *any* row sharing that IP address, including a different
   visitor's own id and unrelated regression/script traffic. Verified live: one manually
   labelled visitor's name had silently absorbed 210 regression-driver calls and 2 other
   distinct, unidentified visitors at John's shared home IP.

Started 2026-08-01 CST.
