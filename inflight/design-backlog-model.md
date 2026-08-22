design-backlog-model — backlog data-model design session (epics + tooling requirements). Fable 5.

## Session task list — to file as automation-lane tickets at close-out (John, this session: "place as top of the automation routines")

Filing plan when John says go: claim one SES- ID block atomically (session-setup §3b, one call sized to the list),
INSERT each per skill step 3c (P10 - Tooling, tier now), then `claim_automation_lane_top()` per ticket in
REVERSE priority order (each call takes min−1, so the last-filed lands on top), then recompute. Design only
this session — no builds.

1. **CONFIRMED — Epics.** New `public.epics` table (id uuid PK, name unique, description, timestamps);
   `backlog_items.epic_id uuid NULL REFERENCES epics(id) ON DELETE RESTRICT`; queue function untouched
   (epic = lens, not sort key); snapshot export appends joined epic name as LAST column + epics section
   (backup gap); check-session-docs parser updated same build (index-based cells); filing INSERT gains
   optional epic_id; grants QA both directions on both tables (new-table auto public SELECT trap).
   OPEN within this item: seed boundary for the "Automation" epic — recommended 3 open lane tickets +
   59 open SES- tickets; John hasn't answered yet. Also epic description text for Automation.
2. **PROPOSED, not yet John-confirmed — done-row close-out.** `archive_done_tickets()` in the runner
   serial tail after snapshot re-export: DELETE done/removed rows older than settling window (~7d),
   before-images first (§19v), snapshot git log is the history (register B1). 26 done rows on board today
   = 26 junk hygiene flags per session. Interaction flagged: epic summaries counting shipped members
   need done rows or history-based counts — decide together with item 1.
