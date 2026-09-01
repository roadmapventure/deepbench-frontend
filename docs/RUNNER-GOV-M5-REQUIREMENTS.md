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
transition rule.

---

## The rules

### <a id="M5-01"></a>M5-01 — the scope fence (`script`)

> A ticket is eligible for unattended development only if its `epic_id` resolves to a `Selfbuild M0`–`M7` epic; unlinked or non-Selfbuild tickets are never picked by a cycle.

Drain eligibility is currently a directive-named list (`runner_drain_scope`) — a name, not a
structural property, so nothing prevents non-Selfbuild work entering the unattended lane. This makes
eligibility a property of the ticket's own `epic_id`, which cannot be widened by naming.

### <a id="M5-02"></a>M5-02 — the filing lane, and B3's retirement (`script`)

> Order the pickable board by filing lane first: tickets with `filed_at` before 2026-08-21 take the priority lane, tickets filed on or after it enter a review bucket that requires explicit promotion before pick; within a lane, order by tier then priority class P1→P10. Supersedes B3.

**This is the rule that retires B3**, whose live ordering ended *"then newest-to-oldest within
class"* — the exact inverse of the priority lane John set. Both could not be live, so B3's
supersession ships in this same commit (charter transition rule: a rule changes only via a shipped
ticket whose own commit lands the replacement and retires the old rule, leaving no commit where
neither is in force). Retirement entry: `docs/SELFBUILD-RETIREMENT-LEDGER.md`.

### <a id="M5-03"></a>M5-03 — the matrix carries what the picker selects on (`prose`)

> The per-ticket governance matrix mandated by FILE-MATRIX additionally carries `epic_id` and `filed_at`, because M5-01 and M5-02 select on them; FILE-MATRIX's fail-LOUD tripwire covers the added fields.

A selector the picker reads but the matrix does not carry is a field nobody can audit after the fact.
The two new columns are exactly the two M5-01 and M5-02 select on, and they inherit FILE-MATRIX's
existing fail-LOUD behaviour rather than getting a second, quieter one.

### <a id="M5-04"></a>M5-04 — answer from the matrix, never by re-deriving (`prose`)

> Answer every question about incomplete tickets from `public.ticket_matrix` in its stored columns, never by re-deriving the figures per question.

Re-deriving per question is how two answers to the same question disagree. It is also what the
accounting review had to do — and the re-derivation is where the missing `item_id` rows silently
dropped out of the totals.

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

### <a id="M5-15"></a>M5-15 — no pick on a stale usage reading (`script`)

> A drain refuses to start a pick when the freshest `runner_usage_readings` row is older than 24 hours.

M5-06 bounds a start against remaining weekly headroom, and that bound is only as good as the reading
it is computed from. A stale reading makes the headroom check pass on numbers that no longer describe
the week — so the refusal belongs on the reading's age, not on the arithmetic.

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

## Related registers and files

| Where | What it holds |
|---|---|
| `public.governance_rules` | **Authoritative.** The fifteen rows this file renders, plus every other live rule. |
| `docs/governance/RULES-SNAPSHOT.md` | Generated repo-side copy of the whole registry. Never hand-edited. |
| `docs/RUNNER-GOV-0820-REQUIREMENTS.md` | The 2026-08-20 governance register (A1–A6, B1–B42). B3 lives there, superseded. |
| `docs/RUNNER-GOV-M6-REQUIREMENTS.md` | The M6 autonomy register (`M6-01`–`M6-08`), which withdrew thirteen 0820 rules and amended the three rules noted above. |
| `docs/SELFBUILD-RETIREMENT-LEDGER.md` | B3's retirement entry, with the reason and the restore path. |
| `docs/SELFBUILD-CHARTER.md` | The rolling-wave rule, the transition rule and the storage rule these fifteen answer to. |
