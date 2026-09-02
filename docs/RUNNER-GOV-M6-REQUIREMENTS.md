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
