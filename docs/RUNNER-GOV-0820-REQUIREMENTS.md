<!-- DeepBench v7.0.359 | RUNNER-GOV-0820-REQUIREMENTS.md | SES-285 — FEATURE: SES-285. **THIRTEEN RULES WITHDRAWN IN ONE COMMIT**, each with a dated note at its own entry and its original wording kept below it, per this file's convention. RETIRED with no replacement (5): B13, B16, B23, B28, B29. SUPERSEDED by the new M6 register (8): B7→M6-03, B12→M6-04, B14→M6-02, B17→M6-05, B24→M6-06, B27→M6-06, B34→M6-07, B35→M6-07. Canonical home of the replacements: `docs/RUNNER-GOV-M6-REQUIREMENTS.md`; ledger entries `docs/SELFBUILD-RETIREMENT-LEDGER.md` #21–#33. Trigger — John, 2026-09-01, verbatim: "I no longer want to work via cards or taps. And you are supposed to be more self sufficient to update tickets accordingly without me." Measured at decision time: 45 gated_before_build cards undecided, 42 of them older than 48 hours, against 79 ever decided; 33 open tickets at design_status='needs-john'. B23's "silence parks a card forever" is the mechanism that manufactured that backlog, which is why it is retired outright rather than reworded. **DELIBERATELY RETAINED, and stated here so no later reader mistakes the sweep for total: B20 (dev→main stays John's) and HR-MERGE are still `live`, as are B5 (pin directives) and B39 (the .claude/ write gate).** NOT yet true, stated so it is not assumed: the 72-hour reversal window M6-02 declares is a RULE here, not a mechanism — the timer and expiry sweep are SES-286. Three mention sites are known to remain in live voice in the runbooks (runner-cycle.md, briefing-page.md, gate-review.md) and are tracked as their own ticket rather than swept here; see that ticket before assuming a runbook card procedure is current. -->
<!-- DeepBench v7.0.358 | RUNNER-GOV-0820-REQUIREMENTS.md | SES-280 — FEATURE: SES-280. **B3 SUPERSEDED by `M5-02`**, dated note in place at its entry (original wording kept below it, per this file's convention) and its two downstream mentions (B4's shipped-function note, B10's `filed_at` rationale) marked so neither reads as live. The registry row now carries `status = 'superseded'`, `superseded_by = 'M5-02'`; the replacement's canonical home is the new `docs/RUNNER-GOV-M5-REQUIREMENTS.md`, and the ledger entry is `docs/SELFBUILD-RETIREMENT-LEDGER.md` #20. Why B3 could not stay live: its "newest filed → oldest" tie-break is the direct inverse of the pre-2026-08-21 priority lane John set on 2026-09-01, and B3 is script-enforced — two contradictory sort keys in one pick path. Beta, its other tie-break, was already retired 2026-08-19. The tier-then-priority-class half survives verbatim in M5-02. NOT yet true, stated so it is not assumed: M5-02 ships with `enforcement = 'script'` RECORDED, not executed — Phase 2 wires the filing lane into `drain_epic_next()` / `recompute_backlog_queue()` and is a follow-up ticket, so the pick path still sorts the way B3 described until it lands. -->
<!-- DeepBench v7.0.173 | RUNNER-GOV-0820-REQUIREMENTS.md | SES-115 — register B1 formally REVISED in place under a dated note (its original wording kept above the note, per this file's convention that the superseded sentence stays visible). "History leaves the table" becomes "history lives in the table, filtered": rows are never deleted, public.backlog_active (migration ses115_backlog_active) is the one owning definition of active and carries a computed `mode` via public.backlog_mode(). The revision is not a softening of John's no-archive rule — his objection was to MAINTAINING archived tickets, and nothing about a kept row is maintained; what a closed ticket must shed is only its live-board state (queue number, pin, claim), which recompute_backlog_queue() and the step-7 release already clear. MEASURED, and it is why this could not stay prose: read literally, the old wording made check-session-docs check 3 flag every done row — 37 of that report's 49 findings, 76% noise, every one of them instructing the reader to "close it out of the table", which under the revised rule is the wrong action. Check 3 is retargeted to the residue only, so it now fires on a missed recompute and is silent on history. -->
<!-- DeepBench v7.0.133 | RUNNER-GOV-0820-REQUIREMENTS.md | SES-86 phase 3, directive f47e5a95 — B30 amended in place: John's automation queue stops being a selection layer a cycle EXECUTES BY HAND and becomes the board's leading sort key (backlog_items.automation_rank, migration ses86c_automation_lane). B30 predicted this ("post-SES-83 d/e the queue engine's pins express the same thing in data"); this is that, arriving early because the prose layer had already failed silently — measured 16:29Z, C4's tickets sat at queue 2/241/242/243/244/280/281 of 551 while the v7.0.130 briefing told John the next cycle would be "building product, not tooling". He overruled it and force-ran the cycle. The self-retiring property B30 described is preserved mechanically (a done ticket leaves the ranked set). Two things named as NOT done so they are not assumed: B23 pins (when built, a pin sorts ABOVE automation_rank — John's live tap outranks a standing build order) and the parallel-cycles half of his line, which collides with the B31 lease and went to him as a gated card. -->
<!-- DeepBench v7.0.122 | RUNNER-GOV-0820-REQUIREMENTS.md | directive 34865f07 — register B39 appended and B38 corrected in place under a dated banner (its wrong sentences kept; the mistake is the lesson). John's testimony — "Those sessions came back alive because I opened them and allowed permissions. That should not be happening." — names the mechanism four probes could not: the .claude/ gate is a harness permission prompt rendered ONLY in the human session UI, invisible and unanswerable to the agent, cleared by a person. B38's location was right, its clearing model wrong: the stall does not self-clear, so "a cost, not a prohibition — budget ~35 minutes" was a sample of the ATTENDED cases only. The partition is exact and was re-derived from live rows: John's taps stop 03:48Z, resume 12:50Z; every probe that cleared ran inside his waking window, all three that parked 8h+/never ran inside the nine-hour hole, and the two parked cycles resumed TOGETHER eighteen minutes after his first morning tap. New rule: an unattended cycle never enters the gate (no bounded recovery); the edit stays legitimate work needing a session he attends. SES-95 superseded as "the decisive probe" — unattended it parks rather than confirms. His onset attribution is contradicted by 21 hours and said so; his mechanism is right, and a real mediated link survives. Three residues kept labelled as inference, the steelman shipped alongside, and two questions left to John: relocate the inflight marker out of .claude/, and whether a pre-approval can be granted these cloud sessions at all. -->
<!-- DeepBench v7.0.121 | RUNNER-GOV-0820-REQUIREMENTS.md | directive 1d01ea85 — four registers appended. B35 records John's three answers (Reverse-on-gated "leave it"; the budget day is an America/Chicago day; a silent run must push why + what to do next). B36 logs his fourth item — subagents appearing to ask permission — as a question the RUNNER owes evidence on, not one John must rule on. B37 is the correction this cycle made to its own unshipped rule: a silent cycle is not a dead cycle, measured live when the two cycles presumed dead resumed after nine hours and finished. B38 narrows B36 with the surviving hypothesis — the .claude/ stall tracks Bash redirection, not the path (Write/Edit writes under .claude/ succeeded in seconds), which would make v7.0.117's blanket rule too wide; held open, with the next cycle's own edit as the decisive probe. -->
<!-- DeepBench v7.0.118 | RUNNER-GOV-0820-REQUIREMENTS.md | directive fb643367 — register B34 appended: John's ruling that an Accept on a gated_before_build card is permission, not a rating, and does not move the trust ladder. Records the ruling's provenance, what shipped, and the two things deliberately left undone (no retroactive ladder re-derivation; Reverse-on-gated not covered and still demoting). -->
<!-- DeepBench v7.0.108 | RUNNER-GOV-0820-REQUIREMENTS.md | design-runner-gov-0820 — the running requirements register for John's governance recalibration session (2026-08-20). Updated same-turn as decisions land; the automation tickets are cut from this file. -->
# Runner Governance Recalibration — Requirements Register

> Session `design-runner-gov-0820` (John + Fable 5, 2026-08-20). John's five session topics:
> (1) language ✅ shipped, (2) schedule ✅ shipped, (3) cost vs usage ✅ shipped,
> (4) prioritization — iterating in this file, (5) full automation — pending.
> **Status: REQUIREMENTS COMPLETE — John called it done 2026-08-20.** Everything in A is live
> on dev/Supabase; B1–B29 are the locked build requirements the automation-queue tickets
> execute against — **as locked in 2026-08-20; thirteen of them were since retired or superseded
> by `SES-285` on 2026-09-01 (see this file's header), so read each entry's own dated note before
> treating it as current**; C1/C2/C4 closed (C3 — the invention-cycle egress check — rides `SES-88`).
> This file is the design record the kickoffs cite.

## A. Shipped this session (live)

- **A1. Language (John):** outcomes `did_not_run` / `gated_before_build` (constraints + data +
  docs + routine prompt); displayed as plain words. Classes always written NAMED, never bare
  digits. Everything is a **"backlog ticket," never "row."**
- ~~A2. Schedule~~ — **SUPERSEDED 2026-08-23 by `SES-151` (`v7.0.196`): the cron fires hourly
  at :40 permanently, and `scheduler_gate()` paces by John's America/Chicago clock grid (an
  hour divisible by `interval_hours`; 3 → 12/3/6/9 AM/PM on his clock) — DST-proof, no cron
  realign ever.** As originally shipped: fires 12/3/6/9 AM/PM CST (UTC cron
  `0 2,5,8,11,14,17,20,23 * * *`; re-align one hour when DST ends in November).
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

- **B1. Single DB table for ALL backlog tickets — history lives in the table, filtered**
  (John: no archive — archived/shipped tickets are history, never imported or maintained).
  Files become generated backups; active files stop carrying tickets so session startup reads
  shrink. [SES-83 b/c queued; d/e gated]

  > **REVISED 2026-08-22 (John's design), shipped `SES-115` / `v7.0.173`.** The original wording
  > above was read as *"history leaves the table"*, and nothing was ever built to make it leave —
  > so `done` rows accumulated on the board and `check-session-docs.js` check 3 flagged every one
  > of them as drift. **Measured before the fix: 37 of that report's 49 findings were those
  > flags — 76% noise, all of it telling the reader to "close it out of the table".**
  >
  > The rule is now **keep-and-filter**: rows are **NEVER deleted**. A closed ticket stays in
  > `public.backlog_items` forever, which is what gives the platform live SQL history and gives
  > `docs/backlog/BACKLOG-SNAPSHOT.md` a real git log. *"Active"* becomes one owning definition —
  > **`public.backlog_active`** (migration `ses115_backlog_active`), which filters
  > `status NOT IN ('done','removed')` and carries a computed **`mode`** column
  > (`in development` / `in review` / `done` / else the stored status) via
  > `public.backlog_mode()`.
  >
  > **The no-maintenance spirit survives intact, and that is the point of the revision** —
  > John's objection was to *maintaining* archived tickets, not to their rows existing. Nothing
  > is imported, nothing is groomed, nothing is moved. What a closed ticket must lose is only its
  > **live-board state**: its queue number, its pin, its claim, all cleared automatically by
  > `recompute_backlog_queue()` and the step-7 claim release. Check 3 is retargeted to exactly
  > that residue, so it now fires only on a **missed recompute** — real drift — and is silent on
  > history, which is not.
- **B2. Both governance modes (Manual + Automated) switch to the DB** for backlog reads/writes.
  [SES-83 d/e — John's sign-off at switchover]
- **B3. Ordering — SUPERSEDED 2026-09-01 by `M5-02` (`SES-280`, `v7.0.358`); the registry row is
  `status = 'superseded'`, `superseded_by = 'M5-02'`, and the ledger entry is
  `docs/SELFBUILD-RETIREMENT-LEDGER.md` #20.** The original wording is kept below, per this file's
  convention that the superseded sentence stays visible. *Why:* B3's **newest-to-oldest within
  class** is the direct inverse of the pre-2026-08-21 priority lane John set in `M5-02`, and both
  could not be live; beta, its other tie-break, was itself retired 2026-08-19. The tier-then-class
  half survives verbatim inside `M5-02`. **As originally shipped:** finish ALL of tier `now` before
  `next`, all `next` before `later`; within a tier, class P1 - Improves John's Skills →
  P10 - Tooling; within a class, tie order **beta-marked first → newest filed → oldest**. Beta
  tickets belong in `now` unless deliberately parked (supersedes old
  beta-sorted-first-within-class line).
- **B4. Materialized `queue` field** — position visible, not recalculated per read. Recompute
  events: new ticket (classed), ticket picked, completed/removed, any sort-field edit. One
  idempotent full renumber. No queue number = not pickable (unclassed / P-GATED).
  **[SHIPPED `v7.0.130`, `SES-86` phase 2, runner cycle `6b078b06`.** `backlog_items.queue`
  (integer, nullable) + `public.recompute_backlog_queue()` (migration
  `ses86b_backlog_queue_numbers`), wired to the pick and close-out events in
  `runbooks/runner-cycle.md` steps 5/7 and read directly by step 9's "Next up". First renumber:
  551 tickets numbered `1..551`, no gaps, no duplicates; six consecutive recomputes change **0**
  rows. **The first idempotence result was a false pass** — `550 → 0` looked clean, then a real
  new ticket produced `435 → 2 → 0`, because `backlog_id` has no unique constraint, `CHI-48`
  occupies two rows identical on all five sort keys, and `row_number()` is non-deterministic
  across ties. Fixed by appending the primary key as a sixth tie-break
  (`ses86b_queue_deterministic_tiebreak`); the duplicate is filed as `SES-97`. B3's ordering — which
  `M5-02` **superseded** 2026-09-01 (`SES-280`), so this describes the function as shipped in
  `v7.0.130`, not the ordering the pick path is being moved to — is
  copied clause-for-clause with all five live
  traps preserved — verified by a negative control on the same rows, where a lexical
  implementation yields 17,616 class and 81,281 tier inversions against the shipped function's 0.
  The renumber does not touch `updated_at`, and claims do not affect the number. **Not yet
  covered:** `session-setup`'s manual-session call site (a `.claude/` edit, carded for a session
  John attends) and adding `queue` to `BACKLOG-SNAPSHOT.md`'s explicit column list.**]**
  **[AMENDED `v7.0.158`, `SES-113`, runner cycle `d8e43a76`.** The line above — *"No queue number
  = not pickable"* — conflated two different things, and the conflation cost John a ticket he was
  being asked to rule on. **The rule is now:** `queue IS NULL` = **out of the standings entirely**
  (`done` / `removed` / unclassed). A **flag** — a live claim, `needs-john`, `needs-desktop`, or
  `removal proposed` — means the ticket is **IN the standings, holding its earned position, and
  skipped procedurally** at step 5 (drop to next, B24). His ruling, verbatim: *"what if I reject
  the proposal?"* A removal-proposed ticket is awaiting **his verdict**, exactly like a
  `needs-john` one; the two were treated oppositely, and nothing ever justified the difference.
  Measured before the change: `CHI-89` sat at `queue = NULL` while carrying an **undecided**
  removal card (`e1c7a940`), so his own board would not show it in any ordered list
  while his decision was pending. Migration `ses113_removal_proposed_keeps_slot` moves three
  predicates in `recompute_backlog_queue()` to `status NOT IN ('done','removed')`; the pin-clear
  stays `('done','removed')`, so the ticket keeps its pin too. All five documented ordering traps
  preserved and asserted individually. Negative control (pre-change body, rolled-back
  transaction): strips `CHI-89` to NULL, 559 numbered — against the shipped body's slot **23** and
  560 numbered, with 0 tier and 0 class inversions; the slot-23 expectation was computed by a
  standalone `row_number()` that never calls the function. **Consequence for John:** a Reverse on
  a removal card is now zero-motion re-entry — the position is already held. `SES-114` generalises
  the step-5 skip across `design_status` so all three flags read from one place.**]**
- **B5. John's pins:** "TICKET-ID — move to N" (briefing directive box / chat / Super Admin).
  Pinned tickets hold absolute slots through recomputes; latest call wins collisions; released
  by completion, removal, or "— release."
- **B6. Lifecycle status:** `filed` → `queued` → `designed` → `in development` → `completed` |
  `removal proposed` → `removed`. Completed/removed/picked are dequeue events. Orphan healing:
  a dead cycle's `in development` ticket re-queues. Reverse reopens completed → queued.
- **B7. Staleness / revalidation — SUPERSEDED 2026-09-01 by `M6-03` (`SES-285`, `v7.0.359`);
  registry row is `status = 'superseded'`, `superseded_by = 'M6-03'`, ledger entry
  `docs/SELFBUILD-RETIREMENT-LEDGER.md` #21.** Original wording kept below, per this file's
  convention. *What changed:* only the **"No unattended removal"** clause. A premise that fails
  revalidation **twice consecutively** now removes its ticket automatically, reversible inside its
  72-hour window (`M6-02`); no removal waits on a tap. *What did not:* the revalidation half —
  age as trigger, premise as verdict, pick-time always, background sweep of the sinking tail — is
  unchanged and still binds. **As originally shipped:** age is the trigger (30 days untouched),
  premise is the
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
  newest/oldest — and still needed after `M5-02` **superseded** B3 on 2026-09-01, because the
  filing lane selects on `filed_at` too).
- **B11. Classification/meta work rides the directive queue** (bootstrap exception so
  P9 - Bug Fixes volume can't starve the passes that order the board).
- **B12. Invention engine wiring — SUPERSEDED 2026-09-01 by `M6-04` (`SES-285`, `v7.0.359`);
  `superseded_by = 'M6-04'`, ledger #22.** Original wording kept below. *What changed:* the
  disposal route only — invention proposals are admitted or rejected by `SES-283`'s
  enhancement-lane admission test, never by a card. B12 was the highest-volume producer of the
  45-card backlog: one card a day into a surface with a two-thirds non-response rate. *What did
  not:* the daily invention cycle itself, its research inputs, and the vision-corpus scoring.
  **As originally shipped:** one designated invention cycle per day — research
  (market/competitor/whitespace/usage + the P1 lens), score against the vision corpus, R&D
  gate, file as gated-before-build card; John's Accept turns it into a queued ticket. Check
  cloud egress permits web research. Volume widens only by trust ladder.
- **B13. Vision corpus (SES-84, restructured by John) — RETIRED 2026-09-01 by `SES-285`
  (`v7.0.359`), no replacement rule; registry row is `status = 'retired'`, ledger #23.** Original
  wording kept below. *Why no successor:* B13 is verification-by-tap end to end — the DRIP card is
  not a detail of it, it is the whole mechanism — so with the tap surface withdrawn there is
  nothing left to restate. The nine documents and the best-inference drafting are untouched; how a
  claim is confirmed without a tap is **an open gap, named rather than papered over**.
  **As originally shipped:** Claude drafts all nine docs as
  best-inference claims (self-education: repo + memory + Supabase + local session archive +
  outside research); John verifies by DRIP — 1–3 claim cards per briefing (~15 min/day max),
  plus on-demand "I have X minutes" bursts. No hours-long interview.
- **B14. Business-rule generation loop — SUPERSEDED 2026-09-01 by `M6-02` (`SES-285`,
  `v7.0.359`); `superseded_by = 'M6-02'`, ledger #24.** Original wording kept below. *What
  changed:* the ratification default. *"Only John's tap ratifies"* made non-response the strongest
  possible veto, and non-response was the measured norm; a proposed rule now takes effect
  immediately and he has 72 hours to reverse it. *What did not:* rule generation from declared,
  mined and learned sources, which describes where rules come from, not who ratifies them.
  **As originally shipped:** declared (John states) + mined (SES-79 over his
  structured taps) + learned (incidents) → proposed-rule briefing cards → only John's tap
  ratifies. Rule-making stays gated forever.
- **B15. Lane ≠ class (John's catch, 2026-08-20): the `P-GATED` class marker is RETIRED**
  (never applied to any ticket — legend-only). Every open ticket gets a real class AND a queue
  number, gated ones included; gated-ness becomes a separate **lane flag with a reason note**
  ("edits an active agent's Skills", "touches LOCKED §19e", "modifies a harness file"). A
  gated ticket reaching the top of the queue produces a **gated-before-build briefing card**
  instead of an unattended build — John's tap decides its path. The briefing (later Super
  Admin) shows the gated-flagged tickets with their queue positions ("Your lane" view).
- **B16. "Unclassifiable" (John's term) replaces "unreadable" — RETIRED 2026-09-01 by `SES-285`
  (`v7.0.359`), no replacement rule; `status = 'retired'`, ledger #25.** Original wording kept
  below. *Why no successor:* the surviving half — reserve the label narrowly, write the reason
  down — is already carried by `B9` and by the class definition itself. What is withdrawn is the
  escalation: an unreadable ticket is now decided by the cycle under `M6-01`, with its reasoning
  recorded, like any other decision. **As originally shipped:** reserved for tickets whose
  text is genuinely too degraded to judge; carries a **reason/note field** saying why; every
  one surfaces as a briefing card for John's Rework or removal. Expected population: a
  handful of ~420.

## C. Open questions (iteration continues until empty)

- C1. John's remaining follow-up questions (his item 6) — not yet stated.
- C2. Full-automation requirements review (his original topic 5) — in discussion.
- C3. Egress check for invention-cycle web research (B12 — **superseded** 2026-09-01 by `M6-04`;
  the daily invention cycle survives, only its card-based disposal route does not, so the egress
  question is unchanged) — unverified; precondition on SES-88.
- ~~C4. Build sequencing~~ — **SUPERSEDED same day by JOHN'S AUTOMATION QUEUE (his words,
  2026-08-20), which is now THE order:**
  **(1)** Briefing page easily accessible — DeepBench Admin screen via the Vercel link
  (`ADM-1` v1, promoted, directive-queued; B19).
  **(2)** The backlog-ticket DB completed and USED — updating, exposure, usability, manual
  and automated (`SES-83` b/c/d/e + `SES-86` queue engine).
  **(3)** The C2 automation-gap tickets (`SES-89` Heal engine, `HAR-41` flags design session,
  B17/B18 rules — B17 **superseded** 2026-09-01 by `M6-05`, which widens its never-evaporate
  promise from Accepts to every decision — agent lanes when they surface).
  **(4)** Claude reads ALL sessions and becomes the behavior expert on John's decisions —
  "think like me" (`SES-79` expanded over the full local session archive + structured taps).
  **(5)** THEN the priority-classification sweep (`SES-85`) — deliberately after (4) so
  classification is grounded in John's thinking, not inference. `SES-87` revalidation follows.
  **(6)** The inventor tickets (`SES-84` corpus drip + `SES-88` wiring) run IN PARALLEL at
  any time.
- **B17. Accept follow-through (found live 2026-08-20) — SUPERSEDED 2026-09-01 by `M6-05`
  (`SES-285`, `v7.0.359`); `superseded_by = 'M6-05'`, ledger #31.** Original wording kept below.
  *What changed — a widening, not a weakening:* B17's promise was right and its scope too narrow.
  `M6-05` keeps the wording *"must never evaporate"* verbatim and extends it from Accepts to
  **every** decision a cycle makes, filed **in the same transaction** so no window exists in which
  a decision is recorded and its ticket is not. Measured proof the window was real: card
  `04d34757` — the September budget outage that stopped the runner — sat undecided with no ticket
  behind it at all. **As originally shipped:** an Accept on a gated-before-build
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
- **B23. Gated re-entry is through the queue (John, 2026-08-20) — RETIRED 2026-09-01 by `SES-285`
  (`v7.0.359`); `status = 'retired'`, ledger #26. THIS IS THE LOAD-BEARING ONE.** Original wording
  kept below. *Why:* its clause *"silence parks the card forever — no timer, no retry"* is not a
  description of the 45-card backlog, **it is the mechanism that manufactured it** — 42 of the 45
  had been silent for more than 48 hours with nothing able to move them. It is retired rather than
  superseded because `M6-02` is its exact inverse (silence is assent, reversible for 72 hours) and
  the two cannot both be live for a single second. *What survives:* the pin half, live in `B5` —
  John's *"move to N"* still holds an absolute slot. **As originally shipped:** a gated/proposal
  card's **Accept re-enters the ticket at queue #1** — a system pin, timestamped by the tap, same
  machinery as "move to 1"; the recompute renumbers everything beneath sequentially. Multiple
  Accepts in one sitting stack at the top in tap order; an explicit "move to 1" still outranks
  (latest word wins). Silence parks the card forever — no timer, no retry. Accept authorizes
  that one item once; the gate never learns itself open.
- **B24. A gated card never wastes the cycle (John, 2026-08-20) — SUPERSEDED 2026-09-01 by
  `M6-06` (`SES-285`, `v7.0.359`); `superseded_by = 'M6-06'`, ledger #27.** Original wording kept
  below. *What changed:* B24 was the **mitigation** for a surface now withdrawn — it protected the
  cycle's throughput from the card rather than preventing the card. `M6-06` reaches the same
  outcome one step earlier: there is no card to drop past, because the cycle decides. *What did
  not:* **"exactly ONE build per cycle" is not withdrawn** — it is a throughput rule independent of
  cards and still binds through the runbook's cycle contract. **As originally shipped:** filing a
  gated-before-build
  or removal-proposed card is bookkeeping, not a build — the cycle then drops to the next
  available queued ticket and runs it on the same schedule. Still exactly ONE build per cycle;
  carded tickets go pending immediately so no cycle re-trips on them. Only walls and blockers
  legitimately end a cycle build-less.
- **B25. "Next up" visibility + run-early (John, 2026-08-20) — RETIRED (recorded 2026-08-24,
  attended decision-drain, on John's SES-176 Accept): the "Next up" top-five section was struck
  by John's explicit removal (`SES-124`/`SES-126`; runner-cycle.md step 7: "Do not reinstate the
  struck B25/B26 sections"). Its replacement is §8's queue matrix and §11's now-tier census
  (`v7.0.161`). Historical text follows:** the briefing shows the queue's
  **top five** (queue #, ticket ID, named class, short title, gated flag) so John can see what
  upcoming cycles will do and choose to run the schedule early. Run-now (mobile app /
  claude.ai/code/routines) consumes queue #1 **without shifting the fixed clock schedule**;
  the next scheduled fire takes whatever is then next. Overlap guard (B17 backfill; B17's own row
  was superseded by `M6-05` on 2026-09-01, and the guard it describes is unaffected) protects
  the race. Until `SES-86`, the preview is computed at rebuild; after, it is rows 1–5.
- **B26. Briefing shows the `now`-tier ticket census (John, 2026-08-20):** a count of all open
  backlog tickets remaining in tier `now`, broken down by named priority class (one line per
  class, named form), plus the unclassed remainder until `SES-85` retires it. Rebuilt from the
  data every cycle. **Amendment (John, same day): the page top also carries a compact
  "Next 3" — `ID — title` for the queue's next three — glanceable without scrolling; B25's
  fuller top-five section sits below.**
- **B27. Build-vs-ask decision (John's question, 2026-08-20) — SUPERSEDED 2026-09-01 by `M6-06`
  (`SES-285`, `v7.0.359`); `superseded_by = 'M6-06'`, ledger #28.** Original wording kept below.
  *What changed:* outcomes (3) and (4) named a **gated card** as the defined result for the
  ambiguous middle of the matrix — so the cases where a decision was most needed were precisely the
  ones routed away from being decided. Those two branches are withdrawn. *What did not:* **the two
  axes survive as a reasoning tool, not as a routing table** — authority and specification
  completeness are still the right questions at pick time; every answer now ends in a decision plus
  its recorded reasoning. **As originally shipped — two axes at pick time, four
  outcomes:** Axis 1 authority (the gated list — fails to John regardless of clarity); axis 2
  specification (every open question answerable from: the ticket text, governing architecture,
  vision corpus + decision patterns, or an existing code pattern — else it's John's judgment
  being invented). Outcomes, escalating: (1) build automatically; (2) design via the Fable
  subagent, then build, same cycle, reasoning logged; (3) design, then gated-before-build card
  — "here's exactly what I'd build," John's Rework line is a requirements session in
  miniature; (4) "needs your requirements session" card naming the specific questions —
  reserved for genuine forks (ticket says "John's call", new canonical naming, UI with no
  approved mock, contradicting prior decisions). Bias: 1–3 absorb almost everything; the
  session is the fallback, never the default. **Continuation clause (John, same exchange):
  outcomes 3/4 never end the cycle — the ticket goes pending, the cycle drops to the next
  queued ticket per B24 and still delivers its one build.**
- **B28. Exposure rate on the briefing (John, 2026-08-20) — RETIRED 2026-09-01 by `SES-285`
  (`v7.0.359`), no replacement rule; `status = 'retired'`, ledger #29.** Original wording kept
  below. *Why no successor:* it measures a quantity that is now structurally zero, so a
  week-over-week trend of it reports `0 vs 0` forever — a metric that cannot move cannot inform.
  Its *goal* is achieved outright rather than trended toward. *What survives:* **rule-mining from
  decided items matters more, not less** — the corpus it mines is now the cycle's own recorded
  reasoning (`M6-01`, `M6-06`), which is larger and better attributed than the decided cards ever
  were. **As originally shipped:** a line tracking cards that needed
  John's judgment this week vs. last — the learning loop's visible metric. Every decided card
  (decision + reason, structured) feeds `SES-79` mining → criteria in the decision-patterns
  file / vision corpus → B27 axis 2 consults them, so repeated question-shapes stop reaching
  John. Generalizations are never silent: three similar taps → a proposed-rule card (B14),
  John's tap ratifies. The floor is novel judgment only — nothing should need him twice.
- **B29. The daily "help me" ticket (John, 2026-08-20) — RETIRED 2026-09-01 by `SES-285`
  (`v7.0.359`), no replacement rule; `status = 'retired'`, ledger #30.** Original wording kept
  below. *Why no successor:* it is a daily ask, which is the shape John's instruction removed, and
  it had the cards' own failure mode — one nomination a day into a surface with a two-thirds
  non-response rate. Under `M6-01` a cycle with an open question decides it and records the
  reasoning instead of nominating it. *What survives:* **a genuinely stuck ticket is still
  visible** — `M5-10`, amended in the same commit, surfaces a three-cycle stall with its defer
  reason in the standing brief. Visibility without a question attached. **As originally shipped:**
  the briefing nominates **one ticket
  per day where the runner needs John** — selected from the pending-on-John set by the SAME
  ordering as automation (tier → class → beta → newest), so it changes daily with what's
  pending. The card carries the specific questions (B27's card content) and invites a manual
  session to complete it; a Rework line suffices when the questions are small. On resolution
  the ticket re-enters at **queue #1** (B23 machinery, timestamped) so the next cycle builds
  it first.
- **B22. Run titles name the work (John, 2026-08-20 — verified live: all runs today are
  titled "⚡ deepbench-runner" with no ticket visible):** the moment a cycle picks its work,
  it renames its own session — `"<TICKET-ID> — <short name>"` (e.g. "SES-83 (b) — import
  NEXT+LATER"), or `"did not run — <wall>"` on a wall-stop — so the routine's runs list at
  claude.ai/code/routines shows what each run is doing at a glance. If no title mechanism is
  available in the cloud environment, the cycle notes that in its ledger row (first cycle
  verifies, same pattern as B21).
- **B21. Model choice inside automated cycles (John, 2026-08-20):** the Opus 5 parent cycle
  orchestrates, codes, QAs, ships — and delegates by task shape via the Agent tool:
  judgment-dense steps (kickoff design for P1–P5, root-cause diagnosis, invention scoring,
  P1–P4 classification) → **Fable 5 subagent**; mechanical steps (doc sweeps, imports,
  formatting) → **Sonnet 5 subagent**. Makes §19v's escalation rule executable: a failed
  attempt re-runs that piece one tier up, never grinds. Fable spend is metered by the token
  governor and visible in the briefing's by-model breakdown. **Unverified precondition:** the
  cloud environment supporting Agent + per-agent model — first cycle after rollout reports;
  if unavailable, it notes it in the cycle row and continues on Opus 5.

- **B30. John's automation queue is a SELECTION LAYER, not just a plan (found at close-out,
  2026-08-20):** runbook step 5 picks in three layers — directives → the next incomplete step
  of this file's C4 automation queue → the class-sorted backlog. Without the middle layer, the
  63 open `P9 - Bug Fixes` tickets would outrank every `P10 - Tooling` automation ticket and
  bury the queue John set. The layer retires itself when the automation queue's steps are all
  complete (post-`SES-83` d/e the queue engine's pins express the same thing in data).
  **AMENDED 2026-08-21 (`SES-86` phase 3, `v7.0.133`, directive `f47e5a95`) — the middle layer is
  now DATA, and the closing parenthesis above is what shipped.** John's line: *"keep closing
  automation tooling tickets first before getting to the classified backlog. run as many in
  parrellel as possible, and back to back until automation is complete."* As prose, this layer was
  something each cycle had to remember to consult, recognise the ticket set of, and check the state
  of — and **the forgetting was silent, and had already happened.** Measured on the live board
  `16:29Z`, minutes before the change: C4's tickets sat at queue **2, 241, 242, 243, 244, 280,
  281** of 551, and the `v7.0.130` briefing had told John in writing that *"the next unattended
  cycle will be building product, not tooling, for the first time."* He read that sentence, typed
  the directive, and **force-ran the cycle** rather than waiting for the 17:05Z fire. C4's step
  numbers now live in `backlog_items.automation_rank`, the leading `ORDER BY` key of
  `recompute_backlog_queue()` — so his order arrives as queue positions 1..N and no cycle has to
  read this file to honour it. **It still retires itself, exactly as this register said it would:**
  a `done` ticket leaves the ranked set, so the lane evaporates when the last one closes — that is
  the mechanical form of his "until automation is complete", and no cycle ever declares it over.
  **Not yet built, and named so it is not assumed — now moot on its stated source:** the pins this
  paragraph attributed to B23. **B23 was retired 2026-09-01 by `SES-285`**, so the pin requirement
  no longer descends from it; the surviving authority for a pin is `B5`, which is still live. When
  pins land, a pin sorts **above** `automation_rank` — John's direction outranks a standing build
  order.
  **Second half of his line NOT actioned, carded instead:** "run as many in parallel as possible"
  collides with the `runner_lease` (B31 — since SUPERSEDED by B42, recorded 2026-08-24, attended
  decision-drain, on John's SES-176 Accept: the one-runner mutex is retired, parallel cycles are
  the design, and the lease survives only as the serial tail's publish lock), the single-runner
  control added *after* two cycles built `ADM-1` v1 simultaneously. That call was John's and he
  made it (2026-08-21, register B42): run in parallel — the question this card carried is settled.
  **STATUS RULED 2026-09-02 (`SES-284`, v7.0.378): **live, executing, retirement condition not met**.**
  `SES-284` asked whether the self-retirement clause above had quietly triggered with no ledger entry,
  because `automation_rank` was null on 18 of 23 open Selfbuild tickets. Measured on the live board
  (session `design-ses-284-0902`): the lane is *code*, not prose — `recompute_backlog_queue()` still
  takes `automation_rank NULLS LAST` as its leading `ORDER BY` — and the Automation epic still holds
  **11 open tickets**, so "until automation is complete" has not arrived. The real defect is the
  inverse of the one feared: **8 of the 11 open Automation-epic tickets carry no `automation_rank`**
  (`SES-105`, `SES-108`, `ADM-2`, `SES-80`, `SES-131`, `SES-152`, `SES-155`, `SES-156`) because
  `claim_automation_lane_top()` was never called for them at filing — the lane John ordered is
  half-empty, and those eight sit in the class-sorted backlog he said they should outrank. The ten
  ranked open rows are, conversely, mostly *not* Automation-epic tickets (`SES-288`, `SES-287`,
  `SES-231`, `SES-203`, `SES-185`, `SES-186`, `SES-84` plus three Automation rows already
  `delivered`/`removal proposed`): the lane has been used as a general "top of John's queue"
  device. Both facts are recorded rather than undone — re-ranking eight tickets reorders the top of
  John's board, which is his call, and `M5-01`'s epic fence keeps the Automation epic out of every
  unattended pick regardless of rank, so nothing is mis-built meanwhile. No retirement-ledger entry:
  nothing retired. Registry row unchanged: the statement is still true as written.
- **B33. Heal engine v1 shipped, as built (SES-89, v7.0.108, 2026-08-20):** groups failed
  `public.durable_hops` rows into `(capability_slug, error_class)` signatures, fires at ≥3
  occurrences in a 14-day window, dedups forever on a 12-hex `sig_hash` written into the filed
  ticket's description, and files `P9 - Bug Fixes` tickets into `backlog_items` with
  `source_file='heal-engine'`; dry-run by default, `--apply` needs a real cycle id plus an
  atomically-claimed id block; detection never auto-fixes. **`ai_activity_log` carries no
  error/status column at all** (34,449 rows, verified live) — `public.durable_hops` (260
  `failed` rows) is the only queryable failure signal on the platform; regression trends and
  Vercel logs have no persisted store to query either. Heal tickets are **DB-only** — they land
  in `backlog_items` with no counterpart in any of the three FEATURES `.md` files — until
  `SES-83` phases (d)/(e) flip the database to authoritative. **Consequence for any future
  markdown↔DB reconciliation:** `source_file='heal-engine'` must be added to that script's
  ignore-list, or a naive orphan sweep will delete every heal-filed ticket as unmatched.
- **B34. A gated Accept is permission, not a rating (John, 2026-08-21, directive `fb643367`) —
  SUPERSEDED 2026-09-01 by `M6-07` (`SES-285`, `v7.0.359`); `superseded_by = 'M6-07'`, ledger #32.**
  Original wording kept below. *Why a correct rule was superseded:* **B34 was right and remains
  right — its subject simply no longer arrives.** With the card surface withdrawn there are no
  gated Accepts to exclude, so leaving it live would point a live rule at nothing. **Its reasoning
  is the reasoning `M6-07` is built on**, which is why this is not a reversal of it. *What
  survives, executably:* `public.apply_ladder_decision()` still short-circuits every
  `kind = 'gated_before_build'` row with the reason *"gated card — permission is not a rating
  (B34), ladder untouched"* — which is why closing 44 cards in `SES-285`'s migration moved the
  ladder by exactly zero rungs. **As originally shipped:** asked outright whether an Accept on a `gated_before_build` card should count toward the trust
  ladder, John answered **"no"**. An Accept there authorises that one build and re-enters the
  ticket at queue #1 (B23); it writes `decision`/`decision_reason`/`decided_at` like any tap and
  **does not touch `runner_ladder`**. The ladder measures the runner's *unattended* judgment, fed
  by John's verdict on work already done — a gated card is the opposite transaction, and paying
  the runner for asking permission would tax the one behaviour that must stay free. Shipped
  `v7.0.118` into `runner-cycle.md` step 2 (the operative home) and `briefing-page.md`'s read-back
  contract, which cites rather than restates it. **Two things deliberately NOT done, and both are
  on the briefing rather than decided here:** (1) the ladder's history is **not** re-derived —
  harvests `ae7b57c7` (00:19Z) and `bfa4f42a` (02:19Z) counted gated taps, and unwinding them
  needs the streak-reset-on-promotion value, which the written rule does not define and this
  platform has done both ways, so re-deriving would invent a rule rather than apply one; (2)
  **Reverse-on-gated is not covered and still demotes** — John ruled on Accept only, and the
  symmetric argument (declining permission should not penalise the runner for asking) is an
  inference a cycle must not use to widen its own autonomy rule. `ARCHITECTURE.md` §19v's trust-
  ladder paragraph still carries the undistinguished sentence: it is an architecture supersession,
  the gated lane, so `v7.0.118` **carded** the exact replacement text for John's Accept instead of
  editing it.

- **B35. John's three answers, 2026-08-21 (directive `1d01ea85`, shipped `v7.0.121`) — SUPERSEDED
  2026-09-01 by `M6-07` (`SES-285`, `v7.0.359`); `superseded_by = 'M6-07'`, ledger #33. READ THE
  SCOPE OF THIS ONE BEFORE ACTING ON IT.** Original wording kept below. **Only answer (1) —
  Reverse-on-gated — lost its subject.** B35 bundles three unrelated rulings into one registry row,
  so superseding the row is the only way the registry can say that one of them no longer has
  anything to apply to; `M6-07` carries that ruling forward in the form that still does have a
  subject: **a reversal demotes.** **Answers (2) and (3) are UNAFFECTED and still binding, and
  neither is an M6 matter:** *the budget day boundary is midnight America/Chicago* (still what
  `runner_budget` is read against), and *a dead-cycle report must state why it died and what to do
  next* (still the `did_not_run` contract in `docs/runbooks/runner-cycle.md`). Both are restated in
  that runbook independently of this row. They are John's rulings and were never withdrawn.
  **As originally shipped:** one line
  into the briefing directive box — `1.leave it 2. Midnight cst 3.need to know why it died and
  what to do next` — answering the three "Help me" questions the `v7.0.118` page asked, in its
  order. All three are now in the procedure rather than in a directive row.
  - **(1) Reverse-on-gated → "leave it" — the one answer of the three that `M6-07` superseded on
    2026-09-01, because gated cards no longer exist to be reversed.** `B34` (also **superseded**,
    by the same rule) deliberately left this half open rather than
    close it by inference. John ruled: a Reverse on a `gated_before_build` card **still**
    sets the streak to 0 and demotes a rung — a ruling `M6-07` carries forward in the form that
    still has a subject, *a reversal demotes*. The behaviour did not change; its **status** did —
    it was settled, and the briefing and the runbooks stopped carrying it as an open question.
    `B34`'s
    second "deliberately not done" is therefore **closed**; its first (no retroactive re-derivation
    of the ladder's history) stands untouched and still awaits the word "rewind the ladder".
  - **(2) The budget day → "Midnight cst".** "Today", on both budget tracks, is an
    **America/Chicago** calendar day, not a UTC one. Load-bearing, not cosmetic: the CST day
    starts at 05:00Z, so most of a night's cycles fall outside it — measured live at 13:16:54Z
    over the same `runner_cycles` rows, **12** cycles / `6,620,000` est. tokens in the UTC day vs
    **4** / `1,240,000` in the CST day. Two boundaries stated
    with it: it is **not** the existing display-only times rule (store UTC, render CST — that one
    governs rendering, this one governs arithmetic, and neither implies the other); and it is
    **forward-only** — a stored `budget_override.expires_at` is honoured as written and never
    retroactively shortened, because re-deriving a grant under a later rule is the runner taking
    back something John gave. §19v is *silent* on the boundary, so this defines an undefined term
    and supersedes nothing — no gated-lane edit is owed.
  - **(3) A dead cycle → "need to know why it died and what to do next".** Detection already
    existed (lease TTL, `steals`, the `ended_at IS NULL` sweep) and was the only thing that
    noticed `ba8f2ce3` and `633fe486` dying on 2026-08-21; John learned of it from a card the
    next morning, because `v7.0.106` deliberately kept the lease off the briefing. Now: runbook
    step **0b** closes each dead row *and* **pushes**, and the page carries a durable copy.
    **The honest limit is written into the rule itself** — a cloud cycle's transcript dies with
    its container, so the runner reports last observable state plus a named hypothesis, never a
    cause it did not observe (the `v7.0.115` failure generalised). "What to do next" explicitly
    includes **"nothing"**, which is the usual truthful answer; two deaths on the same mission is
    the one shape that means stop and look.
- **B36. OPEN — subagents appearing to ask permission inside automated cycles (John's question,
  2026-08-21, same directive; runner-owned, not John's to decide).** Verbatim: *"Why are
  subroutines asking for permission? It should have full access and not asking. This is new. All
  of a sudden."* Logged as a question the **runner** must answer with evidence, not one John
  must rule on. `v7.0.121` measured it live with an instrumented Fable 5 subagent — six timed
  probes, breadcrumbed outside the paths under test — and reported the result to John on the
  briefing rather than converting a single run into a rule. Any doc or config change waits on
  a defect this reproduces, per the standing rule that one measurement in one environment is
  evidence, not a general claim.

- **B37. A silent cycle is not a dead cycle — measured, and it corrected this same cycle's own
  rule before it shipped (`v7.0.121`, 2026-08-21).** While `v7.0.121` was writing B35(3)'s
  dead-cycle rule — **B35's row was later superseded by `M6-07` (2026-09-01) for its
  Reverse-on-gated clause only; answer (3), the dead-cycle report, is unaffected and still binds** — the two cycles that rule was *about* — `ba8f2ce3` (started 03:52Z) and
  `633fe486` (05:07Z), both pronounced `outcome='failed'` by a successor at 08:24Z on the
  strength of the 45-minute lease TTL — **woke up and finished**. At 13:11Z and 13:12Z they
  wrote their own token accounting, detected the live lease, **correctly declined to push and
  race it**, filed their findings as directives `a55155f3` / `c4d95dc7`, and pushed their work
  to their own session branches. A harness suspend/resume of more than nine hours, not a death.
  Three consequences, all now in `runner-cycle.md` step 0b:
  - **A successor never adjudicates a predecessor's outcome.** Taking the lease on TTL stays
    correct; writing `ended_at`/`outcome` on someone else's row does not — it destroys the record
    that cycle is about to write and files a working cycle as a failure in the ledger John reads.
    `failed` needs evidence, and no sooner than 24h of no attributable writes (a bar derived from
    the measured ~9h20m resurrection, not chosen).
  - **"Went silent", never "died"**, in pushes, cards and ledger rows.
  - **A silent cycle's work is often recoverable.** Both pushed to session branches; the right
    action for that pair was "cherry-pick `69bc903`", not "the work is gone". Verified live: the
    branch and commit exist on origin, and `dev` was still at `7e58983` — neither raced the ship.
  This is the `v7.0.115` failure (a hung probe's silence read as a finding) in its third costume.
  The rule `v7.0.117` installed — *a subagent that has not returned is not a result* — applies to
  an absent **cycle** exactly as to an absent **subagent**, and this is that rule finally being
  applied to the thing it was written about.
- **B38. OPEN, and it narrows B36 — the `.claude/` block may be BASH REDIRECTION, not the path
  (`v7.0.121`, 2026-08-21; owner-visible, runner-owned).** `v7.0.117` shipped a blanket rule to
  `dev`: *a cloud cycle writes NOTHING under `.claude/`*. Cycle `ba8f2ce3`'s own tool-level record
  contradicts it — four `.claude/` writes via the **Write/Edit tools**, none prompted, none
  denied, all completing in seconds, including the real `session-hygiene/SKILL.md` edit (59→80
  lines) by a Sonnet 5 subagent that returned normally in 188,653 ms. Every observation that
  *did* hang used **Bash redirection** (`printf > .claude/…`). `v7.0.121` reproduced the hang
  independently: an instrumented Fable 5 probe ran five tool calls — a Bash write outside
  `.claude/`, a Read of `CLAUDE.md`, `git status`, a Write+delete inside the repo, and a **Read
  under `.claude/`** — all returning instantly with no prompt. The sixth,
  `printf > .claude/inflight/probe-fable.md`, **returned after 1,084 s (18 min 4 s) with no
  visible prompt, and the write SUCCEEDED.** Then the decisive control: the probe's own cleanup
  `rm` of that same file — a second Bash write-class call under `.claude/` in the same session —
  **returned in ~6 s. The stall did not repeat.**

  **John's instinct was right about where this lives, and the answer to B36 is more precise than
  "no".** The sharpest measurement the probe made: inside the stalled call, `date +%s` printed
  **the same second** before and after the command body — so the 18 minutes elapsed *between
  tool-call issuance and shell execution*, *i.e.* **in the harness permission layer, not in the
  shell**. So something permission-shaped is indeed happening; what is *not* happening is anyone
  being asked in a way they could answer. No prompt surfaced on any of the seven calls, and no
  configured rule explains it: `~/.claude/settings.json` does not exist, the repo's
  `.claude/settings.json` is an allow-list with **no deny rules and no `.claude/` entries**,
  `policy-limits.json` is restrictions-only, `remote-settings.json` is `{}` — all re-read this
  cycle. The gate is therefore **path-based and harness-level**, not tool-based: `Bash` is on the
  routine's own `allowed_tools` grant and the call stalled anyway, which means **no tool-name
  allowlist can pre-approve it** and no settings change of John's can fix it.

  **Why it feels sudden, which was the other half of his question:** `CLAUDE.md`'s router makes
  creating `.claude/inflight/<name>.md` the *first action of every session*, so the runner only
  began hitting this path routinely once it started running unattended. Whether the harness
  behaviour itself is new was **not** measured — the mechanism was, the start date was not.

  **What it actually is, on the evidence: an intermittent multi-minute stall that CLEARS, on a
  path that IS writable.** Three returns now sit on the record — ~35 min (`v7.0.115`), 18 min
  (this cycle), and instant on the very next `.claude/` write in the same session — plus
  `ba8f2ce3`'s four Write/Edit writes in seconds. **This retires the redirection hypothesis this
  register was first filed with:** the cleanup `rm` was a Bash write-class call under `.claude/`
  and it was instant, so "Bash vs Write/Edit" does not separate the cases either. Nothing
  reproducible distinguishes a stalling call from a fast one; what is established is only that
  **the write lands and the stall clears**, and `v7.0.115`'s "blocked" and `v7.0.117`'s blanket
  *"a cloud cycle writes NOTHING under `.claude/`"* are both wrong — the first two cycles thought
  dead were merely slow (B37), and the path was never closed. **The practical rule is a cost, not
  a prohibition:** a `.claude/` edit may cost up to ~35 minutes of wall clock and must therefore
  never be the last thing a cycle attempts, but it is legitimate work and does not need carding
  to a laptop session. Rewriting `runner-cycle.md`'s step-0 clause on that basis is **not** this
  cycle's build — `SES-95` does the edit, and its own success or stall is the confirmation.
  `73e41d2c` Task 1 **still has not shipped**, verified live against `dev` at 13:1xZ.

  **The candidate fix, which is cheap and worth a ticket rather than a cycle's cleverness:** stop
  writing to that path at all. The inflight marker is the only thing that *forces* a cloud cycle
  under `.claude/`, and step 0 already exempts cloud cycles from creating one — so moving the
  laptop convention to a top-level `inflight/` (or the scratchpad) would take the whole class of
  stall off the table for every session, rather than teaching each one to tolerate it. Not done
  here: it edits `CLAUDE.md`'s router, which is John's, and one build per cycle. Two further
  measurements would sharpen it first, both cheap: time an identical first `.claude/` write from
  a **parent** session (does the stall scope to subagents?), and from a **second fresh subagent**
  (is it once per agent, or once per session?).

  > **CORRECTED 2026-08-21 (`v7.0.122`, directive `34865f07`, register B39) — B38's location was
  > right and its clearing model was wrong; the wrong sentences are kept because the mistake is
  > the lesson.** What B38 concluded: *"an intermittent multi-minute stall that CLEARS,"* therefore
  > *"a cost, not a prohibition,"* budget ~35 minutes, and *"`SES-95` does the edit, and its own
  > success or stall is the confirmation."* What is now known: the stall does **not** clear on its
  > own — it clears when **a human opens the session and answers a permission prompt the agent
  > cannot see**. B38's own sentence *"what is not happening is anyone being asked in a way they
  > could answer"* is the one that falls: John was asked, and answered. Its ~35-minute cost figure
  > is not a distribution but **a sample of the attended cases**; unattended, the measured values
  > are ~9h, ~8h and never. **`SES-95` is therefore superseded as "the decisive probe"** — run
  > unattended it parks the cycle rather than confirming anything. Everything else in B38 stands,
  > including its candidate fix (below), which B39 endorses and escalates.

- **B39. John's testimony names the mechanism — the `.claude/` gate is a human-answered permission
  prompt, and an unattended cycle has no bounded recovery from it (`v7.0.122`, 2026-08-21;
  John's word, runner-implemented).** He wrote, verbatim: *"Those sessions came back alive because
  I opened them and allowed permissions. That should not be happening. This all started yesterday
  after the new rules of the database for the backlog"*. Three parts, and they do not share a fate.

  **TESTIMONY — the mechanism, and it resolves four days of contradictory probes.** The gate is a
  harness permission prompt rendered **only in the human-facing session UI**, never in the agent's
  transcript. An agent cannot see it, report it or answer it; from inside, an unanswered prompt is
  indistinguishable from latency, from suspend/resume, and from a hang — which is precisely why
  `v7.0.115` ("blocked"), `633fe486` ("suspend/resume") and B38 ("intermittent latency") each read
  the same silence differently and each read it wrong. It is corroborated by a line that has been
  on the record since 2026-08-20 and was never connected to this: `SES-78c` run 1's stalls were
  *"flagged sensitive twice, **each stall needing John's tap**"* (`docs/SESSIONS.md:639`).

  **MEASUREMENT — the partition, derived by a Fable 5 subagent and re-derived independently from
  live `runner_cycles` / `runner_items` rows before being written here.** Sort every `.claude/`
  probe by whether John was demonstrably in the app, using his timestamped briefing taps as the
  proxy. **His taps stop at `03:48Z` and resume at `12:50Z`** — a nine-hour hole on the night of
  2026-08-20→21. `c6c50bdc` (`02:06Z`, attended) returned in ~35 min; `55defd59` (`13:01Z`,
  attended) returned in 18m04s with its next `.claude/` call at ~6 s; `ba8f2ce3` (`03:52Z`, four
  minutes after his last tap) parked ~9h20m; `633fe486` (`05:07Z`) parked ~8h05m; `12953ca8`
  (`08:07Z`) **never returned**. The partition is exact, and the clincher is the resumption: the
  two parked cycles came back **together at 13:09–13:12Z, eighteen minutes after his first tap of
  the morning.** Latency does not synchronise on a human's alarm clock.

  **RULING → what shipped.** `runner-cycle.md` step 0's clause, rewritten a fourth time but for the
  first time on an observed mechanism: **an unattended cycle never enters the gate**, because it has
  no bounded recovery; it cards the edit with exact replacement text for **a session John attends**
  (attendance, not the machine, is the operative property). Narrower than `v7.0.117`'s blanket
  prohibition — the edit is legitimate work, and the path was never blocked — and broader than
  B38's "budget 35 minutes". Step 0b gains the leading evidenced hypothesis for a silence, the
  caveat that a silence during his waking hours is a *different* finding, and one prohibition that
  follows directly from *"that should not be happening"*: **"open the session and approve" is never
  written to John as the remedy.** It works, and offering it converts his instruction into a chore.

  **CONTRADICTED — the onset half, said plainly rather than softened.** `SES-78c`'s stalls close
  with `b5f263d`, **2026-08-20T03:37:46Z = Aug 19, 22:37 CST**. The backlog-DB change is `752f1e4`,
  **2026-08-21T00:37:33Z = Aug 20, 19:37 CST**. The stalls predate the change he names by **21
  hours almost to the minute**, and selection SQL has no mechanism for altering harness permission
  behaviour. What survives is real and worth telling him: the backlog-DB migration made
  `session-hygiene/SKILL.md` stale, which **manufactured the first missions requiring a `.claude/`
  write** — so it is genuinely when unattended cycles began hitting the gate repeatedly. The other
  correlate is Automated go-live itself (`0c8b058`, Aug 19, 23:26 CST), forty-nine minutes after the
  first recorded stall. Right phenomenon, wrong first cause.

  **STILL INFERENCE, labelled so the fifth rewrite does not inherit false confidence.** No prompt
  has ever been directly captured; `v7.0.115`'s 35-minute clearance has no identified clearer; and
  `ba8f2ce3`'s fast `Write`/`Edit` calls are not ordered against John's approval, so "Write/Edit
  never prompts" is not excluded. **What would legitimately reopen this:** a captured prompt, or a
  pre-approval that survives an unattended run. A fast `.claude/` write is not evidence the gate is
  gone — it is evidence somebody was watching.

  **THE STEELMAN AGAINST IT, shipped alongside because omitting it is how the last three flips
  happened.** A standing prohibition exiles all `.claude/` skill and rule maintenance to scarce
  attended sessions — exactly the drift this week demonstrated, with `session-hygiene/SKILL.md`
  stale through five consecutive cycles that each declined to touch it. And the confirming
  experiment is cheap: `SES-95`'s text is already written and pushed. The answer is in the rule's
  shape — it prohibits **unattended** entry, not the edit — but the cost is real and belongs on the
  record.

  **TWO THINGS FOR JOHN, both his and neither done here.** (1) The permanent fix B38 already
  identified: move the inflight marker out of `.claude/` entirely, which takes this whole class of
  stall off the table for every session. It edits `CLAUDE.md`'s router, which is his. (2) The new
  question his testimony raises, which nobody had standing to ask before: **is there a pre-approval
  he can grant these cloud sessions so the prompt never fires?** His configuration, his call — and
  if the answer is yes, this register's rule is the thing it retires.

- **B40. Claim-on-pick shipped as SES-86 phase 1 (John, live in chat 2026-08-21: "yes, ship it";
  `v7.0.127`, attended session `automation-review`).** John's mechanism, adopted with one
  adjustment: the claim lives in two new `backlog_items` columns (`claimed_by`, `claimed_at`,
  migration `ses86a_backlog_claim_on_pick`) rather than overwriting `status` — an abandoned
  ticket must get its old status back, and overwriting destroys it. Behavior is exactly what he
  described: any session — manual or scheduled — atomically claims a ticket at pick
  (`runner-cycle.md` step 5; `session-setup` skill step 2c), every other session's selection
  skips claimed tickets, and a claim expires after 24h (the B37 evidence bar) so a dead session
  cannot strand one. B6's full lifecycle status (`filed`→…→`completed`) remains SES-86's
  unbuilt remainder; this phase covers only the collision John hit live (SES-95 shipped
  attended while a cycle carded the same work). QA: three arms live on real rows — fresh → 1,
  contested → 0, 25h-stale → re-claimable.

- **B41. The inflight marker is out of `.claude/` (John, live in chat 2026-08-21: "yes move the
  marker"; `v7.0.131`, attended session `automation-review`).** B38 identified the fix, B39 left
  it to John (it edits `CLAUDE.md`'s router), and he approved it. Markers now live at repo-root
  `inflight/<short-session-name>.md` — same filename, content, and lifecycle; only the directory
  changed. All ten live markers `git mv`-ed in the same commit; `CLAUDE.md`, `CLAUDE-DESIGN.md`,
  `session-setup` SKILL.md and `scripts/check-session-docs.js` retargeted, with the old path kept
  as a read fallback in the checker (both the dev-side listing and the on-disk 5e check) so a
  not-yet-rebased live session's marker is still seen rather than its worktree misread as stale.
  With `SES-96`'s rebuild fix, no routine procedure touches a permission-gated path any more;
  the gate now matters only if a future task genuinely edits `.claude/` skill/rule files —
  which step 0's carding rule still covers, pending the "Always allow" persistence experiment.

- **B42. Parallel cycles are the design — the cycle-level lease is retired (John, live in chat
  2026-08-21; `v7.0.137`, attended session `automation-review`).** Verbatim: *"i don't care what
  the rules are - routines should be able to run multiple in parallel and not overwrite each
  other and manage sessions accordingly. I can run 10 sessions manually and there is no problem.
  What if i want to run 100 automated routines at once? should not be an issue - self
  administered and fixes itself if it happens to notice it is about to overwrite another
  session."* This supersedes B31's one-runner mutex (kept in `v7.0.106` history; its
  ADM-1-double-build lesson survives in the per-resource controls) and closes the
  parallel-cycles gated card `v7.0.133` filed. The model: every stamp-checked fire runs;
  tickets coordinate via claims (contested → next queued ticket, his rule verbatim); counters
  are atomic; pushes rebase-retry ×3; the **briefing tail** (harvest → ladder → republish) is
  the one serial section, guarded by the repurposed `runner_lease` singleton (10-min TTL,
  wait-and-retry — the "did not run — lease held" exit is deleted as the exact behavior he
  rejected); self-healing on contention (re-fetch + re-harvest after taking the tail lease;
  idempotent decision writes). The `v7.0.123` re-assertion principle retargets to the ticket
  claim. **Named cost, not hidden:** budget walls are per-cycle-start checks, approximate under
  parallelism; an atomic allowance-claim is the upgrade if the fleet scales to tens.

## D. Ticket ledger

**Filed this session (8):** SES-81 (backup tool table discovery) · SES-82 (programmatic meter
read when upstream ships) · SES-83 (backlog→DB; a ✅ v7.0.100, b/c queued, d/e gated) ·
SES-84 (vision corpus, drip model) · **SES-85 (classification sweep) · SES-86 (queue engine) ·
SES-87 (revalidation flow) · SES-88 (invention wiring)** — the four cut on C4's approval,
dependencies in each row. B14 extends existing SES-79 (B14 was **superseded** by `M6-02` on
2026-09-01 — only its tap-ratifies clause; the mining half it extends SES-79 with is unaffected);
B9/B11 are rulebook edits, not tickets.

**Directives queued:** SES-83 phases b+c (id `5e4bc577`, with John's amendments).
