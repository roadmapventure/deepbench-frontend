<!-- DeepBench | docs/harvests/SES-385.md | Filed 2026-09-12 by a runner cycle; widened 2026-09-15 by attended session status-0915 on John's word; slice-1 design measurements appended 2026-09-16 (v7.0.506, cycle a3ca85bb). The backlog row's description is the pointer; this file is the whole text, moved here under the 2,000-character description cap. -->

# SES-385 — A shipped part must not hide unbuilt work

**P10 - Tooling**, serves **P2 - Inventive**. Project Moat Support (from no project, 2026-09-15). Scope origin: discovered.

## John's words (2026-09-15, status walkthrough item 4)

*"go, but also note, the dev manager should have approved this without my interference. Make that happen too."*

## Measured 2026-09-15

- **SES-378** shipped slice 1 of 2 (v7.0.488, verdict block) and was written `delivered`. Its part 2 ("Carried forward to cycle 2" in `docs/harvests/SES-378.md`) could not be picked, because a delivered ticket is stepped past at step 5 and excluded from drain picks.
- **SES-396** shipped slice 1 (v7.0.495, verdict block) and was written `delivered`. Its remainder was carded as `runner_items` `cacf877e`, and the `ds-knowledge-environment` Skill it describes still does not exist.
- **AGT-79** shipped slices 1-3 and its code half (v7.0.480) and was written `delivered`. Remainder (A), the judgment run, never ran: 179 `ticket_owner_findings` rows sat at verdict `judgment` in the 04:44 CT census, with no `ticketowner` model call logged in the preceding four days.
- **The design flag.** All three still carried `design_status = 'designed'` with the spent `kickoff_link`, so a plain re-open would rebuild part 1 (step 6 fast path, SES-114).
- **Re-opened by hand.** Session status-0915 re-opened all three the same day: `partial`, `design_status` cleared, `kickoff_link` kept.

## Original ticket text (filed 2026-09-12, preserved verbatim)

**P10 - Tooling.** FOUND LIVE 2026-09-13, twice in one session. `design_status = 'designed'` means "the design already exists — build from `kickoff_link`, do not re-design it" (runner-cycle.md step 6 fast path, `SES-114`). On a MULTI-SLICE ticket that becomes false the moment a slice ships, and nothing writes to the row: the ticket keeps `designed` and keeps pointing at a kickoff whose every task is built and pushed. EVIDENCE, both from cycles in one session: (1) `AGT-70` was the queue's first row at 00:47Z carrying `designed` + `docs/kickoffs/v7.0.469-AGT-70-auditor-controls-and-week-two.md`, a kickoff that declares itself "slice 4 of 4" and had shipped at `a66cf33`; the fast path would have built it again, and only a revalidation that read dev's git log caught it. (2) `AGT-79` shipped slice 1 of 3 at `b70ebadd` (v7.0.474) and its row still read `designed` + the spent slice-1 kickoff one cycle later; cleared by hand under decision. THE FIX IS NOT "clear it at close-out" WITHOUT THINKING: the flag is also leg 2 of the `SES-345` handoff contract (`ship_handoff_census.has_kickoff` reads `kickoff_link IS NOT NULL`), so nulling the link would break a census that just reached 1-of-44 for the first time, and `SES-112`'s CHECK `(design_status <> 'designed' OR kickoff_link IS NOT NULL)` binds the pair. SCOPE: decide what `designed` should mean on a partial — candidates are (a) the close-out clears `design_status` whenever it writes `partial`, leaving `kickoff_link` alone (what was done by hand here, and it keeps the census leg intact), (b) a `slices_shipped` / `kickoff_spent_at` column so the flag can say "designed THROUGH slice N", (c) the fast path reads whether the linked kickoff's version is below the ticket's last shipped version. Whichever lands, 28 closed rows also still carry `designed` (measured by `AGT-79`'s own census as check `designed-closed`), so the same question covers them. NOT IN SCOPE: `AGT-70` and `AGT-79` themselves, both already handled.

## Build (widened 2026-09-15)

1. **Close-out.** When a cycle ships a slice and its own record names unbuilt work (a remainder list, a gated card, or "slice N of M" with N below M), write `partial`, never `delivered`, whatever the verdict. Clear `design_status` and keep `kickoff_link` (candidate (a) above). A block verdict still resets the class streak and still refuses the ship decision.
2. **The Ticket Owner** (GV-08) nightly census gains a check, `remainder-stranded`: a delivered or done row whose last cycle notes, or an undecided gated card, name unbuilt work.
3. **Its findings feed SES-402's finding rows.** The Development Manager re-opens such a row itself (`partial`, `design_status` cleared, `predicted_cycles + 1`) under one reversible decision, with no card to John (John, above).
4. **Closed rows still carrying `designed`.** The 35 found by the Ticket Owner's `designed-closed` check in the 2026-09-15 census are settled by the same rule.

## QA that discriminates

A fixture slice ships with a block verdict and a declared remainder: the row reads `partial` with `design_status` NULL, and the next pick designs part 2 instead of re-running the spent kickoff. Negative control: a single-slice ship with a block verdict still writes `delivered`. The census flags a delivered row whose notes name a remainder, and does not flag one whose notes do not.

---

## Slice-1 design, measured 2026-09-16 (v7.0.506, cycle `a3ca85bb-b687-40d1-9762-c8a6bca7a9b9`)

### Premise revalidation — ALIVE, and worse than filed

Every claim was re-measured against live code and data this cycle; none was taken from the ticket.

