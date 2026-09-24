# AGT-87 harvest — the runner's cadence stated as numbers instead of as a rule

*Design session, cycle `c9b53290-1fd2-4161-acf5-d6eca1508f06`, 2026-09-24. Reasoning and measurements only; every fact a task depends on is in the kickoff.*

## 1. Premise revalidation — measured, not recalled

Two live reads this session:

- `runner_settings` row 1, via REST with the service key:
  `scheduler_on=true, interval_hours=1, cron_minute=40, grid_tolerance_min=10, updated_at=2026-09-02T23:33:02Z`.
- Routine `trig_017TZ3JZcLBK6AYH6DKURqMH` ("deepbench-runner"), via `list_triggers`:
  `cron_expression = "40 */3 * * *"`, `enabled = true`, last fired `2026-09-24T00:40:27Z`, model `claude-opus-5`.

The prose is wrong in **both** directions at once, which is what makes it worse than merely stale:

| Prose claim | Where | Live fact |
|---|---|---|
| "the cron fires **hourly at :40**" | GOVERNANCE-MODES L22, L107; REQUIREMENTS L27; runner-cycle L683 ("the cron stays hourly permanently"), L4558 | the routine's cron is `40 */3 * * *` — every third hour |
| "`interval_hours` 3 → 12/3/6/9" | GOVERNANCE-MODES L22, L109; REQUIREMENTS L29; runner-cycle L692; standing-brief L255 | `interval_hours = 1` |

A cycle that reads either sentence and reasons from it ("a quiet night is expected, the next admitted hour is 3 AM") reasons from a false premise. `standing-brief.md` already contains the contradiction internally: its **generated** block renders "Scheduler: **on**, every **1 hour**" at L72, and its hand-maintained judgment paragraph 183 lines lower still says "live values: **on, 3 hours** … the runner runs at **12/3/6/9 on his clock**".

Premise: **alive.** The ticket's own line numbers (runner-cycle 626, standing-brief 291) had all moved; every number in the kickoff was re-located by content this session and quoted from the tree at `2671683d` (v7.0.564).

## 2. Why this fingerprint returned three weeks running

Not because anyone forgot to update a copy. Because there are five hand-maintained copies of a two-column fact whose live homes are one Supabase row and one routine. `pattern:93` — never store a fact in a doc when a live source of truth exists — plus `pattern:2`, data over hardcoding. The fix is structural in the only sense available to prose: state the **rule** (which is stable) and name the **homes** (which are authoritative), so the next `interval_hours` change cannot make any sentence false.

`runner-cycle.md` L1828 already does this correctly for a different threshold — `runner_settings.interval_hours × the same GAP_MULTIPLE (4)` — which is the in-repo precedent the reworded paragraphs should read like.

## 3. What was deliberately NOT swept, and why

A file-wide grep for `hourly` / `12/3/6/9` / `3 hours` returns dated measurements and history that are **true statements about the past**:

- `runner-cycle.md` L696-698: *"3 of 9 hourly fires were wrongly paced in the `interval=1h` era"* — a measurement from cycle `6177c7aa`, the evidence that killed the elapsed-time form.
- `runner-cycle.md` L325: a **quoted retired sentence** the doc explicitly labels as wrong.
- `RUNNER-GOV-0820-REQUIREMENTS.md` L30-31: *"As originally shipped: fires 12/3/6/9 AM/PM CST (UTC cron `0 2,5,8,11,14,17,20,23 * * *`…)"* — the original A2 requirement, kept as the record the supersession is against.
- Header stamps `GOVERNANCE-MODES.md` L3 and `standing-brief.md` L11 — ship records, and L11's whole point is that it documents the 2026-08-24 drift this ticket is the tail of.

Sweeping these would satisfy a naive grep and destroy the record. That is why QA §2 makes a **file-wide zero a failure**, not a pass.

`docs/runbooks/routine-prompt.md:10` carries `40 */3 * * *` and John's words *"set it to three hours"*. It is **correct today**, it is the canonical copy of the routine's own prompt, and the file is at its ses-355 check-7 header-stamp cap of 5 — so it is left alone rather than rewritten for consistency (`pattern:65`, narrowest fix).

## 4. The one non-obvious dependency

`runner-cycle.md` L3437-3441 is a step-9 note that **asserts** the standing brief still contradicts its own block, and closes *"Repairing that prose is a hand edit and a separate ticket."* AGT-87 is that ticket. Repairing standing-brief L255 without rewriting this note would ship a brand-new false statement in the runbook — the exact defect class the ticket exists to end. It is task 2.

## 5. Mechanical constraints the build cannot skip

- `docs/runbooks/cycle-card.md` is generated from the runbook (`scripts/render-cycle-card.js`); `tests/regression/ses-377-cycle-card.test.mjs` asserts the committed card equals a fresh render **and** that its header sha256 (`40f4254ab693bedc`) is the current runbook's. Any runbook edit without `--write` reddens it.
- `tests/regression/ses-413d-questions-scoreboard.test.mjs:84` exports `BYTES_AT_SHIP = 379678` and `RUNBOOK_CEILING = 381000`; `ses-424f-executor-citations.test.mjs:53` imports both. Any runbook edit reddens both tests until the pin is re-measured.
- Headroom is **1,322 bytes** (379,678 of 381,000). The reword is roughly byte-neutral — it deletes literals and adds column names — but it must be measured, not assumed.
- `tests/regression/SES-177b-standing-brief-block.js` floors the hand judgment paragraph at **5,000 chars**; it is 7,643 now. The paragraph sits *below* the `END GENERATED` marker at L253, so `scripts/render-standing-brief.js` (which splices only between markers and exits 2 on any byte moving outside them) never touches it — the edit is safe and does not need the renderer re-run.

## 6. Alternatives considered and rejected

- **Generate the cadence sentence into all four docs** (a second `render-standing-brief`-style block). Rejected: four new generated regions, four new guard tests, and a renderer that must run on every settings change — far past a P10 - Tooling prose fix (`pattern:65`, `pattern:67`). The rule is stable; only the numbers move, and the numbers can simply be dropped.
- **Delete the cadence prose entirely and point at the runbook.** Rejected: GOVERNANCE-MODES' registry row is where a reader learns the mode *is* paced at all; removing it loses real information. One rule sentence + a pointer keeps it.
- **Also correct `routine-prompt.md:10`.** Rejected above — correct today, stamp-capped, and out of the ticket's sentence.

## 7. Baseline

`node scripts/baseline-red-set.js --tests=…` on the unchanged tree: **0 of 6 red** (ses-377, ses-413d, ses-424f, SES-177b, ses-336, SES-176 all green). Eight unrelated dev-head reds stand and are named in the kickoff so the Builder's proof and the Verifier read one set.

## 8. Governing architecture

`docs/ARCHITECTURE.md` §19v — The Self-Building Platform (L2509). It governs the runner's autonomous cadence and **states no cadence number anywhere**; `scheduler_gate` and `runner_settings` do not appear in the file at all. That absence is the posture the four docs are being brought back to, not an omission to fill.
