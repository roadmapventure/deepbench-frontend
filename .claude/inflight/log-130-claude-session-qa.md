# log-130-claude-session-qa

Worktree: `.claude/worktrees/log-130-claude-session-qa` (branch `session/log-130-claude-session-qa`)

Follow-up on `LOG-121`/`LOG-127`/`LOG-129` (all archived): John wants a way to track
total Claude QA volume/cost pre-release. Non-browser (script) calls currently have no
identity mechanism — only browser calls get a cookie-based name. Adding a header
(`x-db-visitor-id`, non-`ui` only) that fills the same `visitor_id` slot a cookie would,
then labelling a fixed tag "Claude Session QA" in `known_callers`.

Started 2026-08-02 CST.
