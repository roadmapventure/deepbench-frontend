---
paths:
  - api/_lib/handlers/agent-bundle.js
  - api/_lib/handlers/agent-teach.js
  - api/prompt/db-assembly.js
  - src/screens/PersonnelScreen.jsx
  - src/screens/personnel/**
---
# Agent data — nothing hidden, nothing sent that cannot be edited

- Never add a key to the scaffold reply (`agent-bundle.js`) that the Personnel page does not
  show and a DeepBench user cannot edit; the only exceptions are the call-plumbing keys
  ARCHITECTURE.md §19w names (`no_inference`, the lead text, the answer mode).
- Never add a column to `skill_profiles`, `agent_configs` or `knowledge_entries` without the
  assembler branch that reads it in the same ticket.
- Never render a role prompt, guardrail or taught item into more than one assembled section.
- Never move a Personnel card to Future View by redrawing it; relocate the same component.
- Never show a constant on Personnel styled as a measured fact; park it on Future View or read
  the real row.

Rationale: `docs/ARCHITECTURE.md` §19w.
