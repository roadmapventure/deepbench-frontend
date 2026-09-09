<!-- DeepBench v7.0.442 | docs/design/2026-09-09-operational-defaults-census.md | SES-234 — every operational default becomes a rules-registry row, judged against the mission. THIS FILE IS THE CANONICAL HOME OF THE `operational-defaults` SOURCE GROUP in `public.governance_rules`: each `OD-nn` heading below carries, as the blockquote directly under it, the BYTE-FOR-BYTE `statement` of the registry row with that id, exactly as `docs/RUNNER-GOV-M5-REQUIREMENTS.md` does for M5-01..M5-15. `tests/regression/ses-234-operational-defaults.test.mjs` pins that identity in both directions. -->

# Operational defaults — census, registry rows, and the batch for John

An **operational default** is a number, an order, or a branch that the machine runs on and that no
registry row states. Before this ticket the retirement ledger, `public.governance_rules` and the
gate reviews saw only what was *written as a rule*; the defaults living as SQL literals, as
`runner_settings` columns and as runbook procedure were invisible to all three. John caught five of
them in one afternoon (2026-08-29, *"file both"*). This is the census.

**Every value below was MEASURED this session** — read out of `pg_get_functiondef()`, out of
`information_schema.columns`, out of `public.runner_settings` / `public.runner_budget` /
`public.runner_ladder` / `public.skill_profiles`, out of `cron.job`, and out of the repo files named
— never recalled.

## How to read an entry

| Field | Meaning |
|---|---|
| The blockquote | the registry `statement`, byte-for-byte. It names the canonical home inline (`canonical: …`) because that home is often a function or a column, not a document. |
| **Enforcement** | the `governance_rules.enforcement` category. The check constraint on that column admits only `hook`, `script`, `reviewer`, `prose` — so the *name* of the pinning test lives in **Pinned by**, not in the column. |
| **Lives in** | where the value physically is: `file:function`, or `table.column`. |
| **Pinned by** | the test or function that would notice if it moved, or `none` when nothing does. `none` is itself a finding. |
| **Judgment** | keep / amend / retire, with the mission line it serves or fails. |

Mission lines are cited from `docs/SELFBUILD-CHARTER.md` § *Goals* by number: **G1** autonomous
delivery, **G2** one version of the truth, **G3** independent verification, **G4** self-healing,
**G5** John-audited not John-paced, **G6** self-growing.

**Nothing in this ticket changed anything that runs.** Every amend and retire below is a proposal in
the batch at the end, for John. The only database write is the registry rows themselves, plus the
`governance_rules_source_group_check` widening that lets them exist.

---

## A. The board, the queue and the pick

### <a id="OD-01"></a>OD-01 — The queue sort keys

> The pickable board's stored order is produced by exactly six ranking keys applied in this sequence: `automation_rank` nulls last, then tier (`now` before `next` before everything else), then the numeric part of `priority_class` ascending, then the M5-02 filing lane (`coalesce(filed_at, created_at)` before 2026-08-21 first), then `predicted_cycles` ascending nulls last, then `coalesce(filed_at, created_at)` ascending, with `backlog_id` and `id` as final tiebreaks; canonical: `public.recompute_backlog_queue()`.

- **Enforcement:** `script`
- **Lives in:** `public.recompute_backlog_queue()`, the `unpinned` CTE's `row_number() OVER (ORDER BY …)`.
- **Pinned by:** `tests/regression/ses-281-m5-pick-enforcement.test.mjs` (lane and cheapest-first keys); nothing pins `automation_rank` or the tier ordering.
- **Judgment:** **keep.** G1 needs one stored order a cycle can read without re-deriving it, and G2 needs that order to have one home. It has one.

### <a id="OD-02"></a>OD-02 — Pin slots

> A pinned ticket's `pinned_position` is clamped into `1..N` over the eligible population, at most one pin may hold any slot, and when two pins claim the same slot the row with the newer `updated_at` wins; canonical: `public.recompute_backlog_queue()`, the `pins` CTE.

- **Enforcement:** `script`
- **Lives in:** `public.recompute_backlog_queue()`, `distinct on (least(greatest(pinned_position,1), v_total))`.
- **Pinned by:** none.
- **Judgment:** **keep.** A pin is John's own hand on the order, which is G5's "governs by exception" in its most literal form; silently dropping one would be the runner overruling him.

### <a id="OD-03"></a>OD-03 — What loses a queue number

> A ticket loses its queue number, and with it every path to being picked, when its `status` is `done` or `removed`, when its `priority_class` is null, or when its `defer_status` is `yes` or `stuck`; a `done` or `removed` ticket additionally loses its pin, and `removal proposed` is deliberately NOT in this set because such a ticket is live and awaiting John; canonical: `public.recompute_backlog_queue()`.

- **Enforcement:** `script`
- **Lives in:** `public.recompute_backlog_queue()`, the leading `update … set queue = null`.
- **Pinned by:** `tests/regression/ses-305-deferred-never-picked.test.mjs`.
- **Judgment:** **keep.** G5: a ticket awaiting John's word stays on the board rather than vanishing from it.

### <a id="OD-04"></a>OD-04 — The pick lane order

