---
paths:
  - api/capabilities/**
  - api/prompt/**
---
# Every Layer-3 execution logs to ai_activity_log

Every capability execution logs to `ai_activity_log` via `logAICall()` — AI and
deterministic capabilities alike, no exceptions. Deterministic entries carry no
tokens/cost but still log execution count and latency (`ai_type: 'deterministic'`).
Never remove an existing logging call; pass whatever lineage fields
(`skill_profile_slug`, `step_id`, `deliverable_id`, `level`) are available.

Rationale: `docs/ARCHITECTURE.md` §12, §13 (rule 3).
