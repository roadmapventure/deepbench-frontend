<!-- DeepBench v7.0.406 | docs/RUNNER-GOV-M6-REQUIREMENTS.md | M6 COMPLETE — close-out of attended session design-m6-build-0902 (2026-09-02): the required set closed at 8 (the gate's six plus SES-315 and SES-316 from the milestone review), every ship verdict-backed, the first live ship decision recorded (b5214a0a), the M7 drain standing behind SES-186. Doc-only plus the generated CLAUDE-STATE.md, standing brief and backlog snapshot. -->
<!-- DeepBench v7.0.403 | docs/RUNNER-GOV-M6-REQUIREMENTS.md | M6 milestone gate review (attended session design-m6-build-0902, two Fable 5 lenses, decided under SES-312 as decision c3e86310, reversible until 2026-09-05 18:33 CST): PASS WITH NAMED GAPS — SES-315 and SES-316 filed required into M6, SES-317 non-required behind SES-314, cap_relax_rung 5→13, M7 pick order corrected, the Selfbuild M7 drain declared under 0970abad. Both lenses recorded in their own words. No rule STATEMENT changed. -->
<!-- DeepBench v7.0.396 | docs/RUNNER-GOV-M6-REQUIREMENTS.md | SES-286 (c) — THE PHASE SPLIT IS OVER, said in an amendment note rather than by editing the paragraph that recorded it. SES-286 (a) (v7.0.394), (b) (v7.0.395) and (c) (v7.0.396) built the reversal-window machinery this file deferred: public.runner_decisions plus record_decision() / sweep_decision_windows() / reverse_decision() / ladder_apply_signal(); runner-cycle.md 7b and its serial-tail sweep; session-setup.md 3d and its Reversing-a-decision section; and the standing brief's Open decisions block, which lists every open decision beside the one line that undoes it. NO RULE STATEMENT CHANGED — not one `>` quoted line was touched, so the ses-285 registry↔doc equality guard is untouched, and no governance_rules row moved. THE SUPERSEDED SENTENCE IS LEFT STANDING DELIBERATELY: "a rule marked `script` below is not yet enforced by any script" was true on 2026-09-01 and false from v7.0.396, and this file is a GATE RECORD — the phase it records really happened, so the note supersedes the sentence rather than deleting the history. An editor tempted to tidy the paragraph instead should read the amendment first. Doc only; the renderer and the new guard tests/regression/ses-286c-open-decisions-brief.test.mjs ship in the same commit. -->
<!-- DeepBench v7.0.391 | docs/RUNNER-GOV-M6-REQUIREMENTS.md | SES-185 — the M6 design gate, decided rather than asked (attended session design-m6-build-0902, Fable 5.1, M6-01). This file gains the gate record: what M6 promises and which ticket carries each promise, the required set (6 tickets, 11 cycles — stored as milestone_required), four members filed at the gate (SES-310..313), the rulings the gate owed (exit-exam defaults kept, dev→main promotion withdrawn from SES-185 scope under M6-08, design/coding split satisfied by measurement for the runner), and the M5 milestone-review runner_items row written so step 8d and directive 0970abad can see that review. No rule STATEMENT changed: the ses-285 registry↔doc equality guard is untouched. Doc-only plus Supabase rows, all before-imaged under session_name design-m6-build-0902. -->
<!-- DeepBench v7.0.359 | docs/RUNNER-GOV-M6-REQUIREMENTS.md | SES-285 — the M6 autonomy rule set (M6-01..M6-08) gets its canonical home. FEATURE: SES-285 — this file and the eight public.governance_rules rows it renders land in ONE commit with the five retirements (B13, B16, B23, B28, B29) and eight supersessions (B7, B12, B14, B17, B24, B27, B34, B35) they replace, per the SELFBUILD-CHARTER transition rule: no commit may exist in which neither the old rule nor its replacement is in force. Retirement entries: docs/SELFBUILD-RETIREMENT-LEDGER.md 21–33. -->
# Selfbuild M6 — Autonomy Graduation Requirements Register

> **The registry is authoritative.** Each rule below is one row in `public.governance_rules`
> (`source_group = 'selfbuild-m6-register'`, `status = 'live'`). **This file is that row's canonical
> home, and each statement here is byte-for-byte the row's `statement` column** — never a paraphrase
> and never a second wording. `docs/governance/RULES-SNAPSHOT.md` is the third, *generated* copy;
> it is written only by `node scripts/export-governance-snapshot.js` and never by hand. When a rule
> changes: **edit the row, re-export the snapshot, then reconcile this file** — in that order, in one
> commit.
>
> **Provenance.** John, 2026-09-01, verbatim: *"I no longer want to work via cards or taps. And you
> are supposed to be more self sufficient to update tickets accordingly without me."* Then, on the
> proposal this register encodes: *"go ahead."* Encoded by `SES-285` (`v7.0.359`), kickoff
> `docs/kickoffs/v7.0.359-SES-285-retire-card-tap-surface.md`.

## What the numbers were when these rules were written

The tap surface did not fail in theory. It had already failed, and the measurement is why this
register exists rather than a softer version of it:

- **45 `gated_before_build` cards undecided at decision time, 42 of them older than 48 hours**,
  against 79 ever decided. **A third of everything ever asked of John had gone unanswered.**
- **33 open tickets carried `design_status = 'needs-john'`** — a blocking state with no bounded
  exit, because nothing in the platform ever forced the question to be answered.
- The retired rule `B23` said in as many words that *"silence parks a card forever."* That clause
  is not a description of the backlog above; it is the mechanism that manufactured it. An
  unanswered card was never a deferral — it was a permanent stall with no timer on it.

**The cost, found while scoping this very ticket.** Card `04d34757` — *"The runner has no spending
budget for September and has stopped"*, filed 2026-09-01 — sat undecided with **no backlog ticket
behind it**. `runner_budget` held only a `2026-08` row, so the runner was starving: 9 of 15 cycles
that day closed `did_not_run`. The single most urgent operational fact in the system was queued
behind a tap nobody read. The attended session inserted the `2026-09` row and decided that card
during scoping, so the runner was already unblocked before this register was written; it is
recorded here as the motivating evidence, not as work this register performs.

## What replaces the gate, and why it is allowed to

The charter's **sequencing invariant** binds M6: *"no cap is retired and no gate collapsed until the
metric that replaces it is live and green."* It is satisfied, not waived. `SES-181` (verdict-only
fail-closed reviewer) and `SES-182` (auto-rollback on red) both shipped in M3 and are green. The
substitution this register makes is therefore **the verifier decides instead of John**, and the
approval gate is replaced by a **72-hour reversal window in which silence is assent** — the exact
inverse of `B23`'s silence-parks-forever, and the reason `B23` could not stay live alongside it.

