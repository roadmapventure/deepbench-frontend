---
paths:
  - api/capabilities/execute.js
  - src/screens/MarketIntelligenceScreen.jsx
---

# Hop-event span identity — §19p

Never emit an `onEvent` hop payload or return an executor result shape without the
`trace_id`/`span_id` of the execution it credits. Never thread identity per shape or
per caller on the client — attach it where the event/result is born in the executor.
Never attach the outer requester's span to a row crediting a delegate (picker rows
carry the picker's child span; formatter rows the formatter's) — a wrong-agent span
is worse than a missing one. Never fabricate a pattern line when identity or
classification is absent (§19l honest-unclassified stands). No per-agent or
per-capability conditionals to accomplish any of this (Rule #1, §19d).

Rationale: `docs/ARCHITECTURE.md` §19p.