> Work is offered to a cycle in three lanes in a fixed order — `directive` (every queued one-off directive, oldest first), then `drain` (the standing drain's next claimable named members), then `selfbuild` (every buildable ticket in an executing project) — and the `board` row that reports how many queued tickets are outside an executing project is emitted whether the Prime Directive stands or not; canonical: `public.prime_directive_queue()`.

- **Enforcement:** `script`
- **Lives in:** `public.prime_directive_queue()`, the `picks` CTE's three `UNION ALL` arms and the trailing board row.
- **Pinned by:** `tests/regression/ses-340-projects-govern.test.mjs`, `tests/regression/ses-333-step5-handoff.test.mjs`.
- **Judgment:** **keep.** G2: this function is the single home the page, runbook step 5 and `drain_chain_gate()`'s §2e branch all read, so none of them can disagree about what work exists.

### <a id="OD-05"></a>OD-05 — The rank keys inside a lane

> Within the offered lanes, rows are numbered by `lane_ord`, then the directive lane's `created_at`, then the filing lane, then the queue number, then `predicted_cycles` nulls last — the same three ticket keys `drain_epic_next()` uses, and that agreement is the property the pair of functions exists to hold; canonical: `public.prime_directive_queue()`, the `ranked` CTE.

- **Enforcement:** `script`
- **Lives in:** `public.prime_directive_queue()`, `row_number() OVER (ORDER BY lane_ord, sort_key, sort_lane, sort_queue, sort_cycles NULLS LAST)`.
- **Pinned by:** `tests/regression/ses-281-m5-pick-enforcement.test.mjs`.
- **Judgment:** **keep.** G2, and the agreement with OD-06 is the whole point.

### <a id="OD-06"></a>OD-06 — The drain's own pick order

> The standing drain picks its next member by filing lane first, then queue number, then `predicted_cycles` nulls last, and by nothing else; canonical: `public.drain_epic_next()`, the pick predicate's `ORDER BY`.

- **Enforcement:** `script`
- **Lives in:** `public.drain_epic_next()`, `ORDER BY CASE WHEN b.filed_at < c_lane_cut THEN 0 ELSE 1 END, b.queue, b.predicted_cycles NULLS LAST`.
- **Pinned by:** `tests/regression/ses-281-m5-pick-enforcement.test.mjs`.
- **Judgment:** **keep.** Same as OD-05.

### <a id="OD-07"></a>OD-07 — The filing-lane cut date

> The filing-lane boundary is the literal date 2026-08-21, and it is written three separate times — `public.recompute_backlog_queue()`, `public.prime_directive_queue()`'s `buildable` CTE, and `public.drain_epic_next()`'s `c_lane_cut` constant — with no column, setting or single constant behind any of them; canonical: those three function bodies, jointly.

- **Enforcement:** `script`
- **Lives in:** `public.recompute_backlog_queue()`, `public.prime_directive_queue()`, `public.drain_epic_next()`.
- **Pinned by:** `tests/regression/ses-295-scope-rationale-promotion.test.mjs` reads the date; nothing asserts the three copies agree.
- **Judgment:** **amend.** Three hand-copied literals of one governing fact is exactly what G2 forbids. Proposal 8 in the batch.

### <a id="OD-08"></a>OD-08 — The claim expiry

> A ticket claim goes stale after 24 hours, written as the interval literal `INTERVAL '24 hours'` in both `public.prime_directive_queue()` and `public.drain_epic_next()`, so a dead session can never strand a ticket permanently; canonical: those two function bodies.

- **Enforcement:** `script`
- **Lives in:** `public.prime_directive_queue()` and `public.drain_epic_next()`, `b.claimed_at < now() - INTERVAL '24 hours'`.
- **Pinned by:** `tests/regression/ses-84-claims-classed.test.mjs`.
- **Judgment:** **keep.** G1: without an expiry a crashed cycle stops the loop, and the loop is the deliverable. Two copies, but they are the same two functions OD-05/OD-06 already require to agree.

### <a id="OD-09"></a>OD-09 — The one design_status that still blocks

> Exactly one `design_status` value blocks a pick — `needs-desktop`, a physical constraint about a machine John has — and the array holding it is deliberately kept identical in `public.drain_epic_next()` and `public.drain_chain_gate()`; `needs-john` was retired by M6-01 and `john-paced` was converted, because blocking on a human judgment is what M6-01 forbids; canonical: the `c_flagged` constant in those two functions.

- **Enforcement:** `script`
- **Lives in:** `public.drain_epic_next()` and `public.drain_chain_gate()`, `c_flagged constant text[] := ARRAY['needs-desktop']`.
- **Pinned by:** `tests/regression/ses-285-m6-autonomy.test.mjs`.
- **Judgment:** **keep.** G5 in one line: the only thing allowed to pace the runner is physics, not a pending opinion.

### <a id="OD-10"></a>OD-10 — Two different "finished" sets, on purpose

> `public.drain_epic_next()` carries two deliberately different status sets: `c_finished` = done, removed (this ticket is not work) and `c_unblocking` = done, removed, delivered (this ticket no longer blocks another), so a `delivered` ticket stops blocking its dependants while still counting as open work itself; canonical: those two constants.

- **Enforcement:** `script`
- **Lives in:** `public.drain_epic_next()`, `c_finished` / `c_unblocking`.
- **Pinned by:** `tests/regression/ses-320-delivered-exit.test.mjs`.
- **Judgment:** **keep.** G1: a dependant that waits for its blocker's *verdict* rather than its *code* stalls the happy path for no reason.

### <a id="OD-11"></a>OD-11 — How a design gate is recognised

> A milestone's own design-gate ticket is recognised by the title pattern `M_ design gate%` and by nothing else — not by `scope_origin`, which only M4's and M5's gates carry — and the gate is excluded from its own block (`g.id <> b.id`) because without that exclusion the one ticket able to open a milestone sits behind the gate it would open; canonical: `public.drain_epic_next()`'s `c_gate_pat` and the matching clause in `public.prime_directive_queue()`.

- **Enforcement:** `script`
- **Lives in:** `public.drain_epic_next()`, `public.prime_directive_queue()`.
- **Pinned by:** `tests/regression/ses-281-m5-pick-enforcement.test.mjs`.
- **Judgment:** **keep.** A title pattern is a weak key, but it was chosen against a measurement (only two of four live gates carry `scope_origin = 'original'`) and the alternative silently disabled M5-09 for every milestone that had not started. G1.

### <a id="OD-12"></a>OD-12 — The retirement loop's runaway guard

> `public.drain_epic_next()` will retire at most 32 drains in one call, a runaway backstop rather than a policy — a retirement sets `status = 'done'`, which leaves the loop's own WHERE, so the loop advances by construction; canonical: the `v_guard > 32` exit.

- **Enforcement:** `script`
- **Lives in:** `public.drain_epic_next()`.
- **Pinned by:** none.
- **Judgment:** **keep.** G4: a self-healing loop that can spin forever heals nothing. The number is arbitrary and correctly so; it is a ceiling on absurdity, not a tuning knob.

### <a id="OD-13"></a>OD-13 — Where a drain's finish line is

> A drain retires when every member the gate ruled `milestone_required` is done or removed; when NO member carries that flag the pre-SES-304 all-members rule applies unchanged, and a deferred required member never exempts itself, because a deferred requirement is a signal the gate must re-rule rather than a reason to retire; canonical: `public.drain_epic_next()`, the `v_req_n` branch.

- **Enforcement:** `script`
- **Lives in:** `public.drain_epic_next()`.
- **Pinned by:** `tests/regression/ses-310-drain-retires-on-required.test.mjs`.
- **Judgment:** **keep.** G1: without it a milestone cannot hand off to the next one, which is where the charter's first goal actually fails.

---

## B. The clock

### <a id="OD-14"></a>OD-14 — The fire cadence

> The runner's scheduled fire is paced by three stored numbers — `runner_settings.cron_minute` (the cron grid minute, default 40), `runner_settings.interval_hours` (the hour grid, column default 3, LIVE VALUE 1) and `runner_settings.grid_tolerance_min` (how far off the minute grid a fire may sit and still count as scheduled, default 10); canonical: those three columns.

- **Enforcement:** `script`
- **Lives in:** `public.runner_settings.cron_minute`, `.interval_hours`, `.grid_tolerance_min`.
- **Pinned by:** `scripts/check-cycle-cadence.js`; `tests/regression/ses-319-runner-silence.test.mjs`.
- **Judgment:** **amend.** Not the mechanism, the value: `interval_hours` is LIVE 1 while the written record (and every clock-grid description of the gate) says a 3-hour grid at 12/3/6/9 CST. Proposal 4.

### <a id="OD-15"></a>OD-15 — The scheduler gate's fail-open constants

> `public.scheduler_gate()` re-states each pacing default as its own COALESCE literal — `scheduler_on` true, `interval_hours` 3, `cron_minute` 40, `grid_tolerance_min` 10 — and additionally clamps a sub-1 interval up to 1 to guard its own modulo; the literals are a second copy of the column defaults they shadow; canonical: `public.scheduler_gate()`.

- **Enforcement:** `script`
- **Lives in:** `public.scheduler_gate()`.
- **Pinned by:** none.
- **Judgment:** **retire.** Failing open is right and stays; the duplicated numbers are the thing to retire, because the columns already carry live, green defaults. Proposal 7.

### <a id="OD-16"></a>OD-16 — What counts as a manual fire

> A fire that calls itself `scheduled` but starts more than `grid_tolerance_min` minutes from `cron_minute`, measured as a CIRCULAR minute distance, is a MANUAL fire and is never paced by any scheduler setting; a fire that is not scheduled at all is likewise never paced; canonical: `public.scheduler_gate()`.

- **Enforcement:** `script`
- **Lives in:** `public.scheduler_gate()`, `v_dist := least(v_dist, 60 - v_dist)`.
- **Pinned by:** none.
- **Judgment:** **keep.** G5: John typing "go" must never be silenced by a setting that exists to pace the machine.

### <a id="OD-17"></a>OD-17 — The clock grid itself

> The scheduled-fire grid is `hour % interval_hours = 0` evaluated on the America/Chicago WALL CLOCK, anchored to the cycle row's own `started_at` rather than to call time, which makes it DST-proof by construction; canonical: `public.scheduler_gate()`.

- **Enforcement:** `script`
- **Lives in:** `public.scheduler_gate()`, `v_hour_cst % v_interval <> 0`.
- **Pinned by:** none.
- **Judgment:** **keep.** G5: the grid is John's clock, and a UTC grid would move under him twice a year.

### <a id="OD-18"></a>OD-18 — The window finaliser's cron

> The usage-window finaliser runs hourly at minute 17 as the database-side `cron.job` row `runner-window-finaliser` calling `public.run_window_finaliser()`, on the database's own clock and with no deploy in the path; canonical: that `cron.job` row.

- **Enforcement:** `script`
- **Lives in:** `cron.job` where `jobname = 'runner-window-finaliser'`, schedule `17 * * * *`.
- **Pinned by:** `tests/regression/ses-320b-window-finaliser.test.mjs`.
- **Judgment:** **keep.** G2, and it is the better of the two cron shapes this platform runs — see OD-19.

### <a id="OD-19"></a>OD-19 — The nightly re-rank's cron

> The Prioritizer's nightly board re-rank is a VERCEL cron at `10 9 * * *`, which is 03:10 America/Chicago in summer and 02:10 in winter because Vercel crons carry no timezone; the requirement it satisfies is "overnight, off the runner's own grid", and :10 was chosen to collide with neither the runner's :40 nor the finaliser's :17; canonical: `vercel.json` `crons[0]`, with the reasoning in `api/cron/rank-backlog.js`.

- **Enforcement:** `script`
- **Lives in:** `vercel.json`; `api/cron/rank-backlog.js`.
- **Pinned by:** `tests/regression/ses-334-served-class-block.test.mjs`.
- **Judgment:** **keep.** The DST drift is named in the file rather than papered over, and both readings satisfy the requirement. G2 is satisfied by the naming, not by the shape.

---

## C. The chain

### <a id="OD-20"></a>OD-20 — The five chain gates, in order

> A drain chain continues only after five gates pass in a fixed order: A this cycle closed in `shipped`, `gated_before_build` or `reverted`; B a standing drain has claimable work, widened by Prime Directive §2e to the executing project's own selfbuild lane when the drain returns anything but `pick`; C the pick is not flagged `needs-desktop`; D the no-ship streak is under its ceiling; E the undecided-card count is under its ceiling — and gates D and E stand in front of a §2e continue exactly as they stand in front of a drain pick; canonical: `public.drain_chain_gate()`.

- **Enforcement:** `script`
- **Lives in:** `public.drain_chain_gate()`.
- **Pinned by:** `tests/regression/ses-312-succession-without-cards.test.mjs`, `tests/regression/ses-340-projects-govern.test.mjs`.
- **Judgment:** **keep.** G1 with a brake on it: the chain is how the platform gets a night's work done, and the gates are what stop it grinding.

### <a id="OD-21"></a>OD-21 — The no-ship streak ceiling

> A chain stops when `runner_settings.chain_max_noship_streak` consecutive cycles have finished without shipping (column default 2, LIVE VALUE 4); canonical: that column, read by `public.drain_chain_gate()` with a COALESCE fallback of 2.

- **Enforcement:** `script`
- **Lives in:** `public.runner_settings.chain_max_noship_streak`.
- **Pinned by:** none.
- **Judgment:** **keep** the mechanism. G4: a loop that is not shipping is a loop that needs a human eye, and this is the number that fetches one.

### <a id="OD-22"></a>OD-22 — How the streak is counted

> The no-ship streak counts only cycles that started within the last 6 HOURS, only cycles after the most recent `shipped` cycle, and only cycles whose `trigger` begins `chained` (plus the calling cycle itself) — so an unrelated manual cycle cannot lengthen a chain's streak, and a chain older than six hours starts its streak afresh; canonical: `public.drain_chain_gate()`.

- **Enforcement:** `script`
- **Lives in:** `public.drain_chain_gate()`, `c.started_at >= v_me.started_at - INTERVAL '6 hours'`.
- **Pinned by:** none.
- **Judgment:** **amend.** The 6-hour window is a bare literal with no column and no test, and it silently bounds OD-21: raising `chain_max_noship_streak` past what fits in six hours cannot have an effect. Proposal 9.

### <a id="OD-23"></a>OD-23 — The undecided-card ceiling is off

> `runner_settings.chain_max_undecided_cards` has no column default and is LIVE NULL, and `public.drain_chain_gate()` treats NULL as "no ceiling", so gate E cannot fire today and the number of cards waiting on John's decision does not bound a chain; canonical: that column.

- **Enforcement:** `script`
- **Lives in:** `public.runner_settings.chain_max_undecided_cards`.
- **Pinned by:** `tests/regression/ses-312-succession-without-cards.test.mjs` asserts the NULL branch.
- **Judgment:** **amend.** A gate that structurally cannot fire is indistinguishable from a gate that was never built; G5 wants the backlog of things awaiting John to be bounded by something. Proposal 10.

---

## D. The walls

### <a id="OD-24"></a>OD-24 — The five token-cap rungs

> The day's token cap is resolved by five rungs tried in a fixed order: 1 John's unexpired `budget_override` for today, 2 the stale-reading floor, 3 John's standing daily-max box, 4 the calibrated allowance derived from his last night-to-morning meter pair, 5 the uncalibrated standing default — and a missing `runner_budget` row for the month short-circuits every rung into "did not run"; canonical: `public.resolve_day_token_cap()`.

- **Enforcement:** `script`
- **Lives in:** `public.resolve_day_token_cap()`.
- **Pinned by:** `scripts/check-token-wall-binding.js`.
- **Judgment:** **keep.** G5: rung 1 is John's word for today outranking his own standing rule, which is what governing by exception means.

### <a id="OD-25"></a>OD-25 — The staleness brake

> A usage reading older than 48 HOURS, or the absence of any reading, forces the day's cap down to the stale-reading floor, and the standing daily-max box explicitly may NOT override it; the 48 is a bare literal with no `runner_settings` column behind it, so it cannot be changed from John's Automation panel; canonical: `public.resolve_day_token_cap()`, `v_stale := (v_reading.id IS NULL) OR (v_age > 48)`.

- **Enforcement:** `script`
- **Lives in:** `public.resolve_day_token_cap()`.
- **Pinned by:** `scripts/check-token-wall-binding.js`.
- **Judgment:** **amend.** The brake is right; its threshold being unreachable from the panel that governs every other budget number is not. Proposal 6.

### <a id="OD-26"></a>OD-26 — The stale-reading floor

> The stale-reading floor is `runner_budget.stale_fallback_tokens`, column default 3,000,000, and `public.resolve_day_token_cap()` re-states that same 3,000,000 as its own COALESCE literal; canonical: the column.

- **Enforcement:** `script`
- **Lives in:** `public.runner_budget.stale_fallback_tokens`; the literal in `public.resolve_day_token_cap()`.
- **Pinned by:** `scripts/check-token-wall-binding.js`.
- **Judgment:** **retire** the literal. Two homes for one number is G2's named defect; the column is live and green. Proposal 7.

### <a id="OD-27"></a>OD-27 — The uncalibrated default

> The uncalibrated day allowance is `runner_budget.runner_day_token_allowance`, column default 10,000,000, and `public.resolve_day_token_cap()` re-states that same 10,000,000 as its own COALESCE literal; canonical: the column.

- **Enforcement:** `script`
- **Lives in:** `public.runner_budget.runner_day_token_allowance`; the literal in `public.resolve_day_token_cap()`.
- **Pinned by:** `scripts/check-token-wall-binding.js`.
- **Judgment:** **retire** the literal, same reason as OD-26. Proposal 7.

### <a id="OD-28"></a>OD-28 — The weekly rest wall

> The weekly rest wall fires when the all-models usage meter reaches `runner_budget.weekly_rest_pct` (column default 85), and `runner_budget.runner_share_pct` (default 50) is the share of the week the runner may spend; canonical: those two columns.

- **Enforcement:** `script`
- **Lives in:** `public.runner_budget.weekly_rest_pct`, `.runner_share_pct`.
- **Pinned by:** `scripts/check-token-wall-binding.js`.
- **Judgment:** **keep.** G5: a wall that stops the machine before it eats John's own week is the difference between a helper and a bill.

### <a id="OD-29"></a>OD-29 — The standing daily box

> The standing daily token box is `runner_settings.daily_max_tokens_millions`, which has NO column default (absent means rung 3 is skipped) and whose LIVE VALUE is 196, i.e. 196,000,000 tokens per day; canonical: that column.

- **Enforcement:** `script`
- **Lives in:** `public.runner_settings.daily_max_tokens_millions`.
- **Pinned by:** `scripts/check-token-wall-binding.js`.
- **Judgment:** **amend.** Not the mechanism, the value: 196M/day is 19.6x the 10M/day the architecture section and OD-27's own default state, so the two written records of "the day's budget" disagree by an order of magnitude. Proposal 5.

### <a id="OD-30"></a>OD-30 — "Today", and what the walls do not guarantee

> Every "today" in the budget walls means an AMERICA/CHICAGO calendar day on both the dollar and the token track, never a UTC day (measured 2026-08-21: 12 cycles inside the UTC day against 4 inside the CST day over the same rows), and a granted `budget_override.expires_at` is honoured exactly as written rather than re-derived under the later clock; separately, each cycle reads the day's spend at its OWN start, so N cycles starting together can each pass a wall their sum exceeds — the caps are enforced per-cycle-start, not transactionally across the fleet; canonical: `docs/runbooks/runner-cycle.md` step 3.

- **Enforcement:** `prose`
- **Lives in:** `docs/runbooks/runner-cycle.md` step 3.
- **Pinned by:** none.
- **Judgment:** **keep.** Both halves. G5 owns the clock boundary; the per-cycle-start slack is small at today's scale and is NAMED rather than hidden, which is the honest form of a known approximation.

---

## E. The ladder and what a class earns

### <a id="OD-31"></a>OD-31 — The auto-done rung

> A work class earns the right to have `done` written without John when its ladder rung reaches `runner_settings.auto_done_rung` (default and live value 3); canonical: that column, read by `public.class_autonomy()`.

- **Enforcement:** `script`
- **Lives in:** `public.runner_settings.auto_done_rung`.
- **Pinned by:** `tests/regression/ses-285-m6-autonomy.test.mjs`, `tests/regression/ses-311-done-requires-verdict.test.mjs`.
- **Judgment:** **keep.** This is G5 in a single number.

### <a id="OD-32"></a>OD-32 — The cap-relax rung

> Scope caps widen by one file and one task for every ladder rung a work class holds ABOVE `runner_settings.cap_relax_rung` (column default 5, LIVE VALUE 13, raised at the M6 gate review so extras accrue only from verifier-fed promotions); canonical: that column, read by `public.class_autonomy()`.

- **Enforcement:** `script`
- **Lives in:** `public.runner_settings.cap_relax_rung`.
- **Pinned by:** none.
- **Judgment:** **amend.** The grant is unbounded above: `tooling` sits at rung 20 today, so `class_autonomy('P10 - Tooling')` returns 7 extra files and 7 extra tasks, i.e. a live cap of 10 files and 11 tasks against CLAUDE.md's hard rule of 3 files and 4 tasks. Proposal 3, and this is the loudest contradiction in the census after Proposal 1.

### <a id="OD-33"></a>OD-33 — The scope-cap baseline and its fail-closed arithmetic

> The scope-cap baseline is 3 FILES and 4 TASKS, stated in `docs/runbooks/runner-cycle.md` step 5a and in CLAUDE.md's hard rules but held in NO column; `public.class_autonomy()` returns only the EXTRAS on top of it, and fails closed by null arithmetic rather than by a special case — an unclassed ticket, a class with no ladder row, or a missing `runner_settings` singleton all yield zero extras and `auto_done` false; canonical: `docs/runbooks/runner-cycle.md` step 5a for the baseline, `public.class_autonomy()` for the extras.

- **Enforcement:** `script`
- **Lives in:** `docs/runbooks/runner-cycle.md` step 5a; `public.class_autonomy()`.
- **Pinned by:** `tests/regression/ses-285-m6-autonomy.test.mjs`.
- **Judgment:** **keep.** Failing closed on a lookup that goes wrong can only NARROW a cap, never widen one, which is the correct direction for every autonomy grant. G5.

### <a id="OD-34"></a>OD-34 — Where a new work class starts

> A newly created `runner_ladder` row starts at rung 1 with streak 0 by column default, so a class begins below `auto_done_rung` and below `cap_relax_rung` and must earn both; canonical: `public.runner_ladder.rung` and `.streak`.

- **Enforcement:** `script`
- **Lives in:** `public.runner_ladder.rung`, `.streak`.
- **Pinned by:** none.
- **Judgment:** **keep.** G5 again: autonomy is earned from a floor, never granted at creation.

### <a id="OD-35"></a>OD-35 — The class-to-work-class map, and the four classes it drops

> `public.ladder_work_class()` maps only six priority classes to a ladder work class — P2 invention, P5 enhancement, P7 agent_creation, P8 determinism_removal, P9 bug_fix, P10 tooling — and returns NULL for P1, P3, P4 and P6, so a ticket in any of those four classes has no ladder row, earns zero scope extras, and can NEVER satisfy `auto_done`; canonical: `public.ladder_work_class()`.

- **Enforcement:** `script`
- **Lives in:** `public.ladder_work_class()`.
- **Pinned by:** none.
- **Judgment:** **amend — NAMED CONTRADICTION.** P1 is the class the priority scheme promotes a FAANG-showcase ticket INTO, and it is one of the four the ladder cannot see. So the highest-value work on the board is structurally the least autonomous work on the board, which inverts G5 ("verification writes done") for exactly the tickets G1 most wants shipped unattended. Proposal 2.

---

## F. Invention

### <a id="OD-36"></a>OD-36 — The rung-0 floor is a floor, not a rate

> At ladder rung 0 the invention pass is paced by a FLOOR, not a daily rate: it buys one proposal every `runner_settings.invention_floor_days` (default and live value 7), measured from the newest invention decision that was not reversed; canonical: that column, read by `public.invention_due()`.

- **Enforcement:** `script`
- **Lives in:** `public.runner_settings.invention_floor_days`; `public.invention_due()`.
- **Pinned by:** `tests/regression/ses-160-invention-engine.test.mjs`.
- **Judgment:** **keep.** G6 has to start somewhere slow, and measuring from the last UNREVERSED decision means a reversal buys the platform another attempt rather than burning it.

### <a id="OD-37"></a>OD-37 — The invention rate above rung 0

> Above rung 0 the invention allowance is `rung x runner_settings.invention_per_rung_per_day` (default and live value 1) minus today's UNREVERSED invention decisions, counted on the America/Chicago day; canonical: that column, read by `public.invention_due()`.

- **Enforcement:** `script`
- **Lives in:** `public.runner_settings.invention_per_rung_per_day`; `public.invention_due()`.
- **Pinned by:** `tests/regression/ses-160-invention-engine.test.mjs`.
- **Judgment:** **keep.** G6 scaled by earned trust, on John's clock (OD-30's boundary, reused rather than re-derived).

