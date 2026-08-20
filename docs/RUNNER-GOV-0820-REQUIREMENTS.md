<!-- DeepBench v7.0.99 | RUNNER-GOV-0820-REQUIREMENTS.md | design-runner-gov-0820 — the running requirements register for John's governance recalibration session (2026-08-20). Updated same-turn as decisions land; the automation tickets are cut from this file. -->
# Runner Governance Recalibration — Requirements Register

> Session `design-runner-gov-0820` (John + Fable 5, 2026-08-20). John's five session topics:
> (1) language ✅ shipped, (2) schedule ✅ shipped, (3) cost vs usage ✅ shipped,
> (4) prioritization — iterating in this file, (5) full automation — pending.
> **Status: STILL ITERATING — John is generating requirements until all open questions are
> answered.** Everything marked SHIPPED is live on dev/Supabase; everything marked LOCKED is
> decided but not yet built; OPEN means undecided.

## A. Shipped this session (live)

- **A1. Language (John):** outcomes `did_not_run` / `gated_before_build` (constraints + data +
  docs + routine prompt); displayed as plain words. Classes always written NAMED, never bare
  digits. Everything is a **"backlog ticket," never "row."**
- **A2. Schedule (John):** fires 12/3/6/9 AM/PM CST (UTC cron `0 2,5,8,11,14,17,20,23 * * *`;
  re-align one hour when DST ends in November).
- **A3. Two-track budget (John):** API dollars only (dev/QA split) against $5 day / $100 month
  hard walls; subscription tokens estimated (dev/QA split), governed by John's typed-in meter
  readings — rest at weekly ≥85%, 50% runner share, 10M/day uncalibrated, 3M/day stale-reading
  (>48h) fallback; calibration `tokens_per_pct` from runner-only overnight windows. Guardrail
  numbers derived from a measured month of John's real usage (median day ~11.6M working
  tokens). Briefing: budget cards + by-model breakdown + reading-entry card (template live).
- **A4. Priority classes renumbered P1–P10 (John):** new top class **P1 - Improves John's
  Skills** (features that make John more hireable, esp. FAANG AI roles; the platform as his
  living portfolio); old P1–P9 → P2–P10. Swept through §19v, FEATURES.md markers + legend,
  runbook, briefing docs, routine prompt, memory.
- **A5. Business-side judgment DELEGATED to Claude (John):** P1–P4 classification, value/usage
  ranking, competitive/whitespace review — Claude assigns and recommends; John governs after
  the fact via briefing Accept/Reverse/Rework. Supersedes "never assigned unattended."
- **A6. `backlog_items` table live** (runner cycle v7.0.100, SES-83 phase a): 277 backlog
  tickets imported, reconciled, zero public grants proven both directions.

## B. Locked requirements — to build (the automation tickets cut from here)

- **B1. Single DB table for all OPEN backlog tickets** (John: no archive — archived/shipped
  tickets are history, never imported or maintained). Files become generated backups; active
  files stop carrying tickets so session startup reads shrink. [SES-83 b/c queued; d/e gated]
