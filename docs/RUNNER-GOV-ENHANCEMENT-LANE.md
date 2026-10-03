<!-- DeepBench v7.0.379 | docs/RUNNER-GOV-ENHANCEMENT-LANE.md | SES-283 — the enhancement lane gets its canonical home. FEATURE: SES-283 — three public.governance_rules rows (EL-01..EL-03, source_group 'enhancement-lane-register') and this file land together; each statement below is byte-for-byte the row's `statement` column, never a paraphrase. The M5 register deliberately left these rules out while John's cap decision was open (RUNNER-GOV-M5-REQUIREMENTS.md, "Deliberately not in this register"); he set it 2026-09-02, verbatim "20% is fine". -->
# The Enhancement Lane — Admission, Cap and Promotion Register

> **The registry is authoritative.** Each rule below is one row in `public.governance_rules`
> (`source_group = 'enhancement-lane-register'`, `status = 'live'`). **This file is that row's
> canonical home, and each statement here is byte-for-byte the row's `statement` column.**
> `docs/governance/RULES-SNAPSHOT.md` is the generated copy. When a rule changes: edit the row,
> re-export the snapshot, then reconcile this file — in that order, in one commit.
>
> **Provenance.** Proposed 2026-09-01 in the M5 rule-set review and held back for one number.
> John, 2026-09-02, verbatim: *"20% is fine."* Encoded by `SES-283` (`v7.0.379`), session
> `design-ses-283-0902`. The admission test's original fifth part — *"John's Accept"* — is gone:
> `M6-04` says invention proposals are admitted or rejected by this test, never by a card.

## What this lane is for

The Selfbuild charter protects the original scope structurally (`M5-01`'s epic fence, `M5-02`'s
review bucket, `M5-03`'s promotion criterion). Protection is automatic. **Enhancement is manual and
must argue for itself** — John's goal 4 in `docs/M5-HANDOFF-2026-09-02.md`: *"He is not against new
work. He is against silent scope growth."* This lane is the narrow door: a proposal that names the
charter goal it serves, the number it will move, and what it costs may be built; one that cannot
say those three things waits until it can. **Since `SES-321` (2026-09-03), `M5-01`'s epic fence is
passed by admission**: an enhancement with no Selfbuild epic link clears the pick path the moment
its own row passes the `EL-01` test above, the same as a Selfbuild-linked ticket — the epic link and
`EL-01` admission are two ways to clear one gate, never two separate ones.

**Use case.** A cycle invents an "M8 mission auditor" (`SES-234`/`SES-235`, filed unlinked on
2026-08-29 and unpickable under `M5-01` ever since). Today its fate is silence. Under this lane the
author writes three things on the row — the goal it advances, the scoreboard number it will move,
its predicted cycles — and the pick path decides: admitted and under the cap, it is buildable;
missing any of the three, or over the cap this week, it is held and the drain census says so.

## The rules

### <a id="EL-01"></a>EL-01 — the admission test lives on the row (`script`)

> A ticket is an enhancement when `scope_origin = 'enhancement'`, and it is admitted — buildable at all — only when its own row passes the admission test: `scope_rationale` names the charter goal it advances, `enhancement_claim` names the platform scoreboard metric it will move and in which direction, and `predicted_cycles` states its displacement cost; reversibility is by construction (before-images, M6-02). The row is the verdict — no card, no Accept (M6-04).

Four parts of the proposed five-part test were already columns or structural facts:
`scope_rationale` (`SES-295`), `predicted_cycles` (`FILE-MATRIX`), before-images plus the `M6-02`
window. The one new column is **`enhancement_claim`** — the metric and direction — which is also
exactly what `SES-303`'s outcome telemetry reads back. Enforced in `drain_epic_next()` and
`prime_directive_queue()` (migration `ses283_enhancement_lane`, the `SES-305`/`SES-295`
anchored-replace pattern); `runner_should_boot()` and `drain_chain_gate()` inherit.

### <a id="EL-02"></a>EL-02 — the weekly cap, John's number in one home (`script`)

> Enhancement work may consume at most 20% of the weekly usage allowance (John, 2026-09-02; `runner_settings.enhancement_cap_pct`): the pick path refuses an admitted enhancement whose `predicted_pct_of_week`, added to the `predicted_pct_of_week` of every enhancement a cycle has started in the current weekly window, would exceed the cap. The cap binds enhancements only — chartered work is never held by it.

`public.enhancement_week_spent_pct()` sums `predicted_cycles × runner_pct_per_cycle()` over
enhancements a cycle started since `public.enhancement_week_start()` — the meter's observed reset,
Friday 07:00Z (the `2026-08-28 07:00Z` anchor the accounting review measured against). **Stated so
it is not assumed:** an attended session writes no `runner_cycles` row, so attended enhancement
work does not count toward the cap today; that is the same attribution gap `M5-11`/`M5-13` name,
not a second rule. The number lives in `runner_settings.enhancement_cap_pct` (20); changing it is
one `UPDATE` with a before-image, never an edit here.

### <a id="EL-03"></a>EL-03 — the promotion path (`reviewer`)

> An enhancement whose `enhancement_claim` has held twice under the outcome verdicts of SES-303 earns a chartered milestone: the next gate review (SES-179) names it a member of the milestone it serves. Until then it remains an enhancement and stays under the cap.

Two held claims, not one: a single good week can be noise. Promotion goes through the gate review
because the charter's closure discipline says only a gate review adds members to a milestone —
*"batched and visible to John, never a cycle's solo close-out call."* `SES-303` is the instrument;
until it ships, no enhancement can be promoted, which is the honest state.

## Dispositions this lane governs today

**The invention pass is this lane's producer (`SES-160`, `v7.0.414`).** `docs/runbooks/runner-cycle.md`
step 4b's daily pass is the row's only writer: `public.file_invention_proposal()` files a proposal
and its own `record_decision()` in one transaction, admitted or rejected on the row exactly as
`EL-01` states — pace and the epic link are `runner_settings` columns (`invention_floor_days`,
`invention_per_rung_per_day`, `invention_requires_epic`), never literals. `LOG-143` (the Bench
Report Card) was the first row through, ratified under the M7 gate's first-feature exception
(decision `05cc2722`) rather than by this lane's ordinary window — every later proposal is ratified
by its own 72-hour window like any other decision, with no exception and no card.

| Ticket | Disposition under EL-01 |
|---|---|
| `SES-234` "Every operational default becomes a rules-registry row" (no epic) | Not admitted: no `enhancement_claim`, no `scope_rationale`. Writes them → admissible. |
| `SES-235` "M8 design gate: the mission auditor" (no epic) | Not admitted, same two gaps. An M8 milestone is a promotion-path outcome (EL-03), not a filing. |
| The `FILE-MATRIX` / `ticket_matrix` cost subsystem | No longer "chartered by nothing": `M5-03` and `M5-04` (amended 2026-09-02) are its charter. |

## Related registers and files

| Where | What it holds |
|---|---|
| `public.governance_rules` | **Authoritative.** The three rows this file renders. |
| `docs/governance/RULES-SNAPSHOT.md` | Generated repo-side copy. Never hand-edited. |
| `docs/RUNNER-GOV-M5-REQUIREMENTS.md` | The scope fence, review bucket and promotion criterion this lane is the exception to. |
| `docs/RUNNER-GOV-M6-REQUIREMENTS.md` | `M6-04`: admitted or rejected by this test, never by a card. |
| `docs/SELFBUILD-CHARTER.md` | Goal 6 (self-growing) and the closure discipline the promotion path answers to. |