### <a id="OD-38"></a>OD-38 — What refuses an invention pass first

> An invention pass is refused BEFORE any pacing arithmetic when the enhancement week is already at or past `runner_settings.enhancement_cap_pct` (default and live value 20 percent), because a proposal builds under the same weekly cap every enhancement does; separately `runner_settings.invention_requires_epic` (default and live TRUE) requires an invented ticket to be filed against an epic; canonical: those two columns, read by `public.invention_due()`.

- **Enforcement:** `script`
- **Lives in:** `public.runner_settings.enhancement_cap_pct`, `.invention_requires_epic`; `public.invention_due()`.
- **Pinned by:** `tests/regression/ses-283-enhancement-lane.test.mjs`, `tests/regression/ses-321-enhancement-fence.test.mjs`.
- **Judgment:** **keep.** G6 bounded by G5's budget: inventing into a week with no room to build is research nobody can act on.

---

## G. Decisions, the briefing, and the Prioritizer

### <a id="OD-39"></a>OD-39 — The reversal window

> A recorded decision stays reversible for `runner_settings.reversal_window_hours` (default and live value 72); canonical: that column.

- **Enforcement:** `script`
- **Lives in:** `public.runner_settings.reversal_window_hours`.
- **Pinned by:** `tests/regression/ses-286a-reversal-window.test.mjs`.
- **Judgment:** **keep.** It IS G5 — "Reverse is always one tap away" is only true for as long as this number says.

