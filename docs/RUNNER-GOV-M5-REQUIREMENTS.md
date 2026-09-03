<!-- DeepBench v7.0.412 | docs/RUNNER-GOV-M5-REQUIREMENTS.md | SES-320 — M5-14 gains a dated note NAMING THE MECHANISM that performs it, and the rule STATEMENT is untouched: no registry row edit, no re-export of docs/governance/RULES-SNAPSHOT.md, so the byte-for-byte registry↔doc equality tests/regression/ses-280-m5-governance-rules.test.mjs pins is unaffected. What the rule lacked was an executor for “closes on verifier pass once its reversal window elapses”: sweep_decision_windows finalised the decision and never touched backlog_items, so from SES-285 (which retired the Accept tap) to this ship a `delivered` ticket had NO exit and sixteen rows sat there. Migration ses320_delivered_exit makes the sweep write `done` on a still-`delivered` ticket whose kind=ship decision it has just finalised — any class, any epic — returning the count as a third OUT column `closed`. The timing distinction M5-14 draws is preserved exactly (original / gate-review may still auto-done at ship through 7a’s rung; discovered / john-named reach done only on verdict PLUS window), and a block finalises nothing because record_ship_decision refuses a non-approve verdict. THE SES-154 RETIREMENT LIVES HERE RATHER THAN IN docs/SELFBUILD-RETIREMENT-LEDGER.md, deliberately and on the kickoff’s own §7 instruction — the ledger entry would have been this session’s fifth repo file, so it folds into the same note; it names what SURVIVES (the `delivered` status, its pick-predicate exclusion, its silent step-past, its kept queue slot) and a restore path that must remove the sweep’s ship branch in the same change, because leaving both would close one delivery twice. -->
<!-- DeepBench v7.0.390 | docs/RUNNER-GOV-M5-REQUIREMENTS.md | close-out of session design-m5-fixes-0902 (attended, Fable 5.1 design, Opus 5 coding agents) — the SES-184 gate record gains its completion amendment: SES-308 (v7.0.389) and SES-309 (v7.0.390) are done with live QA, so M5 is complete against the 9-ticket required set. Doc-only plus the backlog snapshot re-export; the status writes, before-images and scoreboard stamps are in Supabase. No rule STATEMENT changed. -->
<!-- DeepBench v7.0.388 | docs/RUNNER-GOV-M5-REQUIREMENTS.md | M5 gate review (session design-m5-gate-review-0902, attended, Fable 5.1) — the SES-184 gate record gains one amendment: John's "yes, file the two tickets" adds SES-308 and SES-309 to the M5 required set (9 tickets, 16 cycles) and supersedes the "M5 COMPLETE" paragraph. Doc-only plus the backlog snapshot re-export; the rows, drain-scope entries and before-images are in Supabase. No rule STATEMENT changed, so the ses-280 registry↔doc equality guard is untouched. -->
<!-- DeepBench v7.0.358 | docs/RUNNER-GOV-M5-REQUIREMENTS.md | SES-280 — the M5 prioritization and auto-close rule set (M5-01..M5-15) gets its canonical home. FEATURE: SES-280 — Phase 1 (encode) of the two-phase split: this file and the fifteen public.governance_rules rows it renders land together, and B3 is superseded by M5-02 in the same commit per the SELFBUILD-CHARTER transition rule ("leaves no commit where neither is in force"). Phase 2 — script enforcement in drain_epic_next() / recompute_backlog_queue() — is a follow-up ticket; every rule below records the enforcement it is INTENDED to have, and the `script` ones are not executable yet. -->
# Selfbuild M5 — Prioritization and Auto-Close Requirements Register

> **The registry is authoritative.** Each rule below is one row in `public.governance_rules`
> (`source_group = 'selfbuild-m5-register'`, `status = 'live'`). **This file is that row's canonical
> home, and each statement here is byte-for-byte the row's `statement` column** — never a paraphrase
> and never a second wording. `docs/governance/RULES-SNAPSHOT.md` is the third, *generated* copy;
> it is written only by `node scripts/export-governance-snapshot.js` and never by hand. When a rule
> changes: **edit the row, re-export the snapshot, then reconcile this file** — in that order, in one
> commit.
>
> **Provenance.** John approved this rule set conversationally on 2026-09-01 after an extended
> accounting review of the drain, in his words: *"Lets use my rules and put them in place along with
> the rules you have written up. These are the rules that protect the original scope of project self
> build."* and *"Let's get the rules executing in the system first, then let's review what is/is not
> working after rules are encoded."* Encoded by `SES-280` (`v7.0.358`), kickoff
> `docs/kickoffs/v7.0.358-SES-280-m5-governance-rules.md`.

## What the numbers were when these rules were written

Every rule below answers a measured defect, not a hypothetical. The measurements are from the
2026-09-01 accounting review, over the week beginning at the 2026-08-28 07:00Z weekly reset:

- **191,703,000 tokens across 140 cycles.** 138,703,000 (72.4%) shipped 55 tickets;
  **53,000,000 (27.6%) shipped nothing.**
- The **69 non-shipping cycles touched only 12 distinct tickets** — about **5.75 cycles per stuck
  ticket**. Cost is concentrated in re-picking the same small set, not spread thinly.
- An average completed Selfbuild ticket costs **1,663,212 tokens**, across 80 `done`/`delivered` rows.
- **4 of 71 shipped cycles this week carry no `item_id`**, and 6 more carry an `item_id` matching no
  `backlog_items` row — so per-ticket cost queries silently drop them. Separately, **23 `done`
  Selfbuild tickets carry a null `session_ref`.**
- `Selfbuild M5`'s own design gate `SES-184` sat at `design_status = 'needs-john'` while M5 already
  held **10 open member tickets**, two of them (`SES-276`, `SES-277`) filed the same day by a runner
  cycle — against a charter that says members are filed at the gate, "never speculatively".

Three structural defects sit behind those numbers, and the fifteen rules are grouped against them:
**no scope fence** (M5-01), **a rolling-wave rule that is prose only** (M5-02, M5-09), and
**ticket↔cycle attribution that leaks** (M5-11, M5-13).

## Phase split — what is and is not executable today