## Phase split — what is and is not executable today

This register is **encode**. The rows exist, this file is their home, and the thirteen rules they
replace are retired or superseded in the same commit. **The reversal-window machinery — the timer,
the expiry sweep, the reversal handle — is `SES-286`, a separate ticket.** Said plainly so no reader
mistakes a recorded intent for a live gate: **a rule marked `script` below is not yet enforced by
any script.** The `reviewer` rules bind a reader from the moment they are live.

<!-- FEATURE: SES-286 (c) — the amendment that ends the phase split. Appended, never a rewrite of
     the paragraph above it: that paragraph is part of the gate record and was true when written. -->

**Amendment — 2026-09-02, `SES-286` (a) `v7.0.394`, (b) `v7.0.395`, (c) `v7.0.396`.** The
reversal-window machinery this section deferred is built, and the paragraph above is now history
rather than the current state. What shipped, in order:

- **(a) `v7.0.394`** — `public.runner_decisions`: a decision is a row with an `expires_at` and a
  handle, its handle being its own `id`, and the before-images written under it carry
  `decision_id`. With it, four functions: `record_decision()`, `sweep_decision_windows()`,
  `reverse_decision()` and `ladder_apply_signal()` (plus the `ladder_work_class()` helper).
- **(b) `v7.0.395`** — the runbooks call them: `docs/runbooks/runner-cycle.md` **7b** (what a
  decision is, and the one transaction that records it with its rows), its serial-tail
  **`(7b) SWEEP THE DECISION WINDOWS`** step ahead of the chain gate, and step 8c's automatic
  removal; `docs/runbooks/session-setup.md` **3d**, its close-out sweep, and its
  § *Reversing a decision*.
- **(c) `v7.0.396`** — `scripts/render-standing-brief.js` renders an **Open decisions** block into
  `docs/runbooks/standing-brief.md` at every ship: every open decision, when it finalises in CST,
  and beside it the single `reverse_decision()` line that undoes it.

**`M6-02`, `M6-05`, `M6-06` and `M6-07` therefore have an executing mechanism.** The window is the
column `runner_settings.reversal_window_hours` and each `expires_at` is computed at record time, so
a later change to the setting never moves an existing window (`M6-02`). A decision and the ticket it
files are one transaction, and the before-images naming that `decision_id` are written in it
(`M6-05`). The recorded reversal handle is the decision's `id`, and it is now on the page John reads
(`M6-06`). The ladder promotes on a decision nobody reversed — at the sweep, once its window closes
— and demotes on a reversal, inside the window or after it (`M6-07`).

**`M6-01` and `M6-03` execute through the same record.** A cycle's recorded reasoning is the
`reasoning` column of its decision row rather than prose on a ticket, which is what makes "decides,
never asks" auditable afterwards (`M6-01`); and an automatic removal after a second consecutive
failed revalidation is a `kind = 'removal'` decision whose window is precisely what makes acting on
that second failure safe (`M6-03`).

