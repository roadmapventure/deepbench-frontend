<!-- DeepBench v7.0.213 | docs/SELFBUILD-CHARTER.md | created 2026-08-23, session design-automation-governance-0823 (attended discovery, model Fable 5) — the Selfbuild project charter. John-approved structure 2026-08-23. This file holds purpose, goals, policies, and decisions — the LIVING plan (milestones, activities, progress) lives in public.epics + public.backlog_items and is read by query, never maintained as prose here. -->

# The Selfbuild Project — Charter & Business Plan

## Why this project exists

DeepBench is an AI workforce platform that builds itself: an autonomous runner designs, codes,
verifies, and delivers its own improvements, with John's briefing page as the oversight surface.
In its first 4 live days (2026-08-20 → 08-23) it shipped 80 of 114 cycles with an 86% acceptance
rate — the loop works. But the 2026-08-23 governance audit (session
`design-automation-governance-0823`) showed the foundation can't carry the ambition: governance
is free-form prose with no single source of truth (~30 stale statements, 3 hard contradictions,
5 orphans found across 82 governance/tooling files), the builder certifies its own work,
enforcement lives on one machine, and every delivery waits on John's per-ticket verdict.

**This project turns a working prototype of a self-building platform into a trustworthy one — a
system that grows without a human in the loop, and earns that by verifying itself more rigorously
than a human ever did.** Maturity at charter time: 5/10.

## Purpose

Make DeepBench a self-designing, self-healing, self-verifying platform that autonomously carries
improvements from idea to production, where **John governs by exception — setting vision,
sampling results, and reversing mistakes — never by gate.**

## Goals

1. **Autonomous delivery:** design → build → verify → ship → done with zero human action on the happy path.
2. **One version of the truth:** every governing fact has exactly one authoritative home — database
   rows for anything that changes, generated views for anything read, judgment prose in one named
   doc; nothing hand-copied.
3. **Independent verification:** no change certifies itself; a fresh-context verifier must pass it,
   and rules bind via portable CI, not one machine's hooks.
4. **Self-healing:** production failures are detected, ticketed, fixed, and confirmed-fixed by the
   loop itself, including recurrence.
5. **John-audited, not John-paced:** verification writes `done`; John samples; Reverse is always one tap away.
6. **Self-growing (the Inventor):** the platform originates features from evidence — industry
   research, white space, usage telemetry, and a measured model of John's own judgment.

## Storage rule (settled 2026-08-23)

Facts, state, and history live in the database; procedures and judgment live in lean markdown;
anything read in multiple places is **rendered from the authoritative row, never hand-copied**.
The boundary: *if violating it should be detectable, it's a row; if following it requires
judgment, it's prose in exactly one named doc.*

## The milestones

Milestones are **epics** in `public.epics` (`Selfbuild M0` … `Selfbuild M7`); activities are
tickets in `public.backlog_items` with `epic_id` set. **The DB is the plan** — the list below is
orientation, not membership; membership is the epic query.

| Epic | Theme | Gate ticket |
|---|---|---|
| Selfbuild M0 - Backup & Rollback | Snapshot everything; prove restorable (Step 0) | SES-169 |
| Selfbuild M1 - Consolidation | Fix the audit's findings; full-board revalidation | SES-170..173 |
| Selfbuild M2 - Truth Infrastructure | Rules registry, rendered rule blocks, truth tripwire, generated state, Project panel, milestone-gate reviews | SES-174..179 |
| Selfbuild M3 - Independent Verification | Portable CI, reviewer lane, auto-rollback | SES-180..182 |
| Selfbuild M4 - Infrastructure Floor | Backups/tiers/secrets — designed at its gate | SES-183 |
| Selfbuild M5 - Closed-Loop Healing | Outcome telemetry, heal v2 — designed at its gate | SES-184 |
| Selfbuild M6 - Autonomy Graduation | Ladder-driven auto-accept, caps retirement — designed at its gate | SES-185 |
| Selfbuild M7 - The Inventor | Research lane, verdict mining, John-model — designed at its gate | SES-186 |

