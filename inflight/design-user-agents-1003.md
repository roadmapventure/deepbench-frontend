# design-user-agents-1003

Worktree: `.claude/worktrees/design-user-agents-1003` (now on branch `session/user-agents-1003-coding`).
Started 2026-10-03. User-created private agents from the Bench "Your New Agent" card, user-named teams with a team MCP address, stubbed for account management. John's rulings: decisions `a828b44f`, `067cc2ad`.

State, 2026-10-03 night:
- `AGT-335` — pushed `6bc6f9e4` (v7.0.753).
- `AGT-336` — slice 1 `404eda1f` (v7.0.754, migration `agt336_agent_sharing` applied live); slice 2 `e4e05016` (v7.0.761).
- `AGT-337` — all four slices pushed: `5d5b49f4` (v7.0.762 save), `22069214` (v7.0.763 broker fence), `737bcb18` (v7.0.764 screen), `37f71f57` (v7.0.767 §19u exemption; `platform_services` match key applied). Live-tested on dev through the deployed route; test agents removed on John's word.
- `AGT-338` — slice 1 of 4 (server resolver) pushed `be76d01b` (v7.0.766), live-tested on dev with fixtures, fixtures removed. Open: slice 2 (route hands the browser a team address), slice 3 (Connect popup — copy and placement need John), slice 4 (docs).
- Security finding filed: a knowledge tool on a team or single-agent address returns any agent's bundle when handed that agent's id.
- No verifier verdict on any push: the credentialed regression queue gave no slot in 60 minutes. Statuses deliberately unchanged until a verdict exists.