This register is **Phase 1: encode**. The rows exist, this file is their home, and B3 is retired in
the same commit. **Phase 2 wires the `script` rules into the pick path** (`drain_epic_next()`,
`recompute_backlog_queue()`) and is a separate ticket. Said plainly so no reader mistakes a recorded
intent for a live gate: **a rule marked `script` below is not yet enforced by any script.** The
`prose` and `reviewer` rules bind a reader from the moment they are live.

**Deliberately not in this register:** the enhancement-lane rules (admission test, weekly enhancement
cap, promotion path). They wait on John's decision about the cap percentage, raised 2026-09-01 and
unanswered; filing them half-decided would cost a second amendment cycle under the charter's
transition rule. **Resolved 2026-09-02 (`SES-283`, v7.0.379):** John set the cap — verbatim *"20% is
fine"* — and the three rules now live in their own register, `docs/RUNNER-GOV-ENHANCEMENT-LANE.md`
(`EL-01`..`EL-03`, `source_group = 'enhancement-lane-register'`), enforced in the same two pick homes
as `M5-01`/`M5-02`/`M5-09`.

---

## The rules

### <a id="M5-01"></a>M5-01 — the scope fence (`script`)

> A ticket is eligible for unattended development only if its `epic_id` resolves to a `Selfbuild M0`–`M7` epic, or an enhancement admitted under EL-01; unlinked or non-Selfbuild tickets are never picked by a cycle unless admitted as such.

Drain eligibility is currently a directive-named list (`runner_drain_scope`) — a name, not a
structural property, so nothing prevents non-Selfbuild work entering the unattended lane. This makes
eligibility a property of the ticket's own `epic_id`, which cannot be widened by naming.

**Amended `SES-321`, 2026-09-03 (`v7.0.416`), decision `182655e3-f559-4b46-9457-7d3df8bbf998`.**
Measured while filing `LOG-143`: `prime_directive_queue()`'s `buildable` CTE INNER JOINed `epics` on
`name ILIKE 'Selfbuild%'` before the `EL-01` admission clause was ever evaluated, so an unlinked
ticket admitted under `EL-01` — claim, rationale and cycles present, under the weekly cap — could
never reach the pick path, reproduced live on a rolled-back fixture (served after the fix, not
served once its claim was blanked). Admission is the scope argument for an enhancement, exactly as
`docs/RUNNER-GOV-ENHANCEMENT-LANE.md`'s `EL-01` already said, so this rule's fence now reads it: the
epic link and `EL-01` admission are two ways to clear the same gate, never two separate ones.
Migration `ses321_enhancement_passes_fence` makes `prime_directive_queue()`'s `buildable` CTE a
`LEFT JOIN` on `epics` with the fence evaluated as `(Selfbuild epic OR admitted enhancement)` in one
condition, so the enhancement half is never discarded before it is read. `drain_chain_gate()` and
`runner_should_boot()` were read and left untouched: both inherit the fence through
`prime_directive_queue()`/`drain_epic_next()` rather than restating it. `drain_epic_next()`'s own
named-drain-scope fence is a separate predicate on a different concept (a directive's fixed named
member list) and is out of this migration's scope.

### <a id="M5-02"></a>M5-02 — the filing lane, and B3's retirement (`script`)

> Order the pickable board by filing lane first: tickets with `filed_at` before 2026-08-21 take the priority lane, tickets filed on or after it enter a review bucket that requires explicit promotion before pick; within a lane, order by tier then priority class P1→P10. Supersedes B3.

**This is the rule that retires B3**, whose live ordering ended *"then newest-to-oldest within
class"* — the exact inverse of the priority lane John set. Both could not be live, so B3's
supersession ships in this same commit (charter transition rule: a rule changes only via a shipped
ticket whose own commit lands the replacement and retires the old rule, leaving no commit where
neither is in force). Retirement entry: `docs/SELFBUILD-RETIREMENT-LEDGER.md`.

### <a id="M5-03"></a>M5-03 — the matrix carries what the picker selects on (`prose`)

