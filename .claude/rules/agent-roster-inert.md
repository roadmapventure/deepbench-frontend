---
paths:
  - lib/project-manager.js
---
# Inactive agents are inert — the roster must honor it

- The delegation roster context must exclude `is_active = false` agents (`LOO-37`): an inactive
  agent in the selection prompt is a trap — `execute.js:507` throws if the model picks it.
- Any session creating agent records (`agents` / `skill_profiles` / `capabilities` /
  `capability_skill_profiles` / `agent_capability_assignments`) lands them with the agent
  `is_active = false`. Flipping `is_active` on is John signing the hire card — never automated.
- Automated-mode sessions never edit rows belonging to an active agent (gated, §19v P5).

Rationale: `docs/ARCHITECTURE.md` §19v (P5/P6), §19u (every hire is signed).
