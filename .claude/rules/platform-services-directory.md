---
paths:
  - src/hooks/useAIActivity.js
  - src/components/AIActivityPanel.jsx
  - shared/ai-patterns.js
---
# Platform Services directory — service vs. capability

Never drive the By Service display from `SERVICE_CATALOG` — it reads the
`platform_services` Supabase table only (`SERVICE_CATALOG` survives solely for
the MCP Roadmap tab). Never list a Capability as a service: capabilities are
data (§19b) and display under their Agent, never in the services list. Never
write counts/cost/latency into `platform_services` — numbers live only in
`ai_activity_log`, joined at read time via `match_keys` (feature match beats
ai_type-only). Never hand-write an agent name on a service row — ownership is
expressed by Capability assignment and shown in the By Agent drawer. A service
is one reusable module; its functions are a muted list under the title, never
their own rows. Activity matching no directory row must render as an
"unregistered service" line, never be silently dropped.

Rationale: `docs/ARCHITECTURE.md` §19m.