> The per-ticket governance matrix mandated by FILE-MATRIX additionally carries `epic_id`, `filed_at` and `scope_rationale`: M5-01 and M5-02 select on the first two, and `scope_rationale` (why the ticket belongs in its epic's chartered scope, naming the charter goal it advances) is the review bucket's promotion criterion — a ticket filed on or after 2026-08-21 with no scope rationale is not promoted out of the bucket and is never picked. FILE-MATRIX's fail-LOUD tripwire covers the added fields.

A selector the picker reads but the matrix does not carry is a field nobody can audit after the fact.
The two new columns are exactly the two M5-01 and M5-02 select on, and they inherit FILE-MATRIX's
existing fail-LOUD behaviour rather than getting a second, quieter one.

**Extended 2026-09-02 (`SES-295`, v7.0.377), John 2026-09-01 verbatim: _"on tickets created after 8/21, are you stating why they have been added to original scope?"_** Measured answer then: no — 11 of the 13 open post-cut M5 tickets carried provenance ("named by the M4 gate review", "found live by cycle X") but no *justification*. `scope_rationale` joined the matrix in `SES-295`'s first half (`v7.0.361`); this half makes it bite. **Three things shipped together:** (1) every open Selfbuild ticket filed on or after 2026-08-21 — 24 rows — now carries a rationale naming the charter goal it advances (before-images `session_name = 'design-ses-295-0902'`), so nothing is stranded by (2); (2) the rationale is **the promotion criterion `M5-02` always said the review bucket needed and never had**: `drain_epic_next()` and `prime_directive_queue()` exclude a post-cut Selfbuild ticket with no rationale (migration `ses295_scope_rationale_promotion`, the same anchored-replace pattern as `SES-305`), and the drain census reports "N awaiting scope rationale (…)" so the rejection is never a silent empty; (3) `FILE-MATRIX`'s statement names the field, and the canonical filing `INSERT` in `docs/runbooks/session-setup.md` carries it. **Deliberately not fail-closed at the database:** FILE-MATRIX chose fail-LOUD so the runner's own filing path can never park mid-drain on a NOT NULL; the pick-time exclusion is the enforcement, and `SES-279`'s tripwire is the alarm. Pre-cut tickets (filed before 2026-08-21) are untouched — the priority lane never needed a promotion.

### <a id="M5-04"></a>M5-04 — answer from the matrix, never by re-deriving (`prose`)

> Answer every question about incomplete tickets from `public.ticket_matrix` in its stored columns, never by re-deriving the figures per question. Every such answer shows, at minimum: priority order (`queue`), `backlog_id`, title, `epic`, `milestone`, `milestone_required`, `priority_class`, `filed_at` as the created date, `status`, `scope_rationale`, `predicted_cycles`, `predicted_tokens`, `predicted_pct_of_week`, and the blocked/defer flags. A milestone's required set is the stored `milestone_required` flag, set at its gate decision and never re-judged per question.

Re-deriving per question is how two answers to the same question disagree. It is also what the
accounting review had to do — and the re-derivation is where the missing `item_id` rows silently
dropped out of the totals.

**Amended 2026-09-01 (`SES-294`, v7.0.360), John verbatim: _"Include in the matrix, and make this
permanent - epic, date created, priority order."_** The column list above is now part of the rule
rather than a convention each answer re-chooses, which is what let `epic` and the filing date drop
out of earlier answers. **`filed_at` is the created date, never `created_at`** — `created_at` records
when a row was bulk-loaded into Supabase during the board migration, so ordering or reporting by it
misdates most of the board; `filed_at` is mined from git history (`B10`) and is also what `M5-02`'s
priority lane selects on.

**Extended 2026-09-01 (`SES-295`, v7.0.361), John verbatim: _"add that column from here on out to the matrix as well"_** — `scope_rationale` joins the mandated list. It records *why* a ticket belongs in its epic's chartered scope (which charter goal it advances), as distinct from `scope_origin`, which records only *where the ticket came from*. Measured when the column was added: 11 of the 13 open post-2026-08-21 `Selfbuild M5` tickets carried no scope reasoning at all, so `M5-02`'s review bucket had no criterion to review against.

**Bug found and fixed in the same change — `ticket_matrix` was serving the wrong date.** The view read `b.created_at AS filed_at`, so every answer that sourced the filing date from the matrix was actually reporting the board-migration bulk-load timestamp under the name `filed_at`. Worst live case: `AA-01` reported 2026-08-20 for a ticket genuinely filed 2026-06-13, a 68-day error. Impact was contained — across the 32 open Selfbuild tickets 5 dates differed and **zero** changed lane under `M5-02` — but `SES-281` was about to wire the pick path to that column, which would have made the mislabel decision-bearing. The view now selects `b.filed_at`.

**Extended 2026-09-02 (`SES-304`, v7.0.374), John verbatim: _"create a new Milestone field, and appropriately label each ticket to their correct milestone"_ and _"add to the list of columns in the matrix … the new milestone field"_** — `milestone` and `milestone_required` join the mandated list, and the last sentence of the rule is new. The defect it answers is in `docs/M5-HANDOFF-2026-09-02.md` goal 2: *"what is needed for M5"* was asked six times on 2026-09-01/02 and answered six ways, because the required set was never stored and so was re-judged on every asking — this rule's own prohibition, violated for an evening. Two columns on `backlog_items` now hold what was being re-derived: **`milestone`** (`M0`…`M7`) is the milestone a ticket *serves*, and **`milestone_required`** is whether the ticket is in that milestone's required set as ruled at its gate. **`epic_id` keeps its job as the pick lane** (`M5-01`, `M5-02`, `M5-09` all select on it) and is deliberately *not* what `milestone` reports on: the seven M5-epic tickets the `SES-184` gate record names as serving other milestones carry `milestone` = `M2`/`M4`/`M6`/`M7` while their epic stays M5, so nothing reopens the accepted M4 and nothing loses pickability — moving their epics is John's call and is one `UPDATE` if he makes it. Backfilled for every Selfbuild ticket from its epic; the M5 required set is exactly the eight tickets the gate record names. Five tickets that carried **no epic at all** (`SES-290`, `SES-291`, `SES-292`, `SES-293`, `SES-279` — three of them John's own instructions) were invisible in every milestone view and unpickable under `M5-01`; they now sit in M2 (`SES-292` in M5, `milestone_required = false`). Every changed row has a before-image (`session_name = 'design-m5-milestone-0902'`).

**Bug found and fixed in the same change — the matrix never carried `priority_class`.** This rule has mandated `priority_class` in every answer since `SES-280` (v7.0.358), and `public.ticket_matrix` had no such column, so no answer that obeyed *"from the matrix"* could also obey the column list. The view now carries it, appended with the two new columns so every existing positional reader is unaffected.

### <a id="M5-05"></a>M5-05 — a new rule declares its own metadata (`reviewer`)

> Every new governance rule declares `canonical_doc`, `enforcement` and `status`, sets `superseded_by` on any rule it replaces, and is checked against the live rule set for duplication before it ships.

The registry's value is that no rule is homeless, no rule is silently duplicated, and no replacement
leaves its predecessor live. **This rule applies to its own filing**: all fifteen rows below were
checked against the live rule set for a duplicate `statement` before insert, and that check is pinned
by assertion 4 of `tests/regression/ses-280-m5-governance-rules.test.mjs`.

### <a id="M5-06"></a>M5-06 — the weekly wall, not just the daily ceiling (`script`)

> Never start a ticket whose predicted cost exceeds the remaining weekly usage headroom; B32's daily ceiling does not bound the weekly wall.

B32 bounds a **day**. Nothing bounded the **week**, which is the wall that actually stops work — and
at 1,663,212 tokens for an average completed ticket, a single start can consume the remaining weekly
headroom and strand itself mid-build.

### <a id="M5-07"></a>M5-07 — cheapest-first within a lane (`script`)

> Within the same lane and priority class, break queue ties by lowest `predicted_cycles` first.

With 27.6% of the week's tokens producing nothing, tie-breaking toward the cheapest remaining ticket
converts the same headroom into more shipped tickets. It changes only ties — never a lane, never a
class.

### <a id="M5-08"></a>M5-08 — blocked work is not remaining work (`script`)

> A ticket with `blocked_by` set is never picked and never counts toward a drain's remaining-work total.

Two failures, one clause: a blocked ticket must not be picked, and it must not inflate the
remaining-work number a drain reports — an inflated remainder makes a finished drain look unfinished
and keeps it running.

### <a id="M5-09"></a>M5-09 — the rolling wave, enforced (`script`)