1. **The close-out still never writes the flag down.** `docs/runbooks/runner-cycle.md`'s close-out bullet is explicit that "THE STATUS YOU WRITE IS `delivered`, NEVER `done`" and carries clauses for the claim, the queue recompute and the `SES-320` delivered-exit — and **no clause at all that touches `design_status`**. Nothing in `scripts/` writes it at ship either.
2. **A live instance exists right now.** `SES-396`: `status = 'delivered'`, `design_status = 'designed'`, `kickoff_link = docs/kickoffs/v7.0.504-SES-396-designer-knowledge-row.md`. That is the ticket's exact shape, on a row that shipped after the ticket was filed — so the defect is still producing new instances, not just leaving old ones.
3. **The closed-row backlog has grown.** 47 closed rows carry `designed` (32 `done`, 15 `delivered`), every one with a non-null link. The ticket cited 35 on 2026-09-15 and 28 when first filed. The trend is the argument for shipping the close-out rule (part 1) before the retroactive cleanup (part 4): cleaning first would be cleaning into a still-open tap.
4. **The three cited rows.** `SES-378` and `AGT-79` now read `partial`, `AGT-70` reads `done`; all three carry `designed` again with *newer* kickoff links (v7.0.503 / v7.0.505 / v7.0.485), i.e. they were re-designed and re-shipped since the hand re-open. Their present state is correct-by-cycle, not evidence against the premise.

### The candidate-(a) safety check, measured rather than reasoned

The ticket warns that nulling `kickoff_link` would break the `SES-345` handoff census. Verified directly:

- `public.ship_handoff_census` is a **VIEW**; its definition contains `kickoff_link` and does **not** contain `design_status`.
- `ck_design_status_kickoff` = `CHECK (((design_status <> 'designed') OR (kickoff_link IS NOT NULL)))`.
- `ck_design_status_values` allows `NULL` among `auto | needs-john | needs-desktop | designed | john-paced | needs-decision`.

So clearing `design_status` to NULL while keeping the link satisfies the CHECK and leaves the census leg untouched. Candidate (a) is the cheapest of the three and the only one needing no schema change; (b) wants a new column, (c) wants the step-6 fast path to parse kickoff versions. (a) wins.

### Why the census check is NOT a notes regex — the rejected variant

The widened build text says the check should read "the last cycle notes". Measured over the real board, a whole-`notes` regex on `(remainder|carried forward|slice N of M|…)` flags **39 of 159** `done` rows — and the sample is dominated by false positives: the word "remainder" appears inside step-0 sweep prose, inside citations of *other* tickets' remainders (`SES-176`, `SES-245`), and inside header stamps. A check with that precision would file ~39 judgment findings a night and be ignored, which is how a census check dies.

The structural signals actually discriminate:

- `ticket_matrix.actual_cycles < backlog_items.predicted_cycles` on a closed row — the ticket's own quote says the work is unfinished. 85 closed rows (74 `done`, 11 `delivered`); **29** of those also carry `designed`, which is the exact intersection SES-385 is about.
- an undecided `runner_items` card of kind `gated_before_build` — only **4** are undecided platform-wide (against 83 undecided `ship` cards, which are merely awaiting John and must NOT count).

Both are already in reach of `classifyBoard`: `cycles` is built from `board.matrix`, `row.predicted_cycles` is on the item, and the `accepts` read already hits `runner_items`. This is a **named deviation** from the harvest's part-2 wording (notes-prose → structural signal), taken on measurement and recorded here.

### Scope: this is slice 1 of 2

`predicted_cycles` is 2 and the four build parts do not all fit one cycle:

- **Part (3) is blocked, not deferred by preference.** It requires `SES-402`'s finding rows for the Development Manager to act on; `SES-402` reads `status = 'open'`, `design_status` NULL, `predicted_cycles` 3. Nothing to build against.
- **Part (4) is a retroactive data pass** over 47 rows under a reversible hygiene decision. It belongs after the tap is closed (part 1) and is the natural companion to part (3)'s re-open path, which is what should process those rows.

Slice 1 is therefore parts (1) and (2): stop creating stranded rows, and start counting the ones that exist. 5 files, 6 tasks, against caps of 16 / 17 — well inside, because the cheapest variant that proves the claim is the one that wins, not the one that fills the cap.

### Constraints the Builder must not rediscover

- `docs/runbooks/runner-cycle.md` is **380,873 bytes**; `tests/regression/ses-336-runbook-orchestration.test.mjs:87` pins `SIZE_CEILING_BYTES = 381_000`. **127 bytes of headroom** — the close-out edit must free bytes before adding them.
- `tests/regression/agt-79-ticket-owner.test.mjs:269-271` hard-pins `CHECKS.length === 11` and `CHECKS[10] === "cycles-over-quote"`. A 12th check turns that test red until it is updated — which is a feature, and is used as the discriminator.
- The same test at line 788 re-runs `scripts/render-cycle-card.js` and fails if `docs/runbooks/cycle-card.md` is stale against the edited runbook. Runbook edit and card re-render are one commit.
- Baseline (`node scripts/baseline-red-set.js`): `Red set: 0 of 2` on `agt-79-ticket-owner.test.mjs` and `ses-336-runbook-orchestration.test.mjs`. Suite on dev's head is **232 of 233**, single FAIL `tests/regression/agt-70-auditor.test.mjs` (`SES-404`) — pre-existing, not this ship's, and explicitly not to be greened to make this ship pass.
