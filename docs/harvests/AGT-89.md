# AGT-89 — the Prioritizer's rank and the picker's keys are two layers

Reasoning, measurements and alternatives for `docs/kickoffs/v7.0.567-AGT-89-board-order-two-layers.md`.
The build reads the kickoff and the ticket, never this file.

## 1. Premise revalidation (live 2026-09-24, cycle 280fdda4)

All four claimed defects are still present in the live tree at `origin/dev@2671683` and in live Supabase:

| claim | checked | result |
|---|---|---|
| `recompute_backlog_queue()` coalesces `filed_at` | `pg_get_functiondef` | **present**, in TWO `ORDER BY` keys of the `unpinned` CTE; exactly 1 overload (`pg_proc` count = 1) |
| `runner-cycle.md` calls the lane a seventh key above six, domain 1–6 | `sed -n '2586,2589p'` | **present** — the ticket's `:2487` is ~99 lines stale |
| `OD-43` calls it a NAMED CONTRADICTION | census `:447` + `governance_rules` | **present** |
| M5 req calls `predicted_cycles` the last ordering term | `docs/RUNNER-GOV-M5-REQUIREMENTS.md:465–466` | **present** |

### The automation_rank domain is not 1–6

`select min/max(automation_rank), count(*) where automation_rank is not null` → **min −45, max 23, 177 ranked rows**.
Distinct values among OPEN rows: **−35, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 21**.
The negatives are `SES-101`'s front-of-lane slot, `min(open lane) − 1`, which walks downward every time it is
used — so the documented `1–6` domain was never going to hold and the replacement wording must be open-ended
rather than a wider fixed range. This is the detail moved out of the kickoff's §2 to make room for the `Lanes:`
line; the kickoff keeps the load-bearing part (min −45 / max 23 over 177 rows, and why).

### The board is unaffected today

`572` open rows, `0` with a NULL `filed_at`. The coalesce bug is **latent**: no live row changes position when
it is removed. That is why this is a P10 tooling ticket and not an incident, and why the QA has to manufacture
its own NULL row (rolled back) to discriminate at all.

## 2. The full load-bearing argument (compressed in the kickoff)

The live function's own comment justifies the coalesce as protecting old un-filed rows from being buried.
It does the opposite:

- Lane key: `(coalesce(filed_at, created_at) >= date '2026-08-21') asc`. For a NULL `filed_at` with an old
  `created_at`, the expression is `false`, and `false` sorts **first** under `asc` — the pre-cut **priority lane**.
- With bare `filed_at`, the expression is `NULL`, and `NULL` sorts **last** under the ASC-NULLS-LAST default —
  the **tail**, which is the review bucket `M5-02` specifies.

So the coalesce silently **promotes** exactly the rows `M5-02` wants held back for review. Removing it is not a
cosmetic alignment with the rule; it reverses the behaviour the rule is about. Both keys must change together:
leaving the second one coalesced would lane the row correctly and then order it by a date the lane no longer uses.

## 3. Why this is two layers and not a contradiction

`scripts/rank-backlog.js` writes the Prioritizer's ruling into `backlog_items.automation_rank`.
`recompute_backlog_queue()` reads `automation_rank NULLS LAST` as its **leading** key. Therefore:

- **Layer 1** — `pz-rank-intent`'s order (milestone, `supports_class`, class, lane, `predicted_cycles`, queue)
  decides which tickets get a rank and in what order: the **ranked head** of the board.
- **Layer 2** — OD-01's remaining keys order **everything below** the ranked head.

The two orders never compete for the same rows. `OD-43`'s "NAMED CONTRADICTION" framing misreads a pipeline as a
conflict, and the census's own judgment row inherits the error, which is why the amendment has to retire the
judgment text (`:447`) and the register row (`:467`) as well as the statement.

## 4. Alternatives considered and declined

- **Edit `pz-rank-intent.method` so the Intent's order matches OD-01's.** Declined — a visible change to how
  John's `supports_class` preference ranks the head of his board is his call, not a tooling ticket's
  (pattern:84, pattern:89). It stays fenced in the kickoff and is filed as its own `needs-john` row (task 8).
- **Keep the coalesce and amend `M5-02` instead.** Declined — the code, not the rule, is the thing nobody
  intended (pattern:94: live evidence contradicts a locked rule → amend deliberately, in the same session, and
  here the rule is the correct half).
- **Add a NOT NULL constraint on `filed_at` instead of a tripwire.** Declined — a constraint fails the writer at
  insert time in a path this ticket has not surveyed; the tripwire fails the suite instead, which is the
  cheapest thing that proves the claim (pattern:65, pattern:9).
- **Repair the `dm-knowledge-cycle-card` pin drift while re-rendering the card.** Declined — pre-existing, not
  caused by this change (pattern:124 cuts the other way: it is not self-made), so it stays fenced.

## 5. Fences (restated, because both are one-line temptations)

1. Do **not** edit `pz-rank-intent.method`.
2. Do **not** repair the `dm-knowledge-cycle-card` pin drift (`fbe7fb2b340fd4f8` pinned vs `ee9fed6b41616262`
   rendered). Skip `--sync-knowledge`; `--write` alone exits 0.

## 6. Assembly note (SES-359 / SES-376)

The first draft of this kickoff was 8,190 bytes and carried no `Lanes:` line, so `verifier.js --check-kickoff`
refused it `kickoff-no-lanes`. The re-assembly adds `- **Lanes:** session | executor none — no API spend.` to §1
and recovers the bytes from §2 prose only — the open-rank value list and the long form of the coalesce argument
moved here (sections 1 and 2 above). No task, stub definition, baseline red-set line, QA discriminator or stop-line
clause was dropped. Final: **8,125 bytes**, `--check-kickoff` exit 0.