> No milestone member ticket is pickable while that milestone's design-gate ticket is unresolved (`status <> 'done'`).

The charter already says members are filed at the gate and never speculatively — as prose, with
nothing enforcing it. Measured: M5's own gate `SES-184` sat unresolved while M5 held 10 open
members, two of them filed that same day by a cycle.

**Amended by `SES-285` (`v7.0.359`) — see the amendment note at the foot of this file.** The
original wording made the gate unresolved when its ticket carried `design_status = 'needs-john'`
*or* was not `done`. `M6-01` retires `needs-john` as a blocking state outright, so that half of the
clause now names a state no ticket can be in. **What the rule tests is unchanged in substance:** a
milestone gate blocks its members while the gate ticket is not `done`, which is the condition that
was always doing the work.

### <a id="M5-10"></a>M5-10 — three cycles, then it stops (`script`)

> A ticket that has consumed three cycles without shipping is auto-deferred with `defer_status = 'stuck'`, recorded with its defer reason and surfaced in the standing brief, never silently re-picked.

This is the single largest measured leak: 69 non-shipping cycles across **12** tickets, ~5.75 cycles
each. Three is the point past which the evidence says another attempt is not the answer, and the
record is what makes the stall visible instead of silently expensive.

**Amended by `SES-285` (`v7.0.359`).** The original wording deferred the ticket *"and carded for
John"*. The card surface is retired (`M6-01`, `M6-06`), and a card was in any case the wrong
instrument here: the stall needs to be **visible**, not **decided**, and 42 of the 45 stalled cards
prove a card is not a visibility mechanism. The defer reason plus the standing brief
(`docs/runbooks/standing-brief.md`, regenerated at every ship) is the surface that is actually read.