- **B2. Both governance modes (Manual + Automated) switch to the DB** for backlog reads/writes.
  [SES-83 d/e — John's sign-off at switchover]
- **B3. Ordering:** finish ALL of tier `now` before `next`, all `next` before `later`; within a
  tier, class P1 - Improves John's Skills → P10 - Tooling; within a class, tie order
  **beta-marked first → newest filed → oldest**. Beta tickets belong in `now` unless
  deliberately parked (supersedes old beta-sorted-first-within-class line).
- **B4. Materialized `queue` field** — position visible, not recalculated per read. Recompute
  events: new ticket (classed), ticket picked, completed/removed, any sort-field edit. One
  idempotent full renumber. No queue number = not pickable (unclassed / P-GATED).
- **B5. John's pins:** "TICKET-ID — move to N" (briefing directive box / chat / Super Admin).
  Pinned tickets hold absolute slots through recomputes; latest call wins collisions; released
  by completion, removal, or "— release."
- **B6. Lifecycle status:** `filed` → `queued` → `designed` → `in development` → `completed` |
  `removal proposed` → `removed`. Completed/removed/picked are dequeue events. Orphan healing:
  a dead cycle's `in development` ticket re-queues. Reverse reopens completed → queued.
- **B7. Staleness / revalidation:** age is the trigger (30 days untouched), premise is the
  verdict. Pick-time premise revalidation ALWAYS (step one of any build); background
  revalidation of the sinking tail (30d+, bottom-dwellers, retired-vocabulary hits) on spare
  cycle capacity. **No unattended removal:** `removal proposed` state → briefing card with
  ticket attributes + evidence; John taps Accept (removed) / Reverse (re-queued +
  `revalidated_at`, quiet for 30 days) / Rework (his line rewrites the ticket, re-queues).
- **B8. Classification sweep:** Claude classifies all ~420 unclassed open tickets from
  description + type (Type ≠ class: Feature-typed tickets can land P5). P1–P4 assignments
  surface on the briefing for after-the-fact taps. Sample of 6 demonstrated live this session.
- **B9. Filing rule:** every NEW backlog ticket is classed (named form) at filing; never
  enters the board undecided.
- **B10. `filed_at` mined from git history** (no file records ticket birth; needed for B3's
  newest/oldest).
- **B11. Classification/meta work rides the directive queue** (bootstrap exception so
  P9 - Bug Fixes volume can't starve the passes that order the board).
- **B12. Invention engine wiring:** one designated invention cycle per day — research
  (market/competitor/whitespace/usage + the P1 lens), score against the vision corpus, R&D
  gate, file as gated-before-build card; John's Accept turns it into a queued ticket. Check
  cloud egress permits web research. Volume widens only by trust ladder.
- **B13. Vision corpus (SES-84, restructured by John):** Claude drafts all nine docs as
  best-inference claims (self-education: repo + memory + Supabase + local session archive +
  outside research); John verifies by DRIP — 1–3 claim cards per briefing (~15 min/day max),
  plus on-demand "I have X minutes" bursts. No hours-long interview.
- **B14. Business-rule generation loop:** declared (John states) + mined (SES-79 over his
  structured taps) + learned (incidents) → proposed-rule briefing cards → only John's tap
  ratifies. Rule-making stays gated forever.
- **B15. Lane ≠ class (John's catch, 2026-08-20): the `P-GATED` class marker is RETIRED**
  (never applied to any ticket — legend-only). Every open ticket gets a real class AND a queue
  number, gated ones included; gated-ness becomes a separate **lane flag with a reason note**
  ("edits an active agent's Skills", "touches LOCKED §19e", "modifies a harness file"). A
  gated ticket reaching the top of the queue produces a **gated-before-build briefing card**
  instead of an unattended build — John's tap decides its path. The briefing (later Super
  Admin) shows the gated-flagged tickets with their queue positions ("Your lane" view).
- **B16. "Unclassifiable" (John's term) replaces "unreadable":** reserved for tickets whose
  text is genuinely too degraded to judge; carries a **reason/note field** saying why; every
  one surfaces as a briefing card for John's Rework or removal. Expected population: a
  handful of ~420.

## C. Open questions (iteration continues until empty)

- C1. John's remaining follow-up questions (his item 6) — not yet stated.
- C2. Full-automation requirements review (his original topic 5) — in discussion.
- C3. Egress check for invention-cycle web research (B12) — unverified; precondition on SES-88.
- ~~C4. Build sequencing~~ — **SUPERSEDED same day by JOHN'S AUTOMATION QUEUE (his words,
  2026-08-20), which is now THE order:**
  **(1)** Briefing page easily accessible — DeepBench Admin screen via the Vercel link
  (`ADM-1` v1, promoted, directive-queued; B19).
  **(2)** The backlog-ticket DB completed and USED — updating, exposure, usability, manual
  and automated (`SES-83` b/c/d/e + `SES-86` queue engine).
  **(3)** The C2 automation-gap tickets (`SES-89` Heal engine, `HAR-41` flags design session,
  B17/B18 rules, agent lanes when they surface).
  **(4)** Claude reads ALL sessions and becomes the behavior expert on John's decisions —
  "think like me" (`SES-79` expanded over the full local session archive + structured taps).
  **(5)** THEN the priority-classification sweep (`SES-85`) — deliberately after (4) so
  classification is grounded in John's thinking, not inference. `SES-87` revalidation follows.
  **(6)** The inventor tickets (`SES-84` corpus drip + `SES-88` wiring) run IN PARALLEL at
  any time.
- **B17. Accept follow-through (found live 2026-08-20):** an Accept on a gated-before-build
  card automatically becomes a queued backlog ticket (classed at filing) — an Accept must
  never evaporate. Backfill: the accepted stale-prompt step-0 guards proposal
  (`runner_items.d1c1ca1b`) → directive queued.
- **B18. Briefing completeness:** cards are always rebuilt from the database's undecided set,
  never from a cycle's memory of what it filed. (Runbook step 9 rule.)
- **B19. Briefing accessibility (John's automation queue #1):** the briefing page reachable
  from the DeepBench dev site — Admin route, hamburger nav, prominent link to the permanent
  Artifact URL; read-only runner evidence cards as v1.5. Decision buttons stay on the
  owner-authenticated Artifact until Clerk (unchanged).
- **B20. dev→main stays John's forever** — full automation ends at dev, stated as a boundary,
  not a gap.

## D. Ticket ledger

**Filed this session (8):** SES-81 (backup tool table discovery) · SES-82 (programmatic meter
read when upstream ships) · SES-83 (backlog→DB; a ✅ v7.0.100, b/c queued, d/e gated) ·
SES-84 (vision corpus, drip model) · **SES-85 (classification sweep) · SES-86 (queue engine) ·
SES-87 (revalidation flow) · SES-88 (invention wiring)** — the four cut on C4's approval,
dependencies in each row. B14 extends existing SES-79; B9/B11 are rulebook edits, not tickets.

**Directives queued:** SES-83 phases b+c (id `5e4bc577`, with John's amendments).
