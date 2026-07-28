---
paths:
  - api/capabilities/execute.js
  - api/prompt/request-receivable.js
  - lib/durable-loop.js
---
# Transient-failure recovery — ARCHITECTURE.md §19o

- Never surface a transient hop failure (5xx/529, time-budget starvation, schema
  parse/omission failure) to the user before one automatic checkpoint-resume
  recovery of that hop has been attempted.
- Never auto-retry a permanent-class failure (400s, incl. credit-balance; auth;
  malformed request) — classify first, then surface honestly per §19j/`HAR-15`.
- Never retry silently: every recovery attempt must be visible in the Agent
  Routing drawer (§19h).
- Never recover the same hop more than once per user turn — a second failure is
  a real error, not a retry candidate.
