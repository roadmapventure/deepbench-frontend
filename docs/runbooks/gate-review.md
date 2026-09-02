<!-- DeepBench v7.0.367 | runbooks/gate-review.md | SES-289 — THE ONE B34 CITATION IN THIS FILE IS ANNOTATED, and the thing to read twice is THAT NOTHING ABOUT THE GATE REVIEW'S OWN PROCEDURE CHANGED. SES-285 superseded B34 by M6-07 on 2026-09-01; the card block's claim — an Accept on a gated_before_build card is permission, not a rating, and touches no ladder rung — is still true, still John's "no", and still enforced in SQL by public.apply_ladder_decision(), which short-circuits every gated row. B34 was right and stays right; what the supersession changed is that its subject no longer arrives, and M6-07 is built on B34's reasoning rather than reversing it. So this marker records the rule's STATE, not a change of instruction. THE EDIT THIS FORBIDS: reading the marker as licence to rewrite the gate review to stop filing a card. That rewrite belongs to SES-286's reversal window and is a separate ticket; annotating says "this rule is withdrawn, M6-07 replaces it", rewriting says "here is what to do instead", and only the first is safe today. Before this ship the truth tripwire read this file's line 94 as a withdrawn rule stated in live voice — one of 14 gating FLAGs across three runbooks that turned CI red on every push. After: "GATE: clear", exit 0. Stamp count 2 of 5 per session-hygiene check 7, so no rotation was owed here. Doc-only: no src/api/lib change, no site change, no schema change, no migration, no registry write. -->
<!-- DeepBench v7.0.220 | runbooks/gate-review.md | SES-179 — NEW FILE: the milestone gate review, John's directive 2026-08-23. Two governance-lane reviewer agents (PM lens + Chief Architect lens) run with fresh context at each epic retirement and file ONE joint verdict as a gated card. FOUND LIVE while building it, and it is why this is not a mechanism built ahead of need: TWO milestone drains had ALREADY retired ungated — 01758f26 (Selfbuild M0, done, retired by cycle e42f8d4e) and 69e61a6c (Selfbuild M1, done, 4b874066), both 2026-08-24 — while docs/SELFBUILD-CHARTER.md named SES-179 gate reviews in nine places, including as the project's own exit exam. THE ONE THING AN EDITOR MUST NOT COLLAPSE: a review PROPOSES successor members and John's Accept FILES them (charter §Closure discipline item 3, verbatim: "never a cycle's solo close-out call"). A review that filed its own successors would turn a check ON the runner into a widening OF it, and drain_epic_next() property 5 — nothing creates a drain row but John — stands untouched behind it. The trigger is a SWEEP over evidence, never a branch on drain_epic_next()'s return value: that function has two call sites (step 5 and step 9 Gate B) and since SES-189 one call may retire more than one directive while returning only the last, so a call-site branch misses retirements by construction and could never have caught M0/M1 at all. -->

# Milestone Gate Review — the procedure (`SES-179`)

**What it is.** At every epic retirement, two governance-lane reviewer agents read the retiring
milestone with **fresh context** and file **one** joint verdict as a `gated_before_build` card on
John's briefing. It is the charter's item 7 under *Multi-agent verification*, and the mechanism
its §Closure discipline depends on.

**Who triggers it:** `runner-cycle.md` **step 8d**, a Phase-3 sweep. That step owns *when*; this
file owns *what* — cited there, never restated, so the two cannot drift the way step 5 and step 7
did before `v7.0.114`.

**Governance-lane roles, never product roster agents** (charter §7, verbatim). These reviewers are
runner-lane lenses. Do not reach for `src/data/agents.js`; nothing here touches the bench.

---

## The three directions — all mandatory

A review that skips one is not a review. Charter §Multi-agent verification item 7:

| Direction | The question | Evidence it must cite |
|---|---|---|
| **Backward** | Does the retired milestone's shipped work actually satisfy the charter sections it claimed to satisfy? | Ship SHAs, `runner_items` ship cards, the charter section by name — a charter-conformance audit of completed work (John, 2026-08-23) |
| **Present** | Does every rule retired this milestone have its replacement **live and green**? Net burndown reported. | `docs/SELFBUILD-RETIREMENT-LEDGER.md`, test/CI output, the burndown query below |
| **Forward** | Does the next milestone's design still fit **measured** reality? | The next epic's members, and what this milestone actually measured |

The **backward** direction is the one most easily reduced to a checklist of "did the tickets
close". It is not that question. Tickets closing is `open_now = 0`, which the drain already proved
before it retired; the review asks whether the *charter claim* those tickets stood for is now true.

## The two lenses

Run both, **in parallel, with fresh context**, via the `Agent` tool. Model per `runner-cycle.md`'s
model discipline (register B21): this is judgment-dense work — **Fable 5** (`claude-fable-5`).
State the clone's absolute path in each prompt (a subagent given a bare task defaults to the
discoverable-but-wrong shared checkout), and tell each to read `docs/SELFBUILD-CHARTER.md` and
`CLAUDE.md` as part of its own bootstrap rather than hand-enumerating today's decisions into the
prompt.

