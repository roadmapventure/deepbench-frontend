<!-- DeepBench v7.0.407 | docs/design/SES-186-m7-inventor-gate.md | SES-186 — THE M7 DESIGN GATE'S
     DECISION RECORD. Decided by attended session design-m7-gate-0902 on 2026-09-02 under M6-01 (a
     cycle decides with recorded reasoning instead of asking), recorded as runner_decisions
     05cc2722-b6aa-47fc-a557-cd85d44e42f5 (kind gate, reversible under M6-02 until 2026-09-05 21:09 CST),
     six before-images under session_name design-m7-gate-0902. THE DECISION ROW IS THE TRUTH AND THIS
     FILE IS THE REPO-SIDE COPY — the same precedence docs/design/SES-183-m4-infrastructure-floor-gate.md
     sets; if they disagree, the row wins. The one thing John ruled in his own words (charter criterion 7,
     the Tier-3 item) is quoted verbatim in § The Tier-3 item, and nothing here paraphrases it. -->

# SES-186 — M7 design gate: the inventor (decision record)

**Ticket:** `SES-186 — M7 design gate: the inventor — research lane, verdict mining, John-model`
(Architecture, **P10 - Tooling**, tier `now`, size `L`, epic `Selfbuild M7 - The Inventor`).
**The sitting:** attended session `design-m7-gate-0902`, 2026-09-02, 20:42–21:09 CST. John's word
that opened it, verbatim: *"run the m7 gate now."*
**The decision:** `runner_decisions` `05cc2722-b6aa-47fc-a557-cd85d44e42f5`, kind `gate`,
`backlog_id = SES-186`, decided 2026-09-03 02:09:02Z, **reversible until 2026-09-05 21:09 CST** —
`select public.reverse_decision('05cc2722-b6aa-47fc-a557-cd85d44e42f5', 'John', '<why>');`
One reversal restores the five rewritten rows and un-files `SES-320`; the decision row itself stays as
the record that the gate sat.
**Precedent followed:** `docs/RUNNER-GOV-M6-REQUIREMENTS.md#the-m6-gate-decision` (`SES-185`, decided
under `M6-01`) and the M6 milestone gate review's forward lens, which re-scoped this gate to four
deliverables and one Tier-3 item.

## Why this gate existed, and what it had to answer

