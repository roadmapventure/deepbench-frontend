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
- Automated-mode sessions never edit an active agent's rows and never create an agent's rows,
  EXCEPT under rule `AGENT-ROW-AGREED-TICKET` (§19v P6/P7): a ticket with
  `scope_origin = 'john-named'`, or named by an unreversed `runner_decisions` row, makes that write
  build work with a before-image under one decision handle.
- Everything else stays gated: an agent-row write no agreed ticket names, an agent John has not
  seen, and flipping `is_active` on.

<!-- {{rule:AGENT-ROW-AGREED-TICKET}} · rendered from public.governance_rules — do not hand-edit the quoted lines below. Edit the registry row, then run `node scripts/render-rule-blocks.js --write`. -->
> **Rule AGENT-ROW-AGREED-TICKET** — Creating an agent's rows (agents / skill_profiles / capabilities / capability_skill_profiles / agent_capability_assignments), and editing an active agent's identity, behavior, knowledge or guardrails rows, is build work under the ticket that names it and takes no approval card, when that ticket carries scope_origin = 'john-named' or an unreversed runner_decisions row names both the ticket and the change; every such row is written with its own runner_before_images row (row_data NULL for an INSERT) under one decision handle.
> Reserved to John still: any agent-row write no agreed ticket names, and the creation of an agent John has not seen.
> Flipping agents.is_active on is unchanged and remains John's hire card.
> John 2026-09-14 (decision 20a06cf3) amended 2026-09-15 (decision 38a1c566); SES-397's manager-applied edits keep their carve-out.

Rationale: `docs/ARCHITECTURE.md` §19v (P5/P6), §19u (every hire is signed).