**The sentence this note supersedes** is the one above: *"a rule marked `script` below is not yet
enforced by any script."* It was true on 2026-09-01 and false from `v7.0.396`. It is left standing
rather than edited because this file is a gate record and the phase it records really happened —
read it as history and read this note as the current state. What remains un-scripted is narrower and
named: `M6-04` is a `reviewer` rule and always was, and `M6-08` is a boundary statement, not a
script. No rule **statement** changed in this amendment and no `governance_rules` row moved.

## Deliberately retained — autonomy stops at `dev`

`B20` (*"Keep dev→main promotion permanently under John's control; full automation stops at dev"*)
and `HR-MERGE` stay **live**, and `M6-08` restates that boundary inside this register so no later
reader has to infer it from an absence. John's instruction was about ticket-level cards and taps;
production promotion is a different blast radius and remains his. `B5` (honor pin directives) stays
live too — a pin is John giving direction, not John being a gate — and so does `B39`, which is a
platform constraint on the `.claude/` write path, not a policy choice about who decides.

---

## The rules

### <a id="M6-01"></a>M6-01 — a cycle decides, it never asks (`script`)

> No cycle may block on a human decision; `needs-john` is retired as a blocking state and a cycle decides with recorded reasoning instead of asking.

This is the whole register in one line. `needs-john` was the blocking state with no exit, and the
33 open tickets carrying it were not waiting on a decision anybody was going to make. They now carry
`design_status = 'needs-decision'` — a decision the *cycle* owes, not one John owes — and the
reasoning it records is what makes the decision auditable afterwards.

### <a id="M6-02"></a>M6-02 — execute now, reversible for 72 hours (`script`)

> A decision executes immediately and is reversible for 72 hours; silence is assent, never a park. Supersedes B14 and B23's silence-parks-forever.

The retired `B23` parked a card forever on silence and `B14` let only John's tap ratify a rule; both
made non-response the strongest possible veto. Inverting it costs nothing that was actually being
spent: 42 of the 45 stalled cards had been silent for more than 48 hours, so under this rule every
one of them would have executed and passed its window before anybody noticed the delay. **72 hours
is the window, and it spans a full scheduler cadence** rather than a single quiet afternoon — the
same span `M5-12` uses for the same reason.

### <a id="M6-03"></a>M6-03 — a twice-failed premise removes itself (`script`)

> A ticket whose premise fails revalidation twice consecutively is removed automatically, reversible inside its window; no removal waits on a human Accept. Supersedes B7.

`B7`, now superseded, required every removal proposal to route to a John Accept/Reverse/Rework card
— so a ticket whose premise had demonstrably evaporated stayed on the board indefinitely, competing
for picks. **Twice consecutively, not once:** a single failed revalidation is as likely to be a
transient read as a dead premise, and the reversal window is what makes the second one safe to act
on rather than a reason to keep asking.

### <a id="M6-04"></a>M6-04 — invention is admitted by a test, not a tap (`reviewer`)

> Invention proposals are admitted or rejected by the enhancement-lane admission test (`SES-283`), never by a card. Supersedes B12.

`B12` filed every invention-cycle result as a gated-before-build card for John's Accept, which is
the single highest-volume producer of the 45-card backlog. Superseding it does not lower the bar —
it moves the bar into `SES-283`'s admission test, where it is written down, applied identically
every time, and can be argued with. A card is not a bar; it is a queue.

### <a id="M6-05"></a>M6-05 — a decision and its ticket are one write (`script`)

> Every decision a cycle makes files its resulting ticket in the same transaction — a decision must never evaporate. Supersedes B17.

`B17` said an Accept must never evaporate and converted one into a queued ticket. Superseding it
keeps that promise and widens it to **every** decision, not only the accepting kind — and makes it
one transaction, because a decision recorded in one write and filed in another has a window in
which it exists and its ticket does not. Measured proof the window is real: card `04d34757` sat
undecided with **no ticket behind it at all**, so its content lived nowhere but the card.

### <a id="M6-06"></a>M6-06 — no cycle ends by asking (`reviewer`)

> A cycle never ends by asking; wherever it would have escalated to a card, it decides, records the reasoning, and records the reversal handle. Supersedes B24 and B27.

`B24` forbade a card wasting a cycle and `B27` routed the ambiguous middle of its build-vs-ask
matrix to a gated card — between them they made "escalate" the defined outcome for exactly the cases
a decision was most needed. Both are superseded here. The three artefacts are what make the decision
reviewable after the fact: the decision, the reasoning behind it, and the handle by which it is
undone inside its window.

### <a id="M6-07"></a>M6-07 — the ladder measures verdicts, not taps (`script`)