### <a id="OD-40"></a>OD-40 — The open-decision batching threshold

> The standing brief collapses a kind's open decisions into one summary line when more than 20 of them fall on the same CST day, a bare `OPEN_DECISION_BATCH` constant with no setting behind it; canonical: `scripts/render-standing-brief.js`.

- **Enforcement:** `script`
- **Lives in:** `scripts/render-standing-brief.js`, `const OPEN_DECISION_BATCH = 20`.
- **Pinned by:** `tests/regression/ses-286c-open-decisions-brief.test.mjs`.
- **Judgment:** **keep.** It is a rendering threshold, not a governing one — nothing a cycle DOES changes when it moves — and the brief it protects went from 149 KB to 26 KB. G5: a page John cannot read is a page that does not audit anything.

### <a id="OD-41"></a>OD-41 — The publish lease

> The briefing's serial tail — harvest John's taps, then the ladder writes, then republish — is the one section that takes the singleton publish lease, whose TTL is 10 MINUTES because the tail is held for seconds to minutes; a cycle that cannot take it WAITS, retrying about every 30 seconds, and never skips the tail; canonical: `docs/runbooks/runner-cycle.md`, the publish-lease block.

- **Enforcement:** `prose`
- **Lives in:** `docs/runbooks/runner-cycle.md`; `public.runner_lease`.
- **Pinned by:** none.
- **Judgment:** **keep.** G2 and G5 together: two cycles republishing at once can EAT an un-harvested tap, and a tap eaten is John's judgment lost.