**Rolling-wave rule:** M4–M7 hold a design-gate ticket only; their members are filed at the gate,
after the M-gate review (SES-179), never speculatively. Open questions stay in §Open questions —
they never become ticket IDs before they're settled.

**Sequencing invariant:** scaffolding comes down only as its replacement goes up — no cap is
retired and no gate collapsed until the metric that replaces it is live and green.

**Transition rule — no governance vacuum (John, 2026-08-23):** existing governance is never
suspended while this project runs. Every Selfbuild cycle executes under the full current
rulebook; a rule changes only via a shipped ticket whose own commit lands the replacement,
retires the old rule (retirement-ledger entry, same push), and leaves no commit where neither is
in force. The one active pre-agreed change is the interim auto-accept bar (Decisions log #2).
Each SES-179 gate review verifies "every rule retired this milestone has its replacement live
and green." John's standing powers — human-in-chat outranks the queue, §2b switches, Reverse,
hooks never routed around — are permanent and outside this project's authority to modify.

## Measures

| Goal | Measure | Test |
|---|---|---|
| Truth | Drift findings/week | Truth tripwire (SES-176) every commit; trend to ~0 and stay |
| Verification | **Verifier catch rate vs John's Rework/Reverse rate** — the keystone metric | Every John Rework is a defect the verifier missed; verifier earns authority when it catches ≥ John over rolling 30 deliveries |
| Delivery | Cycle outcomes, ticket→done lead time | `runner_cycles`; briefing scoreboard |
| Healing | Failure→ticket→confirmed-fix time; recurrence rate | heal-engine telemetry + post-fix signature watch (M5) |
| Autonomy | % deliveries with zero human action; John-minutes/week | Briefing Project panel (SES-178); rises as ladder widens |
| Safety | Reversal rate on auto-done; rollback success | Sampling audits; a Reverse spike auto-narrows the ladder — autonomy is elastic, never ratcheted |
| Invention (M7) | Inventor acceptance rate; John-model prediction accuracy; % shipped work platform-originated | Verdict feedback loop |

**Canonical progress query** (answers "how close are we" any time, before SES-178 renders it):

```sql
SELECT e.name,
       count(*) FILTER (WHERE b.status IN ('done')) AS done,
       count(*) AS total,
       round(100.0 * count(*) FILTER (WHERE b.status = 'done') / count(*), 1) AS pct
FROM epics e JOIN backlog_items b ON b.epic_id = e.id
WHERE e.name LIKE 'Selfbuild%'
GROUP BY e.name ORDER BY e.name;
```

## Multi-agent verification (anti-drift, anti-hallucination)

1. **Builder/verifier separation** — verifier has fresh context, reads canonical rules + diff,
   never the author's conversation; verdict-only; cannot edit.
2. **Mechanical truth before judgment** — scripts (tripwire, regression, deploy-currency) run
   first; agents spend judgment only where greps can't.
3. **Adversarial panels on high-stakes changes** — independent skeptics prompted to refute;
   majority-refute blocks.
4. **Grounding rule** — every factual claim in a delivery cites a checkable source (query,
   file:line, test run) or blocks; fail closed.
5. **Drift sentinels** — the governance audit (this session's shape) re-runs periodically and
   files what it finds.
6. **Watch the watchers** — verifier block-rate and audit findings on the briefing; block-rate
   at zero while drift persists = rubber-stamp flag.
7. **Milestone gate reviews (SES-179)** — PM lens + Chief Architect lens re-evaluate the plan at
   every epic retirement, verdict as a briefing card. Governance-lane roles, never product
   roster agents.

## Definition of success — project-end acceptance (John, 2026-08-23)

The project is judged against the statements below at the final SES-179 gate review — the **exit
exam**. Each criterion must be *demonstrated with evidence links*, never asserted; the review
issues pass/fail per criterion, and John gives the project's single final Accept. Numeric
targets marked * are defaults set 2026-08-23; they are reviewed (and may be tightened) at the
M6 gate before they bind.

**Baseline (recorded at charter time, 2026-08-23, so "better" is measured, not remembered):**
maturity 5/10; 114 cycles / 80 shipped in 4 days (one lane); John verdicts 85 Accept / 11 Rework /
3 Reverse with **100% of deliveries requiring his tap**; board 569 open (290 in `now`);
~30 stale governance statements + 3 contradictions live; `SESSIONS.md` +190 KB/day; QA
self-certified by the builder; enforcement on one machine; no DB backups.

1. **The unattended-run test.** The platform runs **14 consecutive days*** with zero human action
   on the happy path — designing, building, verifying, shipping, healing — with ≥ **90%*** of
   deliveries zero-touch and John under **30 minutes/day***, measured on the Project panel, while
   John's machine plays no required role on any day.
2. **Verification proves itself.** Over a rolling 30 deliveries: the verifier's catch rate ≥
   John's baseline Rework+Reverse rate; reversal rate on auto-`done` work ≤ **5%***; zero
   deliveries shipped with an ungrounded claim (grounding gate green throughout).
3. **Truth stays true.** The truth tripwire reports ~0 drift findings for **4 consecutive
   weeks***, and **re-running this project's own founding governance audit** (the
   design-automation-governance-0823 five-auditor sweep, same method) returns no stale
   statements, no contradictions, no unfollowable rules. The audit that started the project is
   its exit exam.
4. **Healing closes its loop.** A production failure (real or deliberately seeded) travels
   failure → evidenced ticket → fix → **confirmed-fixed in production** with no human touch; a
   recurrence of a previously-fixed signature is re-detected and re-filed.
5. **Resilience is drilled, not assumed.** One full restore-from-backup drill and one
   auto-rollback drill (red push reverted to green) have each been executed successfully and
   their evidence linked.
6. **The backlog is healthier, not just smaller.** Net burndown over the project is positive;
   ticket→`done` lead time is below baseline; the `now` tier reflects real priority (the
   290-ticket inflation resolved by the SES-173 revalidation); every open ticket carries a class
   and a design status.
7. **Invention is proven end-to-end, once.** At least one platform-originated feature has
   completed the full path — researched with cited evidence, proposed, ratified by John, built,
   shipped — **and is measurably used by real visitors** (usage telemetry, not existence). The
   John-model's verdict-prediction accuracy is reported with its trend.
8. **The machine outlives the project.** The success measures above don't retire with the exit
   exam — the Project panel's metrics (drift/week, catch rate, reversal rate, zero-touch %,
   John-minutes, cost per delivery, invention acceptance, visitor usage of shipped work) remain
   standing instrumentation, because the definition of continued success is the same as the
   definition of project success, applied forever.