> The trust ladder's inputs are verifier verdicts and post-window reversals, not Accepts; an unreversed decision past its window promotes, a reversal demotes. Supersedes B34 and B35.

`B34` correctly refused to count a gated Accept toward the ladder — permission is not a rating — and
`B35` made a Reverse on a gated card demote it. With the card surface gone, both describe an input
that no longer arrives, so both are superseded rather than left pointing at nothing. The replacement
inputs already exist and are already green: the `SES-181` verifier's verdict, and whether the
72-hour window closed without a reversal. **A decision nobody reversed is the only evidence of
unattended judgment that a tap never was.**

### <a id="M6-08"></a>M6-08 — and it still stops at `dev` (`reviewer`)

> `dev`→`main` promotion remains John's alone (B20, HR-MERGE): autonomy is total up to `dev` and stops there.

Stated inside this register, and not merely left implied by `B20` and `HR-MERGE` staying live,
because a register that retires thirteen human gates is exactly the document a later reader will
mine for permission to retire the fourteenth. **The boundary is not a leftover of the old surface.**
It is the one gate John's instruction did not reach, and the test for this ticket asserts `B20` and
`HR-MERGE` are still `live` precisely so an over-reaching sweep fails loudly here first.

---

## Execution economics — added 2026-09-01 (`SES-296`, v7.0.362)

John, after reading the cost measurement: *"i think the drain and routines cost a lot of extra tokens
that was unecessary... stay close as possible to its predicted 32M tokens without interuption"*, then
*"make this a permenant governance we use from here on out, removing past conflicting governance."*

**The measurement these five rules answer to**, taken over the weekly window beginning 2026-08-28:

| Cycle type | Ships a ticket for |
|---|---|
| Chained (stays in session) | **809,364 tokens** |
| Scheduled (cold boot) | **2,277,193 tokens** — 2.8× |

The gap is startup tax — roughly **1.47M tokens per boot** re-reading `CLAUDE.md`, `CLAUDE-STATE.md`,
the standing brief and the runbook before any work begins. Separately, **53 scheduled cycles booted
cold, found nothing to do, and closed: 32.4M tokens shipping nothing** — more than the entire 31.9M
predicted cost of finishing M5. Days with chaining shipped 15–30 tickets; the two days without it
shipped 4 and 5 while burning 7–10M on parked boots.

### <a id="M6-09"></a>M6-09 — a fire with nothing to do costs no session (`script`)

> Never boot a session to discover there is nothing to do: every scheduled fire is gated by a pre-boot pickability query, and a fire with nothing pickable closes without spawning a session.

The single largest recoverable waste in the system. Implementation is `SES-297`.

### <a id="M6-10"></a>M6-10 — the chain is the unit of work (`script`)

> The chain is the unit of work: one boot drains tickets in-session until the epic empties, the budget wall hits, or the re-anchor bound is reached. A cold boot per ticket is never the default.

### <a id="M6-11"></a>M6-11 — a filtered skip is not a failure (`script`)

> A ticket skipped because a rule filtered it — blocked, out-of-lane, or gate-held — is not a no-ship, and never counts toward a chain's no-ship streak or a ticket's stuck count.

Without this, `M5-08` and `M5-09` doing their job would kill chains and force the expensive cold boot
they exist to avoid. `runner_settings.chain_max_noship_streak` raised 2 → 4 in the same change.

### <a id="M6-12"></a>M6-12 — a chain re-anchors, it does not drift (`script`)

> A chain re-anchors from the durable record — the board and the charter — every sixth ticket, paying one boot deliberately rather than trusting carried context for correctness.

The charter's own warning: a session "never relies on context compression for correctness." Chaining
is cheap *because* it reuses context, so the bound is the price of the saving, not an afterthought.

### <a id="M6-13"></a>M6-13 — scope caps bind the cycle, not the chain (`prose`)

> The one-feature, three-file, four-task scope caps bind an individual cycle, never the chained session that contains several.

### Conflicting governance withdrawn in the same change

| Rule | Was | Now |
|---|---|---|
| `CAP-SESSION-SPLIT-SIGNS` | split once a session "runs past 20 minutes" | wall-clock is no longer a split trigger — a chained drain runs long by design; file/task caps and compaction still are |
| `B22` | one session named for its one ticket | a chained session is named for its drain and renamed at each pick |

`B24`'s "exactly one build per cycle" would have conflicted too; it was already superseded by `M6-06`
in `SES-285`. `B42` (parallel cycles, no mutex) and `B32` (daily ceiling) are unaffected — chains and
parallelism coexist, and the ceiling still binds.

**Projected effect on M5** (24 remaining cycles): all-scheduled **54.7M** (71% over prediction);
all-chained **19.4M**; realistic three-boot mix **~23.8M**, about 25% under the 31.9M prediction.