### <a id="OD-42"></a>OD-42 — The re-rank's candidate cap

> The nightly re-rank hands the Prioritizer at most 60 candidates, taken from `public.prime_directive_queue()` itself rather than from a re-derived board filter, because `pz-rank-intent`'s `max_tokens` is 4000 and each ranked entry costs roughly 30 output tokens — a TRUNCATED ranking is worse than a refused one, since the handler would apply the half it received as if it were the whole order; canonical: `api/cron/rank-backlog.js`'s `MAX_CANDIDATES` and `public.skill_profiles.max_tokens` for `pz-rank-intent`.

- **Enforcement:** `script`
- **Lives in:** `api/cron/rank-backlog.js`; `public.skill_profiles` row `pz-rank-intent`.
- **Pinned by:** `tests/regression/ses-334-served-class-block.test.mjs`.
- **Judgment:** **keep.** G2: reading the candidates from the picker's own function is the alternative to a second copy of its `buildable` CTE, and the cap is an output-budget fact rather than a round number.

### <a id="OD-43"></a>OD-43 — The Prioritizer's own sort order

> `pz-rank-intent` instructs the Prioritizer to order tickets by project milestone order, then `supports_class` (P1 first, none last), then `priority_class`, then the filing lane, then `predicted_cycles`, then queue — an order that does NOT agree with the one the picker actually uses, which puts the filing lane ABOVE the class and knows nothing of `supports_class` at all; canonical: `public.skill_profiles.method` for `pz-rank-intent`.