**How we know we built the right thing, not just finished the list:** criteria 1–5 prove the
factory works without John; 6 proves it works *on the real backlog*; 7 proves it can grow the
product, not just maintain it; 8 makes success a permanent property instead of a graduation-day
snapshot. If every activity closed but any criterion fails, the project is NOT done — the gap
becomes the final milestone's work, per the closure discipline's gate-review path.

## Closure discipline — the project ends (John, 2026-08-23)

1. **Fixed finish lines.** Each milestone drain is declared with a fixed member list (the
   `SES-142` drain-scope mechanism); a ticket filed after the naming never joins it. Project end
   state: all 8 epics retired and the final SES-179 gate review returns "no successor members."
2. **Finish, don't file.** Residue discovered while closing a ticket that fits the closing
   cycle's scope gets completed, not ticketed. A new ticket requires a genuine discovery with
   evidence (the heal-engine bar), never a "worth noting."
3. **New filings default outside the project.** Mid-milestone discoveries queue to the general
   board. Only a gate review (SES-179) can add members to a later milestone — batched and
   visible to John, never a cycle's solo close-out call.
4. **Net burndown is watched.** The Project panel (SES-178) shows closed vs. filed per
   milestone; filing faster than closing is a flag on John's page.

## Retirement ledger — nothing removed without a record (John, 2026-08-23)

