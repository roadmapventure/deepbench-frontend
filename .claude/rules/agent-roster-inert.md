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
- **Lane carve-out (`SES-338`, the Governance Agents exit review, 2026-09-09):** an agent whose
  `agents.lane = 'governance'` lands `is_active = true`, because that lane never reaches the product
  roster or the product broker at all — `SES-330` fences the roster fetch on `lane = 'product'`
  (pinned by `tests/regression/ses-330-governance-lane.test.mjs`), so there is no selection prompt
  for a governance agent to be a trap in, and no hire card for John to sign. All six governance
  agents (`GV-01`..`GV-06`) shipped `true` for this reason. The rule above is unchanged for every
  **product** agent, which is the population it was written about. Both review lenses concurred;
  the mechanism was already in code and only this prose was stale.
- Automated-mode sessions never edit rows belonging to an active agent (gated, §19v P5).

Rationale: `docs/ARCHITECTURE.md` §19v (P5/P6), §19u (every hire is signed).