- **Enforcement:** `script`
- **Lives in:** `public.skill_profiles` row `pz-rank-intent`, column `method`.
- **Pinned by:** `tests/regression/ses-334-served-class-block.test.mjs` pins the block that REPORTS the ranking, not the key order itself.
- **Judgment:** **amend — NAMED CONTRADICTION.** OD-01 and M5-02 say filing lane before class; this says class before filing lane, and adds a key (`supports_class`) the picker cannot see. The Prioritizer writes `automation_rank`, which is OD-01's LEADING key, so its ordering does reach the board — through a key that overrides every key it was told to sort under. G2 forbids exactly this: one governing fact, two authoritative statements. Proposal 1.

### <a id="OD-44"></a>OD-44 — The cost-per-cycle fallback

> The share of a usage week one cycle is assumed to cost is the median of the runner-only windows in `public.usage_window_cycles`, falling back to the bare literal 0.39 percent when there is no such window; that number multiplies `predicted_cycles` in every enhancement-cap and invention-cap test, and has no column behind it; canonical: `public.runner_pct_per_cycle()`.

- **Enforcement:** `script`
- **Lives in:** `public.runner_pct_per_cycle()`.
- **Pinned by:** `tests/regression/ses-283-enhancement-lane.test.mjs` exercises the caller, not the fallback.
- **Judgment:** **amend.** A literal with no column and no test, sitting under the arithmetic of two separate gates, is the shape of default this ticket exists to find. Proposal 11.