M7 is charter goal 6 — *"the platform originates features from evidence."* Its four members were
filed on 2026-08-23 for a platform that ran on briefing cards and John's taps; `SES-285` retired that
surface on 2026-09-01. The M6 review measured the consequence: every M7 member was written in the
retired idiom (`SES-160` *"John's Accept files the ticket"*, `SES-159` checkpoints on the retired `B13`
drip, `SES-004`'s remainder a *"confirm?"* card, `SES-186` itself *"gated cards"*), and it handed this
gate four deliverables: **(i)** the invention control after cards, **(ii)** the members rewritten onto
that control, **(iii)** the John-model's signal redefined, **(iv)** the `delivered` exit for classes
outside the Selfbuild auto-done bar.

## Two facts measured at the gate, which the rulings stand on

Read out of the live database during the sitting, not recalled:

1. **`public.ladder_work_class()` returns NULL for `P1 - Improves John's Skills`, `P3 - Investor
   Value` and `P4 - New Customers`.** Only `P2 - Inventive` maps to a ladder class (`invention`, rung
   0). `class_autonomy()` fails closed on a NULL class, so **no P1, P3 or P4 delivery can ever
   auto-done** under the M6 bar, on any epic, at any rung. Two of M7's members are P1.
2. **`public.sweep_decision_windows()` finalises a decision without touching `backlog_items`.** A
   ticket that shipped `delivered` (a class below rung 3, or a class with no rung) stays `delivered`
   after its ship decision's 72-hour window closes unreversed. Sixteen general-board tickets sit there
   today, all pre-dating `record_ship_decision()` (`v7.0.395`), with no exit since the Accept tap went.

Together these say: the machinery M6 built reaches `done` only for classes the ladder tracks and has
promoted. The Inventor's own output is P1–P4 work. Without ruling (iv), M7 could build every member and
still never close one.

## The rulings

### (i) The invention control after cards

A proposal **is a `backlog_items` row** with `scope_origin = 'enhancement'`, classed P1–P4, that
passes `EL-01` on its own row — `scope_rationale` names the charter goal, `enhancement_claim` names the
scoreboard metric and direction, `predicted_cycles` states the displacement cost — and whose description
cites the `vision_claims` refs and `docs/research/` entries that justify it and names the pull test it
passes (`docs/JOHN-DECISION-PATTERNS.md` criterion 137). **Admission is the row passing the test**
(`M6-04`: *"admitted or rejected by the enhancement-lane admission test, never by a card"*). It builds
under `EL-02`'s 20 % weekly cap. Its ship decision (`record_ship_decision()`) is John's Reverse. A
reversed proposal is stored as a **rejected** `vision_claims` row so it is never re-proposed — decision
5 of `docs/design/BRIEFING-COMMENTS-0823-DRAFT.md`, kept. No new mechanism was designed; the three that
exist were pointed at each other.

The five candidates `SES-131` filed on 2026-08-23 (`LOG-143`, `LOG-144`, `MCP-3`, `AGT-60`, `ADM-3`,
all unlinked and unpickable under `M5-01` since) are the first rows to run through the test.

### (ii) The members, rewritten on their own rows

Each row keeps its original text and carries a `RE-SCOPED by the M7 design gate (decision 05cc2722)`
block; the row is authoritative and this table is the summary.

| Ticket | Was | Is now | Cycles |
|---|---|---|---|
| `SES-160` — *Class-driven invention engine: propose features per P1–P4 pull test; John's Accept files the ticket* (Feature, **P1 - Improves John's Skills**) | §12 invention cards; Accept files | Proposals are EL-01 rows per ruling (i); a research leg in the `SES-131` two-leg pattern (live web, cited, written to `docs/research/`) precedes every proposal. **First-feature exception** per § The Tier-3 item. | 4 → **3** |
| `SES-159` — *Perpetual class-understanding loop: standing questions and findings checkpoints for P1–P4* (Feature, **P1 - Improves John's Skills**) | Drip questions + checkpoint cards | Measures per class how thin the ratified criteria are; files the research it needs as `docs/research/` entries and proposed `vision_claims` rows; writes one proposed root claim per class (*"What I currently believe P<n> means"*), re-issued as material accumulates, rendered on the standing brief. **Nothing ratifies by silence**: only John's own words in an attended sitting or a reversal reason ratify a claim — his ruling 2026-08-23, *"I don't think you can ever be done learning about them."* Depends on `SES-84`. | 2 |
| `SES-004` — *Build a reference of John's recurring decision patterns mined from session history* (Architecture, **P10 - Tooling**, partial) | Remainder: *"matches standing pattern N, confirm?"* cards | Criteria become rows in `public.decision_patterns` (append-only; the md stays the narrative index); every `record_decision()` reasoning cites `pattern:N` tokens, stored in a `runner_decision_patterns` join; the John-model's accuracy is the share of pattern-citing decisions finalised unreversed vs reversed, per pattern and overall. No card. | 2 |
| `SES-84` — *The vision corpus: nine docs under docs/vision that ground Claude's P1–P4 classification calls* (Tooling, **P10 - Tooling**, partial) | Done when every claim ratified through the drip; `defer_status = maybe`, *"John-paced"* | Done when every live claim carries a `judgment_class` (P1–P4 or explicitly class-neutral) and a confidence — measured at the gate: **302 of 306 live rows carry no class** — and the standing brief renders per-class ratified / proposed / rejected counts plus the newest root claim. Ratification stays John-paced and becomes a standing metric, not an exit. `defer_status` → `no`. | 2 → **1** |

### (iii) The John-model's signal

Reversals and attended rulings only — `runner_decisions` rows with `status = 'reversed'`, and
`record_decision()` rows carrying a `session_name`. The tap-era corpus (195 ship cards: 134 Accept, 6
Rework, 0 Reverse; 126 gated cards: 72 Accept, 7 Rework, 3 Reverse) is history the patterns were mined
from, not a live signal. **No numeric accuracy criterion binds until ≥ 30 finalised-or-reversed
decisions exist**; below that the brief shows the count and never a rate. At the gate: 3 decisions, 0
reversed.

### (iv) The `delivered` exit — `SES-320`, filed required

`SES-320 — A ship decision that finalises unreversed writes done: the delivered exit for every class,
and the 16 legacy delivered rows dispositioned` (Tooling, **P10 - Tooling**, `M7`, required, 2 cycles,
`scope_origin = gate-review`, outcome claim `none`). When `sweep_decision_windows()` finalises a
`kind = 'ship'` decision whose ticket is still `delivered`, it writes `done` — the `SES-311` trigger is
already satisfied because a ship decision requires an `approve` verdict. `M5-14`'s timing survives:
`original` and `gate-review` work may still auto-done at ship via the rung; everything else reaches
`done` through a verdict plus John's window, never his tap. The 16 legacy rows get one attended
decision (kind `ship-backfill`, before-image per row) so John's one Reverse undoes the batch.

**Named limit, disclosed rather than buried (`SES-196` convention):** `SES-320` is **not** in the M7
drain's named list. `SES-142` — John's rule — says a ticket filed after the naming never joins it, and
this gate did not override that. `drain_epic_next()` picks only from `runner_drain_scope`, so the drain
reaches the five named members and retires on the five the gate ruled required; `SES-320` is reached
through the Selfbuild lane (`M5-01`, `prime_directive_queue()`) once this gate is `done`, and the M7
milestone gate review names it. The finish line the standing brief prints is therefore the five, and
the sixth is owed alongside them.

## The Tier-3 item — charter criterion 7, ruled by John

The charter's exit exam says the first platform-originated feature is *"researched with cited
evidence, proposed, **ratified by John**, built, shipped — and is measurably used by real visitors."*
The escalation policy makes any reading of his wording a Tier-3 call. Asked in the sitting, John ruled,
verbatim (2026-09-02, ~21:05 CST):

> *"for the first effort, let's have you invent and pitch it to me why the system needs it, and if it i
> like it, then you build it automatically"*

**So the reading is:** the **first** invented feature is pitched to John in an attended sitting and is
ratified by his explicit yes; the build after that yes is unattended. From the **second** proposal on,
the 72-hour window on the proposal's admission and ship decisions is the ratification, named to him on
the standing brief. `SES-160`'s row carries this as its first-feature exception.

## What the rulings do to the board

- `SES-186`: `design_status` → `auto`, `milestone_required` → `true`, `predicted_cycles` 2 (this
  sitting is cycle 1; the attended verifier run closes it).
- `SES-159`, `SES-160`, `SES-004`, `SES-84`: `design_status` `needs-decision`/NULL → `auto`,
  `milestone_required` → `true`, cycles as in the table; `SES-84` `defer_status` `maybe` → `no`.
- `SES-320`: filed into `Selfbuild M7 - The Inventor`, required, queue assigned by
  `recompute_backlog_queue()`.
- **Required set — 6 tickets, 11 cycles:** `SES-186` (2) · `SES-84` (1) · `SES-159` (2) ·
  `SES-160` (3) · `SES-004` (2) · `SES-320` (2). Stored form: `select … from public.ticket_matrix
  where milestone = 'M7' and milestone_required and status <> 'done'`.
- **Pick order after this gate closes**, by queue: `SES-84` → `SES-159` → `SES-160` (behind
  `SES-159`) → `SES-004` → `SES-320` (Selfbuild lane).
- **Ladder class on the decision: deliberately NULL** (decide-and-flag). A design ruling is not a
  delivery; recording it under `tooling` would promote that rung when the window closes, and the M6
  review had just retired the rung-earned-under-taps extras. Nothing moves on the ladder when this
  decision finalises.

## Cost

Per `public.ticket_matrix` at the gate: 11 required cycles ≈ 14.6 M tokens (≈ 4.9 % of a weekly
allowance) at the sanctioned 1,329,573 tokens per cycle; 2 cycles already spent on `SES-159` and
`SES-004`. Not in that figure: the M7 milestone gate review, the exit exam, and the first invented
feature's own build — unpredictable until it is pitched.

## What this gate did NOT settle, stated so a later cycle does not assume it did

- **The first pitch itself.** John asked for it; it is the next thing this session does after the
  gate closes, and its outcome is recorded on `SES-160`'s row and in `docs/research/`, never here.
- **The exit-exam starred targets** (14 days, 90 % zero-touch, 30 minutes/day, ≤ 5 % reversal,
  4 drift-free weeks) — kept at defaults; `SES-185` deferred them to this gate *"with data"*, and the
  data is 3 decisions and 0 reversals. They bind at the M7 milestone review or the exit exam.
- **The stale-floor cap.** The freshest `runner_usage_readings` row was 58 h old at the sitting, so
  the day cap sits at 3 M (`M5-15`, `stale-floor`). That paces the drain, it is not a design question;
  `SES-82` / `SES-161` are its tickets.
- **The verifier's own authority** — the M6 review's *"any M7 design that leans on 'the verifier
  decides' is leaning on a rate that reads noise"* stands; ruling (iv) leans on the verdict plus the
  window, which is the bar M6 set, not a stronger one.
- **`ses-281-m5-pick-enforcement.test.mjs`'s live arm** reads a claimed, unresolved gate as *"the
  self-exclusion is gone"* — confirmed at this sitting: `prime_directive_queue()` served none of the
  M7 members while `SES-186` was claimed, so the claim was released for the length of the verifier
  run (today's runner spend was 2.84 M of the 3 M stale-floor cap, so no unattended cycle could take
  it) and re-asserted before the `done` write. The test itself is not touched here.
- **Verdict `9a2edb27` (block) is an environment defect, exempt from the ladder** — the same
  exemption the M6 review recorded for `253aca14` and `fa079428`. The first LF-snapshot run used a
  junction to the shared checkout's `node_modules`, which lacks `@vercel/functions`, so three
  regression files failed at import (`DAT-003`, `DAT-12`, `HAR-20`); build and hygiene were green.
  A clean `npm ci` in the snapshot and a second run followed; `verdict_ladder_signal()` is never
  called on `9a2edb27`.
