<!-- DeepBench v7.0.1004 | runbooks/redesign-after-refusal.md | AGT-642 — door (d): redesign-first fires ahead of any new pick. -->
<!-- DeepBench v7.0.977 | runbooks/redesign-after-refusal.md | AGT-610 — a refused ticket is redesigned twice, then diagnosed (John, standing decision 6e94edcb, 2026-11-05). -->

# Redesign after a refusal — the call path

## 1. What this is

The procedure a cycle follows when the platform's auto-mode safety check **refused** a build step:
the ticket is parked (`needs-desktop` / an unresolved `permission-gate` skip), the **team** redesigns
it by risk, at most **two different attempts**, and then **one diagnostic** that changes nothing.

John's words on the limit (attended session `routine-review-1104`, 2026-11-05): *"yes, but give them
permission for 2 attempts, and the second attempt is different than the first. i want more data why
it got blocked if it does not make it"*. On who runs it: *"their goal is to keep me from being part
of the loop - they make devleopment happen without me"*.

**Clause 4, verbatim:** "Never: retrying the identical refused action, routing the same action
through a different tool, or wording a step to avoid the check. Those remain forbidden (CLAUDE.md
SES-019)."

**Clause 7, verbatim:** "Still John's alone: spending money, dev->main, creating or changing agents
and their permissions."

Nothing in this procedure widens an agent's permissions: the redesign runs on the `design-kickoff`
capability the Designer already holds, with a `redesign` key in `task_context`.

## 2. Where it is entered

There are three doors and a cycle meets each of them where it already looks:

- **(a) `find-work-only` fires** (`runner_should_boot()`'s `detail.mode`): the cycle card's `gate`
  note reads `should_boot true → step 0; find-work-only → redesign-pickup.js --next; false →
  did_not_run`. Run the pickup **first** — before the ordinary find-work pass — because a refused
  ticket the ordinary pick re-selects rebuilds the same kickoff and meets the same refusal.
- **(b) a Builder refusal at step 7**: `record_skip()` **refuses the bare call** for
  `permission-gate` with a `23514` that names the nine facts and this file. That refusal is the hook;
  `docs/runbooks/runner-cycle.md` is untouched (380,973 of 381,000 bytes — 27 bytes is not a step).
- **(c) after a second refusal**: `--diagnose`, and nothing else.
- **(d) `redesign-first` fires** (`AGT-642`, John's standing decision `f8e2a234`, 2026-11-11: a
  blocked ticket stops the line). `runner_should_boot()` answers `redesign_due` — below every spend
  wall, the database gate and `lanes_full`, but **ahead of any new pick** — and names the ticket in
  `detail.redesign_ticket` (`public.redesign_due_ticket()`: `refusal_parked_tickets()` minus a ticket
  whose gate card was ruled John's and minus one a redesign cycle was handed in the last 24 hours).
  Set `last_step` to `redesign: <that id>` FIRST — that is the cooldown marker, so a pickup that ends
  without an attempt lets the next parked ticket have its turn — then run `--next`, which takes that
  same ticket, and continue at section 3. Undecided gate cards come before this: `rule-cards-only`
  now fires with work pickable too (2-hour retry, `last_step` `rule-cards: <n>`).

## 3. The pickup (`--next`)

```
node scripts/redesign-pickup.js --next [--out=<task.json>]
```

The candidate is **row 1** of `refusal_parked_tickets()` (ordered `need_score desc`, then `queue`,
then id). The task file carries the ticket row and a `redesign` block — `attempt_no`, `basis` (the
latest unresolved skip's own reason text), `never_send` (every action already refused on this
ticket), `kickoff_link`. Exit 3 means the file is written and the Designer's answer is awaited.

Run the Designer exactly as runbook **step 6** — `node scripts/agent-prompt.js --agent=designer
--capability=design-kickoff --intent=ds-kickoff-intent --task-file=…`, on the `judgment` lane read
live from `runner_model_lanes`, logged with `scripts/agent-log.js`. Three outcomes:

1. **A kickoff** carrying a `risk` block and a `Redesign:` line → `--open`, then
   `node scripts/commit-kickoff.js`, then step 7 as for any ticket.
2. **A cap case** (`premise alive`, `kickoff_markdown`/`kickoff_path` null, the parts in build order
   in `harvest_markdown`) → `node scripts/rule-cap-case.js --prepare` / `--apply`, exactly as step
   5a. The Development Manager rules it split or waive; a split's parts are filed first per step
   8b-bis and enter the queue normally.
3. **Premise dead** → removal proposed, as step 6.

A Designer/Development-Manager disagreement is recorded **on the Manager's ruling** (a reversible
decision with a handle) and shows in the brief. **A team ballot needs a capability John has not
created — that is a clause-7 act and it is his alone.**

## 4. The attempt (`--open`)

```
node scripts/redesign-pickup.js --open --ticket=<id> --cycle-id=<uuid> --kickoff=<path>
```

**Before the build runs, never after it.** The script reads the kickoff's own SESSION line —
`- **Redesign:** attempt N; differs: staging|scope|mechanism; because: <engineering reason>; from
prior: <what changed>` — and sends it to `open_redesign_attempt()`.

Attempt 2 must **differ** from attempt 1 in staging, scope or mechanism, with its own engineering
reason (smaller reach, easier undo, risky part separated) — never "so the check passes". The
function refuses an attempt 2 whose `(reason, differs, diff_from_prior)` triple repeats attempt 1's,
and refuses a **third** attempt outright: *"two redesign attempts exist -- the only step left is
close_refusal_diagnostic()"*.

## 5. The refusal (`--refuse`)

```
node scripts/redesign-pickup.js --refuse --ticket=<id> --cycle-id=<uuid> --from=<json> --dry-run
node scripts/redesign-pickup.js --refuse --ticket=<id> --cycle-id=<uuid> --from=<json>
```

The moment the classifier refuses the Builder, capture **all nine** facts (clause 5) into the JSON:

| key | what it holds |
|---|---|
| `refusal_text` | the exact refusal, verbatim |
| `refusal_label` | the label in square brackets, e.g. `[Production Deploy]` |
| `action_sent` | the action **as sent** — tool, command or sub-agent task text |
| `run_minutes` | minutes into the run |
| `run_turns` | turns into the run |
| `earlier_refusals` | refusals earlier in the same run |
| `model` | the model the refused turn ran on |
| `reach` | the `reach` field of the kickoff's `risk` line for that task |
| `undo` | the `undo` field of the same line |

`--dry-run` first: it validates all nine and guard 4 and **sends nothing**. Then the real call, which
goes through `rpc/record_skip` with `p_reason_kind: "permission-gate"` and `p_refusal`.

**Never `record_skip('permission-gate')` bare** — it is refused, and that refusal is deliberate.
**Do not retry anything.** An `action_sent` byte-identical to one already refused on this ticket
sets `identical_to` and parks the ticket on guard 4.

## 6. The diagnostic (`--diagnose`)

```
node scripts/redesign-pickup.js --diagnose --ticket=<id> --cycle-id=<uuid> --unknowns-file=<path> [--no-send]
```

**Only after the second refusal**, and it is John's AMENDMENT: the third step is **diagnosis, not a
third try**. Write `unknowns` — what the two samples do **not** tell you about the boundary — to a
file. The script assembles both attempts in full, attempts Anthropic `/feedback` through the Claude
Code CLI, records whatever came back in `feedback_result`, and parks the ticket.

The `/feedback` filing is **attempted and its result recorded — never asserted as done.** A
`not sent (--no-send)` or `spawn error: …` result is a result; the brief then prints the text
paste-ready instead of claiming it was filed.

**No third build, no other tool, no reworded step.** QA: `close_refusal_diagnostic()` writes nothing
to `backlog_items` — its body references `runner_refusal_attempts` and `runner_before_images` and
nothing else, and the fixture's `updated_at` is unchanged after it runs.

## 7. The brief

The `Redesign after refusal` group in `scripts/render-standing-brief.js` reads
`refusal_ledger_brief()` and renders one row per ticket — attempts, state, last refusal, feedback.
**Information only** (clause 6): it is never a card John must act on. Its state is **derived** —
`shipped` from `backlog_items.status`, everything else from the ledger — so nothing can disagree
with itself.

## 8. Undo

Every write carries a `runner_before_images` row owned by the cycle that made it:

- the attempt rows — delete the row and its image; an attempt is not a decision;
- the Knowledge addendum and the cycle-card re-pin — `select public.reverse_decision(<id>, 'John',
  '<why>', NULL);` (the image carries the FULL prior row, so the undo is a restore);
- the DDL — the migration's captured down, `runner_migration_downs` row `agt610_refusal_ledger`
  (classification `auto-downable`, captured **before** the up ran).