Every rule, statement, file, or script removed or not carried forward by this project gets an
entry in `docs/SELFBUILD-RETIREMENT-LEDGER.md` (append-only; created as the M1 sweep's first
deliverable): what it was (verbatim or git-blob pointer), where it lived, **why it was retired**
(superseded-by / premise-dead / duplicate-of, with the surviving home named), and the restore
path. Removal without a ledger entry fails review. Proof bar per removal: content shown
relocated verbatim or superseded by something named — the `SES-164` trim discipline,
generalized. From M2, retired *rules* live as `governance_rules` rows
(`status = retired`, `superseded-by`); the ledger remains the narrative index. The Step 0
snapshot (`SES-169`) stays the independent wholesale-recovery net beneath all of it.

## Escalation policy — when John hears from us

Only for: **(a)** Tier-3 calls (superseding his decisions, terminology, retiring his files);
**(b)** verifier/reviewer fail-closed disagreements; **(c)** anything spending money — purchases
are John's to click, never the platform's; **(d)** incidents worth a Reverse. Everything else is
briefing cards read at leisure. Manual Design & Build mode is permanent — a human in the chat
always outranks the queue, and the machine yields.

## Decisions log (John, 2026-08-23, session design-automation-governance-0823)

1. **"I want out of the loop"** — target is John-audited (sampling + Reverse), not John-paced.
2. **Auto-accept approved for this project's `P10 - Tooling` deliveries.** Interim bar until the
   M3 verifier exists: build + regression + hygiene tripwire **all green** → auto-`done`; any red
   or skipped check still cards John. Reverse always available. (Supersedes SES-154's
   John-only-writer rule *for this epic family only*; general graduation is M6's gate.)
3. **Budget for M4 paid tiers: deferred** — "let's review when we get there." M4 is designed at
   its gate with both options open; no free-tier assumption baked into M1–M3.
4. **Charter name approved:** `docs/SELFBUILD-CHARTER.md`.
5. **Rules disposition:** concurrency/claim/fail-closed/budget/hygiene rules kept; model-per-lane
   kept (ported to data at M6); numeric file/task caps retire **only when** the verifier replaces
   them; design-record-before-code kept, separate-session requirement collapses at M6; product
   constitution (Rule #1, capabilities-as-data, Librarian gate, logging) untouched.
6. **Milestone epics created** (8, `Selfbuild M0`–`M7`) — prompted by John's project-plan
   directive; epic ask-first rule satisfied.
7. **Revalidation on architecture change** — every thesis-level decision triggers a board
   revalidation cycle (first: SES-173).

## Rollback plan

Three-layer backup (SES-169, verified restorable before anything else runs): git tag
`governance-pre-selfbuild-0823`; full Supabase dump including all `runner_` tables (after SES-81
fixes the tool's skip list); machine-local `C:/Projects/.claude/` hooks + settings copied to the
backup set. Restore = checkout tag + restore dump + re-enable hooks + scheduler on: the platform
reboots into the exact state that shipped 80 times in 4 days.

## Open questions

- **M4 budget** (~$45–70/month) — review at the M4 gate (decision 3).
- **SES-105 vs SES-155/156** — which owns the answer-John-on-the-card surface; settle in SES-173's revalidation.
- **SES-123 notifications** — disposition (M4 audit surface vs earlier) at the M4 gate.
- **Manual-fire pacing** (`q-manual-fire-pacing`) — still open from SES-151; unchanged by this charter.

## Execution status

**Awaiting John's mark.** On go: SES-169 (Step 0 backup) runs first and must verify restorable;
then the M1 sweep attended (scheduler paused for the hour); then the drain proceeds epic by epic
with SES-179 gate reviews between milestones.
