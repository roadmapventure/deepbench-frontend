# design-log-37-0723

Worktree: `.claude/worktrees/design-log-37-0723` (branch `session/design-log-37-0723`, switching to
`session/log-37-coding` before the coding agent runs).

**`LOG-37` (Architecture) — Layer A call-fact capture.** Kickoff written:
`docs/kickoffs/v6.3.132-LOG-37-layer-a-call-facts.md` (v6.3.132, claimed atomically). 3 files
(`lib/activity-log.js`, `api/prompt/request-receivable.js`, `api/prompt/ai-enrichment.js`) + one
nullable `call_facts` jsonb column on `ai_activity_log`. Purely additive — `patterns_used` untouched.

**Touching `api/prompt/request-receivable.js`** — concurrent-edit risk, `HAR-9`/v6.3.131 landed in it
the same evening.

New rows logged this session: `LOG-44`–`LOG-49`. `LOG-42`/`LOG-43` are a concurrent session's
(`design-log-23-0723`), kept intact through a rebase collision — do not remove.

Open: §19i amendment recording John's 2026-07-23 override ruling (history stays frozen by default;
jointly-reviewed anomalies are exempt, John holds the pen). Owed before close-out.