- **PM lens** — members delivered vs. named, slippage, whether the estimates that shaped the next
  milestone still hold, net burndown.
- **Chief Architect lens** — does the next milestone's design still fit what this milestone
  measured; which of its assumptions were disproved; what should change before it is drained.

**A reviewer cannot edit and cannot approve.** Verdict-only, fresh context, never the author's
conversation (charter §Multi-agent verification item 1). **A subagent that has not returned is not
a result** (`SES-83` (d) cycle 4): either wait for both lenses or file the card saying which lens
is missing and why — never convert a silent agent into a finding.

**Disagreement between the lenses is a result, not a problem to resolve.** Put both positions on
the card in their own words. A synthesized consensus that papers over a real split is worth less to
John than the split itself, and he is the one who decides it.

## Net burndown — the number the review must report

Closed vs. filed for the retiring milestone. `runner_drain_scope` holds the members John **named**
at declaration time (`SES-142`), so "filed" is exactly the epic's rows that are not in that scope:

```sql
-- Net burndown for a retiring milestone. Pass the retired drain's directive id.
SELECT e.name AS milestone,
       count(*) FILTER (WHERE s.item_id IS NOT NULL)                          AS named,
       count(*) FILTER (WHERE s.item_id IS NOT NULL
                          AND b.status IN ('done','removed'))                 AS named_closed,
       count(*) FILTER (WHERE s.item_id IS NULL)                              AS filed_since_naming,
       count(*) FILTER (WHERE s.item_id IS NULL
                          AND b.status NOT IN ('done','removed'))             AS filed_still_open
  FROM public.backlog_items b
  JOIN public.epics e            ON e.id = b.epic_id
  JOIN public.runner_directives d ON d.epic_id = e.id AND d.id = '<retired directive id>'
  LEFT JOIN public.runner_drain_scope s
         ON s.item_id = b.id AND s.directive_id = d.id
 GROUP BY e.name;
```

**Filing faster than closing is a flag on John's page** (charter §Closure discipline item 4) — so
report `filed_since_naming` even when it is zero, and never net it away against `named_closed`.
Two figures, not one: they measure different things, and a single "net" number hides which.

**`delivered` is deliberately not counted as closed.** It means the runner finished and John has
not yet accepted (`SES-154`), and a review that counted it would be scoring the milestone on the
runner's own say-so — the same authorisation boundary that keeps `delivered` out of
`drain_epic_next()`'s retirement predicate.

## The card

One card per retirement. Built exactly like any other `runner_items` row (`runner-cycle.md` step
9), with three fields that are specific to this kind:

- **`kind = 'gated_before_build'`.** Forced, not chosen: `runner_items_kind_check` admits exactly
  `'ship'` and `'gated_before_build'`. The semantics are also the right ones — an Accept on a gated
  card is **permission, not a rating**, and touches no ladder rung (register B34 — superseded
  2026-09-01 by `M6-07`, `SES-285`, annotated `SES-289`; B34's reasoning is what `M6-07` is built on
  and `apply_ladder_decision()` still enforces it, so this semantics claim is unchanged — John's
  "no"). A
  gate review is precisely that transaction: the runner did not build the next milestone's members
  and is asking whether they may be filed.
- **`backlog_id = NULL`, `display_ref = '<Epic name> — milestone gate review'`.** A gate review is
  not about one ticket, and `ck_runner_items_backlog_id_bare` rejects a composed string outright
  (`SES-116`).
- **`epic_id` = the retiring epic.** This is the key step 8d's sweep joins on; without it the card
  is invisible to the sweep and the same review is filed every cycle, forever.

The card carries the three directions' findings, both lenses in their own words, the burndown
figures, and — separately and explicitly labelled — **proposed successor members for the next
milestone**, each with the evidence that earns it a place.

The plain-language columns are required like any card (`plain_cant` / `plain_after` /
`plain_worth`, `v7.0.146`), and a ticket named anywhere John reads it carries **ID + title** via
`public.backlog_display_title()`, never a bare id (`SES-119`).

## What a review must never do

1. **File a successor member itself.** Charter §Closure discipline item 3: gate reviews are the
   only path for adding members to a later milestone, *"batched and visible to John, never a
   cycle's solo close-out call."* The review writes **no** `backlog_items` row and **no**
   `runner_drain_scope` row. His Accept on the card is what files them.
2. **Create, activate, or extend a drain.** `drain_epic_next()` property 5 stands untouched:
   nothing creates a drain row but John's own declaration. A review may observe that the next
   milestone looks ready; it may never start it.
3. **Adjudicate the retirement.** The drain retired because every **named** member closed. A review
   that re-argues whether it should have retired is re-deciding a settled predicate; what it may
   say is that the milestone's charter claim is *not* satisfied — which is a finding for the card,
   and John's to act on.
4. **Run more than one review per cycle.** Step 8d takes the oldest un-reviewed retirement and
   stops. Two reviews in one cycle is two builds.
