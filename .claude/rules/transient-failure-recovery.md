---
paths:
  - api/capabilities/execute.js
  - api/prompt/request-receivable.js
  - api/_lib/handlers/durable-loop.js
  - src/screens/MarketIntelligenceScreen.jsx
---
# Transient-failure recovery — ARCHITECTURE.md §19o

- Never surface a transient hop failure (5xx/529, time-budget starvation, schema
  parse/omission failure) to the user before one automatic checkpoint-resume
  recovery of that hop has been attempted.
- Never auto-retry a permanent-class failure (400s, incl. credit-balance; auth;
  malformed request). Classify via the throw-site `failureClass` contract
  (`HAR-15`, `classifyAnthropicFailure()`) — never re-derived from message text,
  and never consulted at any catch site other than `runLoop()`'s own
  `callModel()` seam (`HAR-17`: recovering dispatch-interior, `sendRequest()`-stage,
  or bookkeeping failures risks duplicated deliverables and lost terminal turns).
- Never retry silently: every recovery surfaces in the **chat working-status
  line** and **extends the displayed expectation** by the re-run's cost
  (amended 2026-07-28, John — supersedes this rule's original "visible in the
  Agent Routing drawer" wording; the drawer deliberately shows nothing).
- Never recover the same hop more than once per user turn — recovery is recorded
  in `durable_hops.recovery_ledger` through a **checked** write (a silent marker
  failure would make recovery unbounded), keyed on conversation position, never
  on loop depth (depth is not stable across checkpoint/resume). A second failure
  of the same hop is a real error.
