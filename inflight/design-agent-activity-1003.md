# design-agent-activity-1003

Worktree: `.claude/worktrees/design-agent-activity-1003` (branch `session/design-agent-activity-1003`, from `origin/dev` @ fbbc053c).
Started 2026-10-03. Design session for `AGT-339`: an Activity tab on a private agent's Personnel file (connections, reach, knowledge delivered, training depth, Library access), read from the existing activity log. Depends on `ux-ui-1003` (`AGT-332`, `AGT-333`) landing first; `AGT-340` and `AGT-341` add rows to the same tab later.

Layout John approved 2026-10-03 (direct "yes" to the mock as shown):
1. Tab named "Activity", left sidebar under OVERVIEW, directly below Profile; on mobile one more tab in the existing tab bar.
2. Private agents only (`isPrivateAgent()`, `AGT-332`); every other agent's Personnel file unchanged.
3. Four cards, one column, Profile-tab card style, in this order:
   - CONNECTIONS — count, days active, average response time, first and last connection.
   - CONNECTED FROM — grouped by network and city (from `ip_org_cache`), count and last time per group, with the line "These are the AI tool's servers, not the person's location." No individual IPs, no device type.
   - KNOWLEDGE DELIVERED — what the latest connection handed over (lessons, role prompts, guardrails, skill sections) and the Library access tier.
   - TRAINING — lessons taught, last taught, and model calls / tokens / cost spent teaching inside DeepBench.
4. Footer line: tokens, model, decisions and reasoning from the connected AI tool are not shown because DeepBench never receives them.
5. Times in US Central.
6. TRAINING card gains one line, approved by John 2026-10-03 ("yes, add the line"): "AI patterns used in DeepBench: RAG, embeddings (1 call)" — read from `ai_activity_log.patterns_used` on the agent's in-DeepBench rows; connections through the agent's address carry no pattern (no model runs on our side) until `AGT-340` ships.

Measured this session (Brittany, 2026-10-03): 13 MCP connections, all counted by `call_facts.target_agent_id` (the bundle logs under the holder); every connection came from Google or Microsoft data-centre addresses, so an IP is the AI tool's server and never a person. The browser's public key can already read every column the tab needs (`ai_activity_log` column grant incl. `call_facts`, `caller_ip_masked`; `ip_org_cache` org/city/region), the same way the Profile tab's Report Card reads — no new `api/` route and no migration. That corrects `AGT-339`'s filed description, which said the read must ride an existing API route.

Unblocked 2026-10-03: `AGT-332` slice 1 (`v7.0.752`, `isPrivateAgent`) reached `origin/dev`. Kickoff: `docs/kickoffs/v7.0.758-AGT-339-private-agent-activity-tab.md` (supervised cycle `616791a9`).