---

## The batch for John — eleven proposals, one list

Nothing here has been done. Each line names the default, what is wrong, and the single change proposed.
Accept, reverse or rework them as a batch; they are ordered by how much they cost if left alone.

| # | Default | What is wrong | Proposed change |
|---|---|---|---|
| 1 | **OD-43** vs **OD-01** | The Prioritizer is told to sort class-before-lane and to use `supports_class`; the picker sorts lane-before-class and cannot see `supports_class`. Its ruling still reaches the board through `automation_rank`, OD-01's leading key — so the written order and the real order disagree, and the disagreement is invisible. | Pick one. Either rewrite `pz-rank-intent.method` to the M5-02/M5-07 key order, or amend M5-02 to put `supports_class` above the filing lane and teach `recompute_backlog_queue()` the key. One ticket, either way. |
| 2 | **OD-35** | `ladder_work_class()` returns NULL for P1, P3, P4 and P6, so those four classes can never auto-done and never earn scope extras — including P1, the class a FAANG-showcase ticket is promoted INTO. | Add the four mappings (or rule explicitly, in the registry, that those classes are attended-only). Today the rule exists only as an absent CASE arm. |
| 3 | **OD-32** | `cap_relax_rung` is 13 and `tooling` is at rung 20, so `class_autonomy('P10 - Tooling')` grants +7 files and +7 tasks — a live cap of 10 files / 11 tasks against CLAUDE.md's hard 3 / 4. | Cap the extras (a `cap_relax_max_extra` column, or `least(rung - cap_relax_rung, k)`), and state the ceiling in the registry rather than leaving it implied by whatever rung a class happens to reach. |
| 4 | **OD-14** | `interval_hours` is LIVE 1 while the written record describes a 3-hour grid at 12/3/6/9 CST. The gate therefore passes every hour, and no test notices. | Confirm 1 is intended and correct the prose, or restore 3. Either way the value and the description have to agree. |
| 5 | **OD-29** vs **OD-27** | The standing daily box is 196M tokens/day; the architecture text and `runner_day_token_allowance`'s own default both say 10M/day. The two written records of the day's budget differ by 19.6x. | Reconcile: raise the documented figure to the live box, or lower the box. The wall is only meaningful when one number is authoritative. |
| 6 | **OD-25** | The 48-hour reading-staleness threshold is a bare literal inside `resolve_day_token_cap()`, unreachable from the Automation panel that governs every other budget number. | Promote it to a `runner_settings` column and read it, exactly as the other budget rungs do. |
| 7 | **OD-15, OD-26, OD-27** | Three functions re-state column defaults as their own COALESCE literals (`scheduler_on`/3/40/10, 3,000,000, 10,000,000). Two homes per number, and the fallback silently wins whenever the column reads NULL. | Retire the literals; keep the fail-open BEHAVIOUR by reading the column default rather than a second copy of it. The columns are live and green today. |
| 8 | **OD-07** | The filing-lane cut date 2026-08-21 is hand-copied into three function bodies with nothing asserting they agree. | One home — a column, or one SQL constant function the three call. |
| 9 | **OD-22** | The no-ship streak's 6-hour lookback is a bare literal that silently bounds `chain_max_noship_streak`: raising the ceiling past what fits in six hours has no effect. | Either promote the window to a column beside the ceiling it bounds, or state the coupling in the registry so a later session cannot tune one and expect the other to follow. |
| 10 | **OD-23** | `chain_max_undecided_cards` is NULL, so chain gate E cannot fire and nothing bounds how many cards accumulate awaiting John. | Set a ceiling, or rule in the registry that the ceiling is deliberately off, so a gate that never fires stops looking like a gate that was never built. |
| 11 | **OD-44** | `runner_pct_per_cycle()`'s 0.39 fallback is a bare literal feeding both the enhancement cap and the invention cap, with no column and no test. | Promote to a column, and pin the fallback path in `ses-283`'s guard. |

