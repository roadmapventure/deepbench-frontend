<!-- DeepBench v7.0.130 | docs/harvests/SES-86.md | SES-86 — the queue engine, phase by phase -->

# `SES-86` — the queue engine (register B3–B6, B10, B15)

The ticket's own description is capped at 2000 characters (`check-session-docs.js` check 3d), so
the per-phase detail lives here and the description carries a pointer. Nothing is deleted — each
phase appends.

---

## Phase 1 — claim-on-pick (`v7.0.127`, 2026-08-21, attended session `automation-review`)

John's design, live in chat: *"as soon as you pick up a ticket … the next session skips to the
next."* One adjustment was put to him before his "yes, ship it" — **claim columns rather than a
status overwrite**, so an abandoned ticket recovers its original status instead of being stranded
in a synthetic one.

Shipped: `claimed_by` / `claimed_at` columns (migration `ses86a_backlog_claim_on_pick`); an atomic
single-statement claim at pick time in `runbooks/runner-cycle.md` step 5 and
`session-setup` step 2c; selection filters claimed tickets; a 24-hour expiry so a dead session
cannot strand a ticket. QA proved all three arms on real rows: fresh claim → 1 row, contested →
0 rows, 25-hour-stale → re-claimable. Register B40.

**Why it exists:** manual sessions and scheduled cycles share one board, and on 2026-08-21 they
collided — `SES-95` shipped attended while a runner cycle was carding the same work.

---

## Phase 2 — materialized queue numbers, register B4 (`v7.0.130`, 2026-08-21, Automated cycle `6b078b06`)

**What shipped.** `backlog_items.queue` (integer, nullable) and
`public.recompute_backlog_queue()` — one idempotent full renumber, `security definer`, no public
execute grant (migration `ses86b_backlog_queue_numbers`). B3's ordering is copied clause-for-clause
from the retired step-5 selection query, with all five documented traps preserved and repeated in
the migration header so they travel with the code. Wired to two of B4's recompute events:
`runner-cycle.md` step 5 (pick) and step 7 (completed/removed); step 9's "Next up" now reads real
numbers instead of recomputing the sort per render. `queue IS NULL` **is** the not-pickable
condition, so the selection filter can no longer drift from the numbering.

**Two deliberate properties.** The renumber never touches `updated_at` — stamping every row would
destroy the sort-field-edit signal the recompute is triggered *by*, and would churn
`BACKLOG-SNAPSHOT.md` on cycles that changed nothing. And a claim does not affect the number: a
claimed ticket keeps its position while a session works it, so John's view does not shuffle.

**The QA failure, which is the phase's most useful output.** The first idempotence check read
`550 → 0` and looked clean. It was luck. After filing a genuinely new ticket the sequence read
`435 → 2 → 0` — two rows moving on a board where nothing had changed. Root cause: `backlog_id`
carries **no unique constraint**, `CHI-48` occupies two rows identical on all five sort keys, and
`row_number()` is therefore **non-deterministic** for that pair. Fixed by appending the primary
key `id` as a sixth, absolutely-unique final tie-break
(`ses86b_queue_deterministic_tiebreak`) — which changes no position that was ever well-defined and
only decides ties that previously had no defined answer. Re-verified: one settle run of 2, then
six consecutive recomputes at 0.

> **Keep this lesson.** A single "second call returned 0" is not an idempotence proof on a board
> that has not changed shape. The discriminating test is: **insert a real row, recompute, then
> recompute again.**

**Evidence.** 551 tickets numbered `1..551`, no gaps or duplicates; 0 ineligible numbered, 0
eligible unnumbered; 0 class / tier / beta inversions; queue order identical to the retired
five-clause query joined on the primary key (0 mismatches); exactly one `recompute_backlog_queue`
in `pg_proc`; `backlog_items` holds zero `anon`/`authenticated` grants before and after. Negative
control: numbering the same rows lexically yields 17,616 class and 81,281 tier inversions against
the shipped function's 0. `updated_at` proven untouched across a 435-row renumber. Build green,
regression 31/31.

**Filed, not fixed:** `SES-97` (`P9 - Bug Fixes`) for the `CHI-48` duplicate — deciding whether it
is one ticket to merge or two needing a fresh ID is a content judgment, and the unique constraint
that would stop a recurrence is a schema change on a live table that wants its own build.
Independently corroborated by `check-session-docs.js` check 3f, which flags the same duplicate.

**Remaining in `SES-86`:** B6 lifecycle status, B5 John's pins, B10 `filed_at` mined from git.
Also outstanding: adding `queue` to `BACKLOG-SNAPSHOT.md`'s explicit column whitelist, and
`session-setup`'s manual-session recompute call site — a `.claude/` edit, which an unattended
cycle does not enter (`runner-cycle.md` step 0), so it needs a session John attends.