**Executing in part since `SES-305` (`v7.0.375`, 2026-09-02) — the half that stops the re-pick.** Measured before the change: no pick or gate function read `defer_status`, and the column's own CHECK admitted only `no` / `maybe` / `yes` — so this rule could be neither *written* (`'stuck'` was rejected) nor *enforced* (a deferred ticket kept its queue number and stayed pickable; `SES-237` sat deferred at queue 280, and `SES-82`, deferred by John the same morning, was still `runner_should_boot()`'s live pick). `SES-305` makes deferral real in the three homes, following the `blocked_by` / `M5-08` pattern: `recompute_backlog_queue()` gives a `yes`/`stuck` ticket no queue number (`B4`: a null queue is unpickable), `drain_epic_next()` excludes it explicitly in the pick predicate and reports it as its own census bucket ("N deferred (…)") so the rejection is never a silent empty, and `prime_directive_queue()` excludes it in the `buildable` CTE so the two homes cannot drift; `drain_chain_gate()` and `runner_should_boot()` read those two and inherit it. The CHECK now admits `'stuck'`, with `defer_reason` mandatory for `yes` and `stuck` alike. **Deferral is a queue-recompute event** (`B4`'s list, extended): whoever writes `defer_status` runs `recompute_backlog_queue()`, exactly as a status write does. `FILE-MATRIX`'s `no / maybe / yes` is unchanged — those are the *filing-time* values; `stuck` is written only by the platform, never at filing. **Still recorded-only: the writer half** — "three cycles without shipping → `stuck`". It cannot execute yet because a `failed` cycle carries no `backlog_item_id` (6 of 6 on 2026-09-02; `SES-282` typed only shipped and gated cycles), so there is nothing to count; the ticket that gives a failed cycle its ticket at *pick* time rather than at ship time is the prerequisite, and `M6-11` already says a rule-filtered skip never counts toward the stuck count.

### <a id="M5-11"></a>M5-11 — auto-close needs a complete cost row (`script`)

> Auto-close requires build green, regression green, hygiene no-new-flags, and a complete cost row: every cycle that worked the ticket carries its `item_id`, and `ticket_cost` resolves for it.

`runner_cycles.item_id` is free text with no FK. This week 4 of 71 shipped cycles carry none and 6
more carry an id matching no ticket, so their cost is invisible to every per-ticket query. A ticket
that cannot be costed has not finished being accounted for, whatever its build says.

### <a id="M5-12"></a>M5-12 — a healing ticket proves the failure stopped (`reviewer`)

> A Selfbuild M5 healing ticket holds at `partial` until the failure it claims to fix is observed non-recurring for 72 hours; only then may it write `done`.

M5 is the closed-loop *healing* epic: its tickets claim a recurring failure has stopped. That claim is
an observation over time, not a green build, and 72 hours is the window that spans a full scheduler
cadence rather than a single quiet afternoon.

**Instrumented 2026-09-02 (`SES-303`, v7.0.382).** "Observed non-recurring for 72 hours" was a
judgment with no instrument. It now has one: every ship stamps `public.platform_scoreboard` (five
standing numbers — no-ship cycles and their tokens this weekly window, shipped cycles, tokens per
shipped cycle, cycles per shipped ticket, worst silence between fires; migration
`ses303_platform_scoreboard`), and `public.ticket_outcome` reads, for each shipped ticket, the row
stamped at its ship as *before* and the newest row at least 72 hours later as *after* — exactly this
rule's window — grading the ticket's claim (`enhancement_claim`, "metric: down|up") as `held`,
`did_not_hold`, `unmeasurable` or `pending`, with all five deltas beside it so a regression nobody
claimed still shows. John chose this shape (verbatim *"b"*) over per-ticket claims: one stored
series, zero ceremony per ticket, the same answer on every asking. **Stated so it is not assumed:**
attended ships write no `runner_cycles` row (`M5-11`/`M5-13`'s gap), so the cycle-derived numbers
move only with unattended fires; an attended ship still stamps the row (session-setup step 4) so its
before/after distance is real. The series starts 2026-09-02; nothing before it is measurable and no
row is backdated.

### <a id="M5-13"></a>M5-13 — attribution is written, not warned about (`script`)

> A ship writes `session_ref` and `item_id` in the same transaction as the status change; a ship with either field null is rejected, not warned.

23 `done` Selfbuild tickets carry a null `session_ref` today, which is what a warning produces. Writing
both fields in the same transaction as the status change is the only form that cannot drift, because
there is no window in which the status is set and the attribution is not.

### <a id="M5-14"></a>M5-14 — auto-close does not reach John's own work (`reviewer`)

> Auto-close never applies to a ticket whose `scope_origin` is not `original` or `gate-review`; `discovered` and `john-named` work closes on verifier pass once its reversal window elapses.

Auto-close is a delegation of *John's* judgment, and he delegated it for the work the platform scoped
itself. Work he named, or that a cycle discovered mid-build, does not take the same fast path.

**Amended by `SES-285` (`v7.0.359`).** The original wording ended *"closes only on John's Accept"*,
which is the tap this project retired. **The distinction the rule draws survives intact, and it is a
distinction in timing, not in whether the rule still bites:** `original` and `gate-review` work
auto-closes at ship, while `discovered` and `john-named` work closes only after its verifier verdict
*and* the elapse of its 72-hour reversal window (`M6-02`). So John's own work still cannot be closed
by the mechanism that scoped it, and it still cannot be closed on the day it ships — it is closed by
a verdict plus his opportunity to reverse, rather than by his tap.

<!-- FEATURE: SES-320 — the register names the mechanism that performs this rule; the rule statement is unchanged. -->
**Mechanism named 2026-09-02 (`SES-320`, `v7.0.412`, migration `ses320_delivered_exit`). THE RULE
STATEMENT ABOVE IS UNCHANGED — no registry row edit, and no re-export of
`docs/governance/RULES-SNAPSHOT.md`.** What this rule lacked was the thing that performs *"closes on
verifier pass once its reversal window elapses"*: `public.sweep_decision_windows()` finalised the
decision and never touched `backlog_items`, so between `SES-285` (which retired the Accept tap) and
this ship a `delivered` ticket had **no exit at all** and sixteen rows sat there. The sweep now
writes `done` on a ticket still `delivered` whose `kind='ship'` decision it has just finalised — any
class, any epic — and returns the count as a third column, `closed`. **The timing distinction this
rule draws is preserved exactly:** `original` / `gate-review` work may still auto-`done` at ship
through step 7a's rung, while `discovered` / `john-named` work reaches `done` only through its
verdict *plus* the elapse of the window. A block never finalises, because `record_ship_decision()`
refuses a non-`approve` verdict and so records nothing for the sweep to close.

**And the `SES-154` clause *"only John's Accept writes `done`"* is RETIRED here rather than in
`docs/SELFBUILD-RETIREMENT-LEDGER.md`** — deliberately, on the `SES-320` kickoff's own instruction
(§7: the ledger entry folds into this note if it would be this session's fifth repo file, and it
would have been). **Retired by:** `SES-320`, 2026-09-02, `v7.0.412`. **Superseded by:** a verifier
verdict plus a reversal window — the sweep's finalisation, which is the mechanism this same note
names above. **Why, and it is not merely that the tap went away:** `SES-285` retired the surface the
clause depended on, so for eleven days the clause named a mechanism that could not fire and the only
consequence was tickets accumulating in a state with no exit — a rule nobody can satisfy is not a
gate, it is a leak. **What SURVIVES the retirement, and a later editor must not read this as
permission to remove it:** the `delivered` status itself, its exclusion from every pick predicate
(migration `ses154_delivered_status`), its silent step-past at step 5, and its **keeping its queue
slot** while it waits — all four are `SES-154`'s and all four are untouched. **Restore path:**
re-adding an Accept-driven `done` write to the step-9 harvest is not sufficient and not safe on its
own — the `kind = 'ship'` branch must come out of `sweep_decision_windows()` in the same change,
because leaving both would close one delivery twice.

### <a id="M5-15"></a>M5-15 — staleness lowers the ceiling, and one place applies it (`script`)

> Staleness of the freshest `runner_usage_readings` row never refuses a run — it lowers the ceiling, and `public.resolve_day_token_cap()` RUNG 2 is the single authority that applies it (48h, `stale-floor`, which a standing daily max may not override). No other gate carries its own staleness threshold or its own cap.

**Rewritten twice on 2026-09-01/02, and the second rewrite is the instructive one.** `SES-280`
shipped this as a *refusal* at 24h; within the hour it live-blocked the drain, because the only way
to refresh that reading is John typing it (`SES-82` is unbuilt) — a number only he can produce
turned into a precondition for autonomy, which `M6-01` forbids. `SES-298` changed the consequence
from refusal to degradation. **`SES-302` found that even that was still wrong**: the platform had
owned this mechanism the whole time in `resolve_day_token_cap()` RUNG 2 — same fallback value, but
at **48h**, with the spec-verbatim comment *"The box does NOT defeat it"*. So the rule had become a
second home at a different threshold, and with the reading at 35.4h the two returned **opposite
answers on the same fact** (resolver 196M via the standing box; the gate 3M). The rule now
*describes* RUNG 2 rather than competing with it, and `runner_should_boot()` carries neither a cap
nor a staleness verdict. **The lesson worth more than the rule: a rule about a mechanism was written
twice without reading the function that implements it.**

M5-06 bounds a start against remaining weekly headroom, and that bound is only as good as the reading
it is computed from. A stale reading makes the headroom check pass on numbers that no longer describe
the week — so the *consequence* belongs on the reading's age, not on the arithmetic.

**Amended 2026-09-01 (`SES-298`, `v7.0.365`), and the amendment is the whole point of the rule.**
This shipped worded as a refusal, and within the hour it was live-blocking the drain on a 32.66h-old
reading. The only way to refresh that reading is John typing it — `SES-82`, the programmatic read,
is unbuilt — so the refusal made **a number only John can produce into a precondition for autonomous
work**, which is exactly what `M6-01` forbids, written by the same session that retired the card
surface. It also ignored a mechanism the platform already had: `runner_budget.stale_fallback_tokens`
(3,000,000) exists so a cycle can run under a smaller ceiling when the meter is old. Staleness is
still graded and still reported (`detail.reading_stale`, `detail.reading_age_hours`) — only the
consequence changed, from `should_boot = false` to `reason = 'pickable_degraded'` with
`detail.token_cap` carrying the fallback.

---

## Amendment note — `SES-285`, 2026-09-01 (`v7.0.359`)

<!-- FEATURE: SES-285 — this note exists because the registry row is authoritative and this file is
     its byte-for-byte home. Three statements moved in the row; they move here in the same commit,
     or the truth tripwire (check 9 / check 12) reads a live rule against stale doc text. -->

Three rules in this register — `M5-09`, `M5-10`, `M5-14` — were written hours before `SES-285` and
encoded the very dependency it removed: they named `design_status = 'needs-john'`, *"carded for
John"*, and *"John's Accept"* as live mechanisms. `SES-285` retired that surface, so those clauses
named things that no longer exist.

**They are amended, not retired.** Each keeps its id, its `status = 'live'`, and its place in this
register; only the clause naming the withdrawn surface was rewritten, and each section above carries
its own amendment paragraph saying exactly what changed and what did not. Registry rows and the
statements above were rewritten in the same commit, and `docs/governance/RULES-SNAPSHOT.md` was
re-exported from the rows — never hand-edited.

Because the amendment changed no rule's *effect*, there is **no retirement-ledger entry** for these
three; the ledger's contract covers removals and rewrites of withdrawn content, and entries 21–33
there cover the thirteen rules `SES-285` actually withdrew. `M5-12`'s 72-hour observation window and
`M6-02`'s 72-hour reversal window are deliberately the same span, for the same reason: it covers a
full scheduler cadence rather than one quiet afternoon.

---

## Amendment note — `SES-281`, 2026-09-01 (`v7.0.363`)

<!-- FEATURE: SES-281 — Phase 2. The `script` rules stop being recorded and start executing. No
     rule STATEMENT changes here, so the byte-for-byte registry↔doc equality that
     tests/regression/ses-280-m5-governance-rules.test.mjs pins is untouched; only this note is
     added. -->

**Four rules moved from recorded to executing.** The Phase-split section above says plainly that *"a
rule marked `script` below is not yet enforced by any script."* For `M5-01`, `M5-02`, `M5-07` and
`M5-09` that sentence is now **out of date**: migration `ses281_m5_pick_enforcement` wired all four
into `public.drain_epic_next(uuid)` **and** `public.prime_directive_queue()`, which are the two
functions the chain gate and the briefing page read. `M5-06` and `M5-15` remain recorded-only; they
answer *should a session run at all*, which is a pre-boot question and belongs to `SES-297`.

What each one is, in the pick path:

- **`M5-01` — the scope fence is structural.** The pick joins `public.epics` and requires
  `name ILIKE 'Selfbuild%'`. Before this, drain eligibility was a name in `runner_drain_scope`, and
  a mis-scoped directive could hand non-Selfbuild work to an unattended cycle. Eligibility is now a
  property of the ticket's own `epic_id`, which naming cannot widen.
- **`M5-02` — the filing lane replaces bare queue order.** `drain_epic_next` ordered by
  `b.queue` and nothing else. It now orders by **filing lane first** (`filed_at < 2026-08-21` is the
  priority lane; on or after it is the review bucket), then `queue`, then `M5-07`. **`filed_at`,
  never `created_at`** — `created_at` is the board-migration bulk-load stamp and misdates most of the
  board by up to 68 days (`SES-295`). A NULL `filed_at` falls to the review bucket; zero rows carry
  one today. This is the clause that retires **B3**, whose ordering ended *"newest-to-oldest within
  class"* — the exact inverse of the lane John set.
- **`M5-07` — cheapest-first tiebreak.** `predicted_cycles` ascending, **nulls last**, as the last
  ordering term. It changes only ties: never a lane, never a class.
- **`M5-09` — the rolling wave, enforced.** A member is unpickable while its milestone's own design
  gate is unresolved (`status <> 'done'`). **A gate ticket never blocks itself** (`g.id <> b.id`) —
  without that exclusion the milestone deadlocks permanently behind the one ticket that could open
  it.

**Named deviation from the `SES-281` kickoff doc, measured rather than assumed.** The kickoff
identified a gate as the epic member with `scope_origin = 'original'` **and** a title matching
`'M% design gate%'`. Live, only `SES-183` (M4) and `SES-184` (M5) carry `scope_origin = 'original'`;
`SES-185` (M6) and `SES-186` (M7) carry `'pre-existing'`. Requiring `'original'` would have silently
disabled `M5-09` for M6 and M7 — every milestone that has not started, which is the only place the
rolling wave still has work to do. The shipped predicate is the **title pattern alone**, written
`'M_ design gate%'` (`_` is LIKE's single-character wildcard), which matches exactly the four real
gates and no ordinary member.

**What `c_flagged` now holds: `ARRAY['needs-desktop']`, and nothing else.** It is declared identically
in `drain_epic_next` and `drain_chain_gate`, and spelled inline in `prime_directive_queue`'s
`buildable` CTE. Two entries left:

- `'needs-john'` was retired outright by `M6-01` (`SES-285`, `v7.0.359`); no ticket can be in it.
- `'john-paced'` was **the human gate that migration missed** — it matched on the string
  `'needs-john'` rather than on the concept. Seven open tickets still carried it, four of them in
  Selfbuild epics. "Paced by John" is exactly the blocking-on-a-human-decision `M6-01` forbids, so
  this migration recorded a `runner_before_images` row per ticket
  (`session_name = 'design-drain-enforcement-0901'`) and converted all seven to `'needs-decision'`.

`'needs-desktop'` **stays blocking, and that is deliberate**: it records a physical constraint (work
needing a machine John has), never a judgment call. Three open tickets carry it and were not touched.

**Measured on the live board immediately after the migration** — the evidence, not the intent:
`drain_epic_next` returns `SES-184`, M5's own gate, and `prime_directive_queue`'s drain lane returns
the same ticket, so the two agree. Every other M5 member, and every M6 and M7 member, is now held
behind its unresolved gate; `M1`/`M2`/`M3` have no gate ticket and are unaffected. In the selfbuild
lane, `SES-43` (queue 251, filed pre-cut) now sorts **ahead of** `SES-288` (queue 4, filed post-cut)
— a live lane inversion that bare queue order could not produce, and the one
`tests/regression/ses-281-m5-pick-enforcement.test.mjs` grades over PostgREST.

---

## Related registers and files

| Where | What it holds |
|---|---|
| `public.governance_rules` | **Authoritative.** The fifteen rows this file renders, plus every other live rule. |
| `docs/governance/RULES-SNAPSHOT.md` | Generated repo-side copy of the whole registry. Never hand-edited. |
| `docs/RUNNER-GOV-0820-REQUIREMENTS.md` | The 2026-08-20 governance register (A1–A6, B1–B42). B3 lives there, superseded. |
| `docs/RUNNER-GOV-M6-REQUIREMENTS.md` | The M6 autonomy register (`M6-01`–`M6-08`), which withdrew thirteen 0820 rules and amended the three rules noted above. |
| `docs/SELFBUILD-RETIREMENT-LEDGER.md` | B3's retirement entry, with the reason and the restore path. |
| `docs/SELFBUILD-CHARTER.md` | The rolling-wave rule, the transition rule and the storage rule these fifteen answer to. |

---

## The M5 gate decision — `SES-184`, decided 2026-09-02 (`v7.0.370`)

<!-- FEATURE: SES-184 — the M5 design gate, decided rather than asked. M6-01: no cycle blocks on a
     human decision; it decides with recorded reasoning. This section IS that record. Reversible
     under M6-02's 72h window. -->

**Decided by attended session `design-m5-gate-0902`, not by a card.** The card surface was retired
by `SES-285`; `M6-01` requires the decision be made and its reasoning recorded, which is this
section. It is reversible for 72 hours under `M6-02`.

### What M5 promises, and which ticket carries each promise

`SES-184`'s own scope names three pillars. Measured against the board, one had no member at all:

| Pillar | Carried by | State at the gate |
|---|---|---|
| **1. Outcome telemetry** — did shipped work change the metric it claimed? | `SES-303` | **Had no ticket until 2026-09-02.** A board-wide search found nothing covering it, so M5 could not have completed as chartered no matter how the existing list was worked. Filed at this gate, `scope_origin = original`. **Shipped 2026-09-02 (v7.0.382), Shape B by John's call** — the platform scoreboard and `public.ticket_outcome`; see the note under `M5-12`. |
| **2. Heal-engine v2** — fix-confirmation and recurrence re-filing | `SES-276`, proven by `SES-277` | Both filed at the M4 gate review, both blocked on this gate. **Proven 2026-09-02 (`SES-277`, v7.0.384):** the seeded-failure drill walked detect → file → dedup → confirm → recur on live Supabase, **and it failed once** — v2 printed `confirmed_fixed` and never wrote it, because its nothing-new-to-file exit skipped the verdict write; fixed in the same commit. Record: `docs/harvests/SES-277-drill-2026-09-02.md`. |
| **3. Usage/budget instrumentation** | `SES-82`, `SES-161` (`SES-104` done) | Named in `SES-184`'s own text as absorbed |

**Plus one enabler, ruled into the required set:** `SES-282` — `runner_cycles.item_id` has no
foreign key, so a shipped change cannot be attributed to the ticket that claimed it. Pillar 1 cannot
measure what it cannot attribute, so `SES-282` is required *for* M5 rather than merely adjacent.

**And one detection member, ruled in:** `SES-269` (silent cron days). The charter's goal 4 is that
"production failures are **detected**, ticketed, fixed, and confirmed-fixed by the loop itself" —
runner silence is such a failure. Ruled in on evidence, not theory: on 2026-09-01 the cron went
silent for **13.4 hours** and nothing noticed, the second such hole after 2026-08-27, which is the
incident `SES-269` was filed from.

### M5's required set — 8 tickets, 16 cycles

`SES-184` (this gate) · `SES-82` · `SES-161` · `SES-282` · `SES-303` · `SES-276` · `SES-277` · `SES-269`

**M5 is complete when those close.** Completion is a property of that set, not of the epic label.

**Superseded 2026-09-02 12:35 CST by the gate-review amendment below (v7.0.388): two required members were added, so M5 is complete when `SES-308` and `SES-309` also close.** ~~M5 COMPLETE~~ — 2026-09-02, v7.0.385. All 7 then-required tickets are `done`: `SES-184` (gate, v7.0.370)
· `SES-161` (v7.0.376, the runner cycle John fired by hand) · `SES-282` (v7.0.371) · `SES-303`
(v7.0.382, Shape B) · `SES-276` (v7.0.372) · `SES-277` (v7.0.384, the drill — which caught and fixed
v2's unpersisted verdicts) · `SES-269` (ruled done by John, verbatim *"yes"*, session
`design-m5-close-0902`). **The `SES-269` ruling, recorded here rather than carded:** the number the
ticket exists for — hours of runner silence — is stamped at every ship
(`platform_scoreboard.cron_silence_hours`) and measured by `scripts/check-cycle-cadence.js`; its
undischarged remainder (a standing alarm routine in John's account, and the briefing line barred for
unattended cycles by `27b5d8cb`) is re-ruled out of M5, because whether an alarm routine runs is the
same question as whether the hourly runner runs — the M6 gate, `SES-185` — and notifications do not
reach John today (`SES-123`). Reversible under `M6-02`. Stored form: the seven rows read
`milestone_required = true` and `status = 'done'`; `select … from public.ticket_matrix where milestone
= 'M5' and milestone_required and status <> 'done'` returns **zero rows**. The M5 drain directive
(`238aa9ca`) keeps its open non-required members (`SES-292`, and the deferred `DAT-25`, `SES-123`,
`SES-82`); completion is a property of the required set, as this record said it would be.

**Stored 2026-09-02 (`SES-304`, v7.0.374).** The set above is no longer only prose: those eight rows carry `backlog_items.milestone_required = true` and `milestone = 'M5'`, so *"what is left for M5"* is `select … from public.ticket_matrix where milestone = 'M5' and milestone_required and status <> 'done'` — the same answer on every asking (`M5-04`). Amending the set means amending the flag, with a before-image, in the same change as the amendment note here.

**Amended 2026-09-02 09:51 CST (John, verbatim _"yes"_, session `design-m5-milestone-0902`, v7.0.375) — `SES-82` leaves the required set. The set is now 7 tickets, 14 cycles:** `SES-184` · `SES-161` · `SES-282` · `SES-303` · `SES-276` · `SES-277` · `SES-269`. `SES-82` "Replace the briefing's manual usage-meter reading with a programmatic read" needs Anthropic to ship a usage API (their open issues #78476, #91279, #33978); nothing on this side can close it, so a required set that carried it could never read complete. It stays on the board, `tier = later`, `defer_status = 'yes'` with that reason, for the day the API exists. Reversible under `M6-02`. **Measured while making the change, and the reason `SES-305` exists:** no pick or gate function reads `defer_status`, and the column's CHECK does not admit `M5-10`'s `'stuck'` — so on 2026-09-02 `SES-82` was still `runner_should_boot()`'s live pick (queue 589, priority lane by `filed_at`) after being deferred. Deferral was decorative; `SES-305` makes it real.

**Amended 2026-09-02 12:35 CST (John, verbatim _"yes, file the two tickets"_, session `design-m5-gate-review-0902`, v7.0.388) — the M5 milestone gate review adds two members to the required set, so the "M5 COMPLETE" paragraph above is superseded. The set is now 9 tickets, 16 cycles:** `SES-184` · `SES-161` · `SES-282` · `SES-303` · `SES-276` · `SES-277` · `SES-269` · `SES-308` · `SES-309`. The review ran per `docs/runbooks/gate-review.md` — PM lens and Chief Architect lens, fresh context, Fable 5 — and both returned **PASS with named gaps**: the seven tickets are `done`, but the charter claim they stood for (goal 4, *"confirmed-fixed by the loop itself"*, and M5 pillar 1, *"did shipped work change the metric it claimed"*) is not yet true in production. Two gaps are M5's own promise and were filed as required members rather than carried into M6: `SES-308` "The runner never records a confirmed fix" (`P9 - Bug Fixes`) — `scripts/heal-engine.js` persists a confirmation only under `--apply` and exits 0 from its nothing-new-to-file branch, while `runner-cycle.md` step 8b re-runs with `--apply` only on exit 1, so every unattended cycle discards the confirmation it computed (every `runner_heal_signatures` write to date is the supervised drill's); and `SES-309` "Outcome telemetry cannot grade chartered work" (`P10 - Tooling`) — `public.ticket_outcome` reads its claim from `enhancement_claim`, which zero Selfbuild tickets carry, so every chartered ship resolves `unmeasurable`. Both rows: `scope_origin = 'gate-review'`, `milestone = 'M5'`, `milestone_required = true`, named into drain `238aa9ca`'s scope, before-images under `session_name = 'design-m5-gate-review-0902'`. The review's other findings (the M6-02 reversal window has no mechanism while `SES-286` is open; the M5 drain cannot retire while its three deferred members count as open in the retirement predicate; CI reds are unclassifiable to the heal engine; four of seven required ships carry no verifier verdict) belong to the M6 gate `SES-185` and were not filed here. Reversible under `M6-02`.

**M5 COMPLETE against the 9-ticket set — 2026-09-02 13:16 CST, session `design-m5-fixes-0902` (attended; John: *"we are not running the drain … can you make those two tickets run?"*).** Both gate-review members shipped through the design→code→verify loop in one session, each with its own kickoff, an Opus 5 coding agent, and the design session's live QA: `SES-308` (`v7.0.389`, push `ee0d9cc4`) — the heal engine's dry run now exits 1 when a fix-confirmation verdict is pending and `--apply` needs no `--backlog-ids` when there is nothing to file (the coding agent found and removed a top-of-`main()` gate that would have made the remedy exit 2); QA seeded a `watching` signature with a 30-day-old sighting and measured dry run **exit 1 → `--apply --cycle-id` (no ids) exit 0 → row `confirmed_fixed` → dry run exit 0**, QA cycle `30800000-…-000000000308`. `SES-309` (`v7.0.390`, push `85431c9f`) — `public.outcome_claim_is_valid()` + `ck_backlog_outcome_claim` give the claim one validated home; `ticket_outcome` reads `unclaimed` for a NULL claim and `unmeasurable` for a declared `none:`; the filing template carries the claim; the four M5 rows with ship stamps carry honest `none:` claims. QA measured held / unclaimed / unmeasurable on a rolled-back fixture and the constraint rejecting `bogus: up`. Stored form: `select … from public.ticket_matrix where milestone = 'M5' and milestone_required and status <> 'done'` returns **zero rows** over the nine. CI green on both pushes. The M5 drain directive (`238aa9ca`) still holds its three deferred non-required members (`SES-82`, `SES-123`, `DAT-25`) and `SES-292`; completion is a property of the required set, as this record said. The charter claim the review measured — a confirmed fix recorded by the loop itself, and a declared outcome per chartered ship — now has its unattended path built; the first unattended cycle to write a `confirmed_fixed` row is the remaining evidence, and it needs a real ticketed failure to go quiet, which the M6 gate's CI-classification question governs.

### Seven tickets carry the M5 epic and do not serve M5

Ruled here so the milestone's definition of done is not silently inflated by 11 cycles of unrelated
work. **They are not cancelled and not deprioritised — they serve a different milestone**, and the
re-homing is deliberately left to John rather than executed here, because moving seven tickets
across four milestones on the same night he asked for caution about ticket churn would be the
churn he objected to.

| Ticket | Serves | Why not M5 |
|---|---|---|
| `SES-295` scope rationale + backfill | M2 — Truth Infrastructure | A field every ticket must carry and that must be auditable. Not outcome telemetry. |
| `SES-284` B30 status ruling | M2 — Truth Infrastructure | Registry hygiene: a rule that may have expired without a ledger entry. |
| `SES-283` the enhancement lane | M7 — The Inventor | Governs how *new* features are admitted; M7 is where the platform originates them. |
| `SES-247` chain gate hands back the partial | M6 — Autonomy Graduation | Drain execution mechanics. |
| `SES-260` `.env.local` privileged keys | M4 — Infrastructure Floor | M4's own text: "secrets off one machine." |
| `DAT-25` offsite backup mirror behind | M4 — Infrastructure Floor | M4's own text: "backups/PITR." |
| `SES-123` routines notifications | M4 — Infrastructure Floor | M4's own text: "notification reliability." |

**The M4 three reopen M4 if moved**, which is the honest consequence and the reason this is John's
call rather than a bookkeeping edit: a milestone whose gate was accepted does not silently reacquire
members. If he prefers, they stay where they are and M5 simply carries them without owing them.

### What this gate deliberately does not decide

The **M6 budget review** (`SES-185`) and anything about retiring the runner routine. Tonight's
13.4-hour cron silence is real and is `SES-269`'s subject, but whether the routine survives is an
M6 question and belongs to that gate.