**Two proposals are contradictions rather than tunings** — 1 and 2 — and they are the two this
census exists to have found. The rest are the same defect in nine costumes: a governing number with
no single home.

## Registry row ids filed by this ticket

`OD-01`, `OD-02`, `OD-03`, `OD-04`, `OD-05`, `OD-06`, `OD-07`, `OD-08`, `OD-09`, `OD-10`, `OD-11`,
`OD-12`, `OD-13`, `OD-14`, `OD-15`, `OD-16`, `OD-17`, `OD-18`, `OD-19`, `OD-20`, `OD-21`, `OD-22`,
`OD-23`, `OD-24`, `OD-25`, `OD-26`, `OD-27`, `OD-28`, `OD-29`, `OD-30`, `OD-31`, `OD-32`, `OD-33`,
`OD-34`, `OD-35`, `OD-36`, `OD-37`, `OD-38`, `OD-39`, `OD-40`, `OD-41`, `OD-42`, `OD-43`, `OD-44`.

**44 defaults found, 44 rows written, 0 amended in place** (no pre-existing rule stated any of them,
which is the finding). Every row is `status = 'live'` and `source_group = 'operational-defaults'`,
and every one of them describes what ALREADY runs — the eleven proposals above change nothing until
John rules on them.

## What this census does not cover, declared rather than implied

- **The retrieval, CHI and capability-execution layers.** This census is bounded to the GOVERNANCE
  machine — the board, the clock, the chain, the walls, the ladder, invention, the briefing. The
  same class of unwritten default certainly exists in `api/capabilities/execute.js` and the
  retrieval path; it is a second census, not a wider version of this one.
- **`runner_settings.scheduler_on`** is a switch, not a default, and is already governed prose in
  runbook step 1b.
- **A default with no row after this ticket is a finding for the next audit**, by the kickoff's own
  words. The bound above is where to start looking.
