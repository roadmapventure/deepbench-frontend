---
paths:
  - api/prompt/*.js
  - lib/activity-log.js
  - src/hooks/useAIActivity.js
  - src/hooks/useAgents.js
  - src/screens/MarketIntelligenceScreen.jsx
  - src/components/AIActivityPanel.jsx
  - src/components/AboutPanel.jsx
  - src/aiPatterns.js
---
# AI pattern naming — the runtime signature model

Never write a pattern **name** into the log. The name is derived at read time only (the
Log Displayer view); `patterns_used` is frozen legacy, never read for classification.
Never put `agent_id` (or an identity/behavior skill) into the signature — it is
agent-agnostic; only `feature` + config (`knowledge`/`intent`/`format` skills + traits)
+ facts. Never hardcode a pattern: no `PATTERN_CATALOG`-style static list, no per-pattern
CASE branch, no `SERVICE_LABEL`-style hand dictionary, no `buildPatternsUsed`-style
write-time stamping. Pattern detection is **data** (`criteria` on the gold
`pattern_vocabulary` row), matched generically. Never call an AI/model in the per-row or
query path — semantics happen once, when the Pattern Definer (Susan) defines the pattern.
The Displayer view stays a **plain view, never materialized**. Surface unclassifiable rows
(`LEFT JOIN`), never silently drop them.

Rationale: `docs/ARCHITECTURE.md` §19k (and §19i LOCKED).
