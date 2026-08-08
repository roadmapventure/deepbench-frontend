---
paths:
  - api/capabilities/execute.js
  - api/prompt/*.js
---
# Capabilities are data, not code

No route file per capability — every capability runs through the one generic executor
(`api/capabilities/execute.js`) as Skill Profile + `capability_skill_profiles` +
`agent_capability_assignments` rows. Never add a conditional keyed to an agent id or
capability slug inside `execute.js`, `db-assembly.js`, `ai-enrichment.js`, or
`request-receivable.js` (`if (agentId === 'x')` / `if (capability_slug === 'x')`).
The fix for a gap is a generic trait/field read, never a conditional or a hand-rolled
parallel route. No agent's data ever names another agent — cross-agent needs route
through `request_help`, reasoned live (Rule #1).

Rationale: `docs/ARCHITECTURE.md` §19b, §19d, §19e.
