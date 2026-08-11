# design-log-138-0810

Worktree: `.claude/worktrees/design-log-138-0810` (branch `session/design-log-138-0810`)
Design session for **LOG-138** — no screen-origin attribution in `ai_activity_log`. Started 2026-08-10.

Scope: decide how an AI call records which screen it originated from, then produce a kickoff doc.
Touches `ai_activity_log` schema / `logAICall()` call sites — coordinate before any other session
changes the logging payload shape.