---

## Related registers and files

| Where | What it holds |
|---|---|
| `public.governance_rules` | **Authoritative.** The eight rows this file renders, plus every other rule, live or withdrawn. |
| `docs/governance/RULES-SNAPSHOT.md` | Generated repo-side copy of the whole registry. Never hand-edited. |
| `docs/RUNNER-GOV-0820-REQUIREMENTS.md` | The 2026-08-20 register (A1–A6, B1–B42), where all thirteen rules this one withdraws still keep their entries. |
| `docs/RUNNER-GOV-M5-REQUIREMENTS.md` | The M5 register. `M5-09`, `M5-10` and `M5-14` are **amended by this ticket** — see its amendment note. |
| `docs/SELFBUILD-RETIREMENT-LEDGER.md` | Entries 21–33: one per retired or superseded rule, with the reason and the restore path. |
| `docs/SELFBUILD-CHARTER.md` | The sequencing invariant and the transition rule these eight answer to. |
| `tests/regression/ses-285-m6-autonomy.test.mjs` | Guards all of the above, including that `B20` and `HR-MERGE` did not move. |

## <a id="the-m6-gate-decision"></a>The M6 gate decision — `SES-185`, decided 2026-09-02 (`v7.0.391`)

<!-- FEATURE: SES-185 — the M6 design gate, decided rather than asked. M6-01: a cycle decides with
     recorded reasoning instead of asking. This section IS that record. Reversible under M6-02. -->

**Decided by attended session `design-m6-build-0902`, not by a card.** John's word that opened the
sitting, verbatim: *"anything m6 can be built without my input right now? if so, run through all
those tickets."* The card surface is retired (`SES-285`); `M6-01` requires the decision be made and
its reasoning recorded, which is this section. It is reversible for 72 hours under `M6-02`. Every
row it wrote carries a before-image under `session_name = 'design-m6-build-0902'`.

### What M6 promises, and which ticket carries each promise

`SES-185`'s own text and the charter's M6 row name the theme — *ladder-driven auto-accept, caps
retirement* — and the M5 milestone review of 2026-09-02 handed this gate four findings. Measured
against the board, two promises had no member at all:

| Promise | Carried by | State at the gate |
|---|---|---|
| **1. The verifier decides; silence past 72 hours is assent** | `SES-285` (rules, done) · `SES-286` (mechanism) | The eight `M6-*` rules are live, but the window has no timer, no expiry sweep and no reversal handle — a rule marked `script` that no script runs. `SES-286` ruled **required**. |
| **2. The ladder measures verdicts and reversals, and a rung buys real autonomy** | `SES-134` (done) · `SES-122` | The arithmetic is executable; the rung still unlocks nothing (`SES-122`'s own finding). Decided at this gate on `SES-122`'s row: a rung buys auto-done eligibility for its class and a one-step cap relaxation, both read from `runner_settings` columns, both fed only by `M6-07`'s inputs. **Caps retirement lives here** — the charter's sequencing invariant is met because the rung that relaxes a cap is fed only by verifier verdicts and unreversed decisions, and a reversal demotes it. |
| **3. Every ship is graded** | `SES-311` — **had no ticket until this gate** | Four of the seven M5 required ships carry no `runner_verdicts` row: attended close-outs never run the verifier and nothing refuses `done` without one. A ladder that sees half the work is not a measurement. |
| **4. Milestones succeed each other without a tap** | `SES-310`, `SES-312` — **had no ticket until this gate** | The M5 drain cannot retire (its deferred and non-required named members count as remaining), so step 8d's sweep never fires; and directive `0970abad` needs an *accepted card*, a thing that no longer exists. Two mechanisms, two tickets; `SES-312` is `blocked_by` `SES-286`. |
| **5. Autonomy stops at `dev`** | `M6-08` (live) | Nothing to build. `SES-185`'s description lists *"ship-point promotion for dev→main"*; that item is **withdrawn from scope** — `M6-08` is the later rule, John's, and outranks the ticket text it contradicts. |

### M6's required set — 6 tickets, 11 cycles

`SES-185` (this gate, 1) · `SES-286` (3) · `SES-122` (2) · `SES-310` (1) · `SES-311` (2) · `SES-312` (2)

**M6 is complete when those close.** Stored form: the six rows carry `milestone_required = true`
and `milestone = 'M6'`, so *"what is left for M6"* is `select … from public.ticket_matrix where
milestone = 'M6' and milestone_required and status <> 'done'` (`M5-04`). **Non-required members**
(in the epic, pickable, not owed): `SES-301` (B34 — superseded 2026-09-01 by `M6-07`, `SES-285` — still carries a rendered block in the runbook, 1) and `SES-313` (model-per-lane
to data, 1, charter decision 5's *"ported to data at M6"*). Eight tickets carried the M6 epic as
`done` before this gate sat: `SES-134`, `SES-247`, `SES-285`, `SES-296`, `SES-297`, `SES-298`,
`SES-300`, `SES-302`.

### Rulings this gate owed, and how each was decided

- **The exit exam's starred targets** (charter §Definition of success: 14 days, 90 % zero-touch,
  30 John-minutes/day, ≤ 5 % reversal, 4 drift-free weeks) — **kept at their defaults.** There is
  no measurement yet to tighten from: reversal rate and verdict coverage begin accruing only when
  `SES-286` and `SES-311` land. Re-reviewed at the M7 gate (`SES-186`) with data.
- **Collapse the design/coding session boundary** — **satisfied by measurement for the runner, not
  filed.** An unattended cycle already designs and builds in one session (kickoff record, then
  build, `M6-10`'s chain). The attended split is John's standing working rule
  (`CLAUDE-DESIGN.md`), outside this project's authority to modify (charter §Transition rule).
- **Model-per-lane ported to data** — `SES-313`, non-required.
- **CI reds are unclassifiable to the heal engine** (M5 review finding) — **observation, not
  filed.** Heal-engine classification is M5's theme and M5 is complete; under charter §Closure
  discipline item 2 a new ticket needs a genuine discovery with evidence, and the next unexplained
  CI red is that evidence. It queues to the general board when it happens.
- **Deliberately not decided here:** the M7 gate (`SES-186`), and whether the hourly routine
  survives — that is John's own switch (`runner_settings.scheduler_on`, §2b), never this project's.

### The M5 milestone review now has a record the runner can see

The review ran attended on 2026-09-02 and its findings live in `docs/RUNNER-GOV-M5-REQUIREMENTS.md`
— but step 8d's sweep keys on a `runner_items` row per epic and directive `0970abad` reads that row
as succession provenance, so with none the same review would be re-run unattended and M6 could never
be declared. This gate wrote that row (`runner_items` `18500000-…-a5`, `kind = gated_before_build`,
`epic_id` = M5, `decision = 'accept'` with John's *"yes, file the two tickets"* as the reason) and put
the M6 successor list on it in the `SES-142` fixed-list form: the epic's open members at naming —
`SES-286`, `SES-122`, `SES-301`, `SES-310`, `SES-311`, `SES-312`, `SES-313`. The M6 drain declares
under `0970abad` once the M5 drain retires (`SES-310`); `SES-312` then replaces the accepted-card
precondition with a decided-and-unreversed one, so the M7 handoff needs no hand-written row.

### Cost

Per `public.ticket_matrix` at the gate: 11 required cycles ≈ 14.6 M tokens (4.9 % of a weekly
allowance); all 13 open-member cycles ≈ 17.3 M. Chained, per the `M6-09`…`M6-13` measurement,
roughly a third of that.

## <a id="the-m6-milestone-gate-review"></a>The M6 milestone gate review — decided 2026-09-02, decision `c3e86310`

<!-- FEATURE: SES-312 first live run — the review decided, filed and declared inside one recorded
     decision (gate-review.md § The decision and the successors). Attended session
     design-m6-build-0902; two fresh-context lenses on Fable 5; no card, no tap. -->

**Record:** `runner_items` `4f443b75` (`Selfbuild M6 - Autonomy Graduation — milestone gate review`,
`decision = 'accept'`). **Decision:** `runner_decisions` `c3e86310`, kind `gate`, **reversible until
2026-09-05 18:33 CST** — `select public.reverse_decision('c3e86310-340e-42ea-9309-6283d1929681', 'John', '<why>');`
**Drain:** `Selfbuild M7 - The Inventor` declared as `runner_directives` `34600430` under `0970abad`
as amended by `SES-312`, five named members (`SES-186`, `SES-159`, `SES-160`, `SES-004`, `SES-84`),
every one held behind the M7 design gate `SES-186` by `M5-09` until that gate is done. Every row
this review wrote carries a before-image with `decision_id = c3e86310`; one reversal undoes all of
it except the record itself.

### Verdict — PASS WITH NAMED GAPS, both lenses

Both lenses independently reached the same line. In plain words: **the autonomy machinery M6
promised is built and proven in rolled-back fixtures, and it has not yet run without a person in
the room.** Every one of the six required members is `done`; every retired or amended rule has its
replacement live and green; and three things M6 promised are not yet true in the way John would
experience them. The lenses split on one placement, recorded below and ruled the narrower way.

### What the review filed and changed, in one transaction

| Item | What | Why (evidence) |
|---|---|---|
| `SES-315` — *A shipped change has a live Reverse: the auto-done status write records a decision row, reverse_decision() is the one Reverse for ships, and the tap-only ladder and restore paths retire* (Tooling, **P10 - Tooling**, M6, **required**, 2 cycles) | Both lenses. A ship's close-out records no decision (7b says its Reverse "lives on the ship card"), and the card's tap is the surface `SES-285` retired — so a shipped change has no live Reverse, and since only `reverse_decision()` demotes, **a bad ship can never demote the ladder**. `apply_ladder_decision()` still promotes on a ship-card Accept. Absorbs the latent `apply_data_restore()` delete-and-reinsert FK hole and the four `runner-cycle.md` passages still stating withdrawn rules in live voice. |
| `SES-316` — *Claim and release stop making decisions un-undoable* (Bug, **P9 - Bug Fixes**, M6, **required**, 1 cycle) | Architect lens. Claim and release write `updated_at = now()`; `reverse_decision()` refuses any row written after its image **and still returns `applied`** — so every decision on a ticket the drain has since claimed is silently un-undoable. |
| `SES-317` — *done requires a passing verdict on the shipped version, or a recorded attended override* (Tooling, **P10 - Tooling**, M6, non-required, `blocked_by SES-314`) | Both lenses named it; the Architect ruled it required, the PM ruled it M7-gate material behind `SES-314` (the CRLF false block makes every attended verdict a `block` today). **Ruled the narrower: filed, non-required, blocked.** `SES-301` and `SES-311` are `done` on a single `block` each. |
| `runner_settings.cap_relax_rung` 5 → 13 | PM lens G1. `class_autonomy('P10 - Tooling')` was paying out +8 files / +8 tasks on a rung earned entirely under the tap regime (`tooling` 13/42 from 08-24 until the first verdict moved it). The extras now accrue only from verifier-fed promotions. A settings row on the reversal allowlist. |
| `SES-159`, `SES-84` → `blocked_by SES-186`; `SES-186` tier `now`, 2 cycles, description re-scoped | Both lenses F1–F3. M7's members are written in the retired card idiom (`SES-160` "John's Accept files the ticket"; `SES-159` checkpoints on the retired `B13` drip; `SES-186` "gated cards"); pick order let `SES-159` run before its gate. `SES-186` now owns four deliverables and one **Tier-3 item**: exit-exam criterion 7's "ratified by John" is John's wording — the gate records its reading as a decision whose 72-hour window is his ratification, and names it to him. |
| Two false-block verdicts (`253aca14`, `fa079428`) **not** fed to the ladder | Exemption recorded here rather than silently skipped: a streak reset on an environment defect (Windows spawn, since fixed; CRLF, `SES-314`) is noise, not judgment. |
| Exit-exam targets | Kept at defaults (both lenses). No target is read before the rolling-30 floor the charter names — one decision, zero reversals is not a 0 % reversal rate. |

### Burndown — two figures, never netted

Named at the gate: **15** (7 open + 8 already done). Closed since: **14** (`SES-313`, non-required,
in flight at review time). Filed **into M6** since the gate: **0** (plus the three this review filed).
Filed **elsewhere** from M6 work: **1** — `SES-314` (general board). No M6 drain was ever declared
(M6 was built attended, and `0970abad` had nothing accepted to stand on), so the burndown is computed
from epic membership; `SES-312`'s transaction gives M7 the row home M6 never had.

### The PM lens, in its own words

PASS WITH NAMED GAPS. M6 delivered every required member and every mechanism it promised is live.
Two things keep it from a clean pass: the cap relaxation is paying out on a trust-ladder balance the
verifier never earned, and the entire milestone — the one called *Autonomy Graduation* — was built
by attended sessions; no unattended cycle has exercised a single M6 mechanism yet. Backward: promise
1 (verifier decides, silence is assent) — mechanism yes, production no: one real decision row exists,
0 finalised, 0 reversed, and the M5/M6 gate decisions themselves predate the mechanism so their
"reversible under M6-02" sentences point at nothing. Promise 2 — yes with G1. Promise 3 — coverage
yes, pass-bar no: 4 of the 6 required M6 ships closed before the trigger and carry no verdict; 58
Selfbuild `done` tickets carry none (historical by design). Promise 4 — built, never run: this
review is the first execution of the `SES-312` path. Promise 5 — yes, nothing moved. Slippage: 10
real build sessions against 11 predicted cycles; the 14.6 M-token estimate is neither confirmed nor
refuted because attended cost is unmeasured (`SES-82`, deferred). All ten M6 ships were
`trigger = 'supervised'`; the first M7 chain is M6's real acceptance test. Forward: `SES-186` grows
1 → 2, `SES-160` likely shrinks 4 → 3; the order changed, not the total. The verifier's attended
block rate today was 2 false of 3, on top of M3's zero true catches in 100 verdicts — any M7 design
that leans on "the verifier decides" is leaning on a rate that reads noise.

### The Chief Architect lens, in its own words

PASS WITH NAMED GAPS. (a) Reversal works on the designed path — in-place restore from the oldest
image, allowlist, written-since refusal, demote, a reversal is itself recorded and cannot be
reversed — and has never yet been run against a live row. The commonest real path defeats it: claim
and release bump `updated_at`, so a decision on a picked ticket refuses every row and still says
`applied`; a reversed gate review would delete its drain and scope and leave claimed successors
orphaned. M6's own decisions (the gate ruling, the M5 review row, the `milestone_required` flags,
the 36 `needs-decision` conversions) have no handle — the window binds from v7.0.395 forward.
(b) The ladder is fed by verdicts, sweeps and reversals; reversal rows cannot self-promote; but
`apply_ladder_decision()` still promotes on a ship-card Accept (dormant since 08-30, live), and
**a bad ship can never demote a class** — the charter's "a Reverse spike auto-narrows the ladder"
has no live input for shipped work; `tooling` at 13/43 is effectively permanent. (c) Caps widen only
with the rung going forward; the starting width was inherited. (d) `done` requires *any* verdict —
`SES-301` and `SES-311` are `done` on a block each; the unattended path writes `delivered` on a
block, so the hole is attended-only. Drains retire on the gate's ruling; `SES-312`'s mechanism
fires live for the first time at this review. (e) dev→main is John's alone everywhere. Present:
registry = snapshot = STANDARDS byte-for-byte, ledger 21–38 complete; four `runner-cycle.md`
passages still state withdrawn rules in live voice (step 8c "No unattended removal, ever"; step 6's
`needs-john` SET; the step-5 flag table and the chain-gate flag-set mentions; the Accept→streak
lines). Forward: M7's four assumptions are disproved — cards, Accept-files, verdict mining from a
corpus frozen since 08-30, a John-model accuracy number that would be noise — and `delivered` is a
state with no exit for non-Selfbuild classes (16 tickets sit there today; `SES-154` resumes at
Selfbuild completion with no Accept surface). What should change before M7 is drained: the
invention control after cards (EL-01 + window), `SES-160`/`SES-159` rewritten off the retired drip,
the John-model's signal redefined as reversals plus attended rulings with no numeric criterion until
≥ 30 signals exist, and the `delivered` exit resolved before the first general-board ship.

### What this review deliberately did not do

It did not re-feed the two false-block verdicts, re-grade the four required ships that closed
before the trigger, re-home the four tickets whose `milestone` disagrees with their epic (John's
call, M5 record), or decide anything the M7 gate owns. `SES-315` and `SES-316` are M6's own promise
and are drained attended in this session, per the M5 precedent; M6 retires when they close.

### M6 COMPLETE — 2026-09-02, v7.0.405

**The required set closed at 8 tickets** — the gate's six (`SES-185`, `SES-286`, `SES-122`, `SES-310`,
`SES-311`, `SES-312`) plus the two the milestone review filed as M6's own promise (`SES-315`,
`SES-316`) — every one `done` with a before-image, and the last five with an attended verifier
`approve` recorded on an LF snapshot (`SES-312` `9aace1b8`, `SES-313` `59e9dda3`, `SES-316`
`c9f4983a`, `SES-315` see its row; `SES-301` and `SES-311` carry environment-only blocks, `SES-314`).
Stored form: `select … from public.ticket_matrix where milestone = 'M6' and milestone_required and
status <> 'done'` returns **zero rows**. Non-required members: `SES-301` and `SES-313` done;
`SES-317` open, `blocked_by SES-314` (general board) — it does not hold M6.

**What is true now that was not this morning, in John's terms:** a cycle decides instead of asking
and every decision is a row he can undo with one line for 72 hours; a shipped change has that same
handle (`record_ship_decision()`), so his Reverse of a delivery is one line too, and it demotes the
class that shipped it; the trust ladder moves only on verifier verdicts and on those windows and
reversals; the scope caps widen only from rungs earned that way (`cap_relax_rung = 13`, so nothing
is widened yet); `done` cannot be written on a Selfbuild ticket without a verdict behind it; a
milestone drain retires on the members its gate ruled required; a milestone review decides, files
its successors and declares the next drain inside one reversible transaction — and did, for M7,
tonight; dev→main is still his alone.

**What M6 did not do, said plainly:** no unattended cycle has yet exercised any of it. All twelve
ships were attended; the first M7 chain is M6's real acceptance test, and the M7 design gate
`SES-186` — now first in the M7 drain — carries one Tier-3 item (charter criterion 7's "ratified by
John") that John should hear about before or as the gate is decided.

**Cost, as far as it is measurable:** 12 ships in one attended session against a gate estimate of
11 required cycles; attended token cost is not attributable (`SES-82`, deferred), so the 14.6 M
figure is neither confirmed nor refuted.
