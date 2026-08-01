# design-log-121b

Worktree: `.claude/worktrees/design-log-121b` (branch `session/design-log-121b`)

Design session for **LOG-121 part (b)** — the read side. Part (a) shipped as v7.0.34
(`7946dd3`) and is capturing `call_source`/`caller_ip`/`device_type`/`visitor_id`/`request_host`
live. This session designs `ip_org_cache` + the IP→org resolver (§19m `platform_services` row)
and the **By Platform User** drawer in AI Audit, after By Agent, with By Source and By Caller
sections.

Constraint inherited from `a`: NULL-`visitor_id` rows must group by `caller_ip`, never be dropped.

Started 2026-08-01 CST.
