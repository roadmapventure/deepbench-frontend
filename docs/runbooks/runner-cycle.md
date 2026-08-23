<!-- DeepBench v7.0.205 | runbooks/runner-cycle.md | SES-154 — ACCEPTANCE-GATED COMPLETION: a runner ship writes `delivered`, and only John's Accept ever writes `done`. Spec docs/design/BRIEFING-COMMENTS-0823-DRAFT.md decision 1, approved by John 2026-08-23 ("yes"); Chain A 1 of 3. Migration ses154_delivered_status adds 'delivered' to backlog_items_status_check. THE DISTINCTION THE WHOLE TICKET TURNS ON, and the one a later editor will be tempted to collapse: drain_epic_next() holds TWO predicates over the same named scope and 'delivered' belongs in exactly ONE. The PICK predicate excludes it (else the drain hands the same delivered ticket back every cycle and never advances); the RETIREMENT predicate must NOT (the drain retires on John's ACCEPTANCE, never on the runner's own say-so). QA was discriminating rather than merely complete, one fixture, one instant, one variable: with queue-1 SES-154 set delivered AND unclaimed, the shipped build picks SES-155 where the retired ses142 body picks SES-154; with ALL 18 workable named members set delivered, the shipped build returns open_now=18 / 'blocked' / directive still queued / 0 before-images, where the wrong build (delivered added to the retirement predicate) returns open_now=0 and RETIRES — closing John's standing directive on the runner's own word, which is the exact authorisation defect SES-142 was filed to end, rebuilt. recompute_backlog_queue() is deliberately UNCHANGED: a delivered ticket KEEPS its queue number, the same rule SES-113 established for `removal proposed`, because both are tickets awaiting his verdict — proven, not assumed (queue 2 before, queue 2 after, 0 rows moved), which makes his Accept zero-motion re-entry and keeps the ticket in the §8 matrix while he decides. Step 7 therefore no longer strips the number; the tail's Accept harvest does. backlog_mode() gains 'delivered' in its 'in review' arm so John's page keeps ONE word for "pushed, awaiting your verdict" instead of two (asserted: delivered+undecided ship card -> 'in review', delivered+no card -> 'delivered'). briefing_open_cards() is deliberately UNCHANGED and that is a decision, not an omission: its render predicate retires a GATED card whose ticket reached done/removed BY ANOTHER ROUTE, and 'delivered' is not terminal — a Reject reopens the ticket, so retiring the gated question at delivery would destroy a card that has to come back. DISCLOSED RATHER THAN LEFT TO BE DISCOVERED: (1) the ticket's "re-key the scoreboard (daily shipped)" has NO code to re-key — briefing-template.html's "Shipped today" box is a HARDCODED SAMPLE VALUE (1) with no SQL behind it anywhere in the repo, so the contract is written in briefing-page.md for the next rebuild instead of a predicate being changed, and saying so beats reporting a re-key that did not happen; (2) the drain X-of-N figure (drain_left) already counts "not yet done/removed", so leaving the retirement predicate alone re-keys it on acceptance for free — no edit needed, verified not assumed; (3) scripts/export-backlog-snapshot.js and scripts/check-session-docs.js filter history on done/removed and are deliberately untouched, because a delivered ticket is NOT history until John accepts it; (4) the spec's decision 2 renames Reverse to "Reject" and has NOT shipped, so no rule here is written against a button that does not exist. A delivered ticket is stepped past at step 5 as a fourth blocked-prefix row but is deliberately NOT a record_skip() call — its undecided ship card already carries that ask, and a second home for it is how §10 stops being read. Forward only: the 61 existing `done` rows are untouched, no backfill. 1 overload per .claude/rules/supabase-function-signature.md; grants asserted BOTH directions per SES-101 (anon/authenticated false, service_role/postgres true). All fixtures rolled back clean (0 delivered rows, 0 stray before-images, 0 stray runner_items, control function gone). Doc + schema; no src/api/lib change, no site change. -->
<!-- DeepBench v7.0.201 | runbooks/runner-cycle.md | SES-147 — step 3's token track stops being five ranked rules a cycle applies by hand and becomes ONE CALL, and John's standing DAILY MAX joins the ladder. His words 2026-08-23, verbatim: "In the automation section Place a <dailymax> open text box of the millions of tokens allowed during the day. for today set it 25M and make sure the routines honor it." Locked spec docs/BRIEFING-REDESIGN-0822.md §2b item 3. Migration ses147_daily_max_tokens adds runner_settings.daily_max_tokens_millions (nullable, CHECK 1..1000) and public.resolve_day_token_cap(uuid): override > 48h stale floor > the box > SES-128 calibration > the 10M default, returning cap_source and cap_reason so a cycle's ledger note traces to a RUNG rather than to its own reading of a paragraph. TENTH prose→code correction (SES-86 phase 3, v7.0.146, SES-101, SES-111, SES-127, SES-128, SES-129, SES-143, dir 16b3ff73) — adding a sixth rank to the prose would have been the tenth repetition of the mistake instead. THE RUNG MOST LIKELY TO BE GOT WRONG, and the reason this ticket has a negative control rather than a checklist: the 48h STALE FLOOR SITS ABOVE THE BOX. The obvious reading of "the box is THE day cap" puts it at rung 1, which hands a runner with no idea how much of John's meter is left a 25M budget; his spec says it in one clause — "a standing number must not defeat the staleness brake" — and on identical fixtures the shipped build returns 3,000,000/stale-floor where the box-above-the-brake build returns 4,000,000. A one-day override still beats the standing box (later, more specific word — the same reasoning that puts a pin above the automation lane). Blank box = rungs 1/2/4/5 EXACTLY as before, which is what makes this additive; NULL must never be coerced to 0, in the column, the harvest, or the render. THE DEFECT THIS TICKET'S OWN QA CAUGHT BEFORE IT SHIPPED, recorded because a completeness check passed on the broken build: the first build declared rest_pct/meter_pct numeric while runner_budget.weekly_rest_pct is integer, so EVERY RETURN QUERY raised 42804 — on rung 1, the rung today takes — and a budget check that errors is a cycle that cannot run at all. Only CALLING each rung found it. All seven arms proved live on fixtures inside a deliberately rolled-back transaction (override-beats-box, box-is-the-cap, stale-beats-box, no-reading-beats-box, blank-box = pre-SES-147 exactly, the CHECK rejecting 0 and 1001, the rest wall REPORTED and not enforced), rollback verified clean (box back to NULL, override still queued, 10 readings intact, max pct 37). Grants asserted BOTH directions per SES-101 (anon/authenticated false, service_role true, revoked from PUBLIC); 1 overload per .claude/rules/supabase-function-signature.md. Step 2's settings harvest gains the daily-max half; the page contract is briefing-page.md §2b, CITED not restated. Doc + schema; no src/api/lib change, no site change. -->
<!-- DeepBench v7.0.196 | runbooks/runner-cycle.md | SES-151 — step 1b's pacing becomes JOHN'S CLOCK GRID: a scheduled fire runs iff its cycle row's started_at falls in an America/Chicago hour divisible by interval_hours (3 → 12/3/6/9 AM/PM his clock, DST-proof; John's order 2026-08-23 "change the scheduler back to 3 hours, and it runs at 12,3,6,9"). Kills the mixed-clock elapsed-hours test that wrongly paced 3 of 9 hourly fires (cycle 6177c7aa, q-hourly-interval-boundary) and the boundary coin-flip an interval equal to the cron period created. Migration ses151_scheduler_clock_grid_chained_trigger also WIDENED runner_cycles_trigger_check to admit 'chained (drain continuation)' — found live this session: the marker required since SES-141 (v7.0.180) and named as SES-140's proof criterion was never insertable (23514 on the first real attempt, 16:47:12Z; the identical INSERT succeeded post-migration and is cycle a11c94d2, the first chained row in the runner's life). QA: six gate arms discriminating (next cron 17:40Z=12:00 Chicago → run where the retired build paced it; 13:00 → paced; chained exempt; off-grid-minute manual exempt; off switch binds; the killed 15:41Z fire correctly paced under 3h), 1 overload, grants both directions. -->
<!-- DeepBench v7.0.195 | runbooks/runner-cycle.md | SES-140 FINAL — tail step (8) stops spawning sessions and CONTINUES THE DRAIN IN-SESSION. John's order 2026-08-23 (attended session successional-review, 6-requirement directive), replacing his SES-141 ruling: one ticket per CYCLE ROW stays the law; a session runs successive cycles while a drain stands. Why the spawn era is over, all measured live: fire_trigger refused (routine created via http_api); create_session refused 3x across two parents incl. with permission_mode explicit at 25 min ("parent session's permission mode is not yet available"); the v7.0.190 rung-2 one-shot create_trigger actually FIRED at 15:11:36Z (trig_015wHzkN7kiEBTdChhYaFVua) and the launched session booted without the git source or a usable tool list (create_trigger exposes no sources/allowed_tools) and never wrote a row — a silent dead spawn, checked again 16:19Z, still nothing. Anthropic's Claude Code docs (read this session) confirm session-spawning is not a supported pattern; the supported "work a queue until empty" pattern is one session looping internally with the schedule as the restart net. Gates A/B, one-ticket-per-cycle-row, full ceremony per iteration, walls re-checked every iteration, and drain creation staying John-only are ALL unchanged. The ACTUATOR LADDER block is deleted; its evidence is preserved in step (8)'s retirement paragraph so nobody rebuilds it. Companion ship v7.0.196 (SES-151) puts the scheduler on John's 12/3/6/9 CST clock grid. -->
<!-- DeepBench v7.0.190 | runbooks/runner-cycle.md | SES-140 — tail step (8)'s actuator becomes a TWO-RUNG LADDER, and the reason is the hardest measurement this file carries: THE CHAIN HAS NEVER ONCE RUN. Measured live 2026-08-23T14:47Z, not recalled — across all 93 cycles in the runner's life `select distinct trigger from runner_cycles` returns `scheduled | supervised`, ZERO chained rows. So ARCHITECTURE.md §19v §Operations' "24x7 as chained short sessions" has been unbuilt in practice since SES-139 shipped the step, and the real cadence has always been the hourly cron alone. JOHN REPORTED IT FIVE TIMES IN ONE HOUR and this cycle is his word, not its own idea: Rework on SES-139 ("still don't see the drain starting the next session on its own"), SES-142 ("still can not get drain to run until completion of list of tickets"), SES-143 ("still have not seen drain run according to the rules that are displayed"), the SES-140 gated card, and its follow-up card ("drain must work no matter what... this ticket and others can not be closed"). A Rework is a directive and selection layer 1a puts a directive above the board, so SES-147 at queue 1 was stepped past on PRECEDENCE, not on a block — and deliberately with NO record_skip row, because a precedence step-past is not something John has to clear. BOTH PRIOR ACTUATORS ARE REFUSED, FOR TWO UNRELATED REASONS: fire_trigger because an agent may not fire a routine it did not create (SES-140), and create_session because "the parent session's permission mode is not yet available" — refused TWICE by predecessor 72561db3 at ~14:0xZ, 25 minutes into that parent, so NOT a warm-up race; the value appears never to be recorded for a trigger-started session, and neither remedy the message offers (retry / run the parent in auto mode) is reachable from inside a cycle. Rung 1 stays create_session (John's ruling, SES-141) with permission_mode passed explicitly, one attempt; rung 2 is a one-shot create_trigger (run_once_at ~2 min, create_new_session_on_fire) where the SCHEDULER creates the session exactly as the :40 cron does twelve times a day, so the parent-mode check is never reached. attempts-per-tier <= 1 is what keeps "exactly one successor" true: a refusal creates no session, so at most one can exist. QA PROVEN LIVE WITHOUT SPAWNING ANYTHING — probe trig_01Y1EeMzj8g7yQHxSeLs4MFF created 14:49:19Z, verified, deleted, rollback clean (list_triggers returns the two real routines only): a one-shot from a scheduled cycle auto-inherits env_01GuEzm2nCHbCB5SumvQVEQ1 and ALL FOUR MCP connections, so environment_id and connectors must NOT be passed (connectors can only narrow, so a partial list would REMOVE connections). NEGATIVE CONTROL is the predecessor's own double refusal an hour earlier on the same platform — one variable, the actuator — which is what makes this discriminating rather than merely complete: doing nothing is exactly what 72561db3 did, and it got refused. DISCLOSED RATHER THAN LEFT TO BE DISCOVERED: the probe's session_context carried a DEFAULT allowed_tools preset and NO sources entry where the runner routine names both, so a rung-2 successor may come up without the clone (fails at step 1, recoverable — Gate A means a failed cycle fires nothing further) or without Artifact (can harvest, build, ship and write its row, but cannot republish the page); the first chained cycle owes that observation and nobody else can make it. Not a SES-019 route-around, and the ladder is shaped to make that plain: what the platform scoped is WHO MAY FIRE and WHICH CALLER MAY CREATE — mechanics, not the runner's authority, which John granted (SES-139 "Yes") and ruled on (SES-141). Gates A and B, exactly one successor, and drain creation staying John-only are all untouched. Also corrected from a live board read: exactly ONE open ticket concerns the drain chain (SES-140 itself) — SES-139/141/142/143 are all done, so John's "more than 5" are their undecided briefing CARDS, which calls for the opposite action from five open tickets. Doc-only; no src/api/lib change, no schema change, no site change. -->
<!-- DeepBench v7.0.188 | runbooks/runner-cycle.md | SES-146 — step 1b's own instruction was FALSE, and the gate it describes had never once paced a cycle that obeyed it literally. FOUND LIVE 2026-08-23T13:44Z by cycle 72561db3 while executing this very step, not reasoned about. This step tells every cycle to pass "<your prompt's trigger: line, verbatim>" and the routine's line reads `trigger: scheduled`; scheduler_gate() tested `p_trigger = 'scheduled'` by EXACT EQUALITY, so the literal form fell through to "not a scheduled cycle" and skipped the pacing branch AND the scheduler_on=false branch beneath it — John's interval and his off switch, both inert, both failing OPEN so neither the ledger nor the page ever showed it. NEGATIVE CONTROL, one cycle id, one instant, one variable: 'trigger: scheduled' -> "not a scheduled cycle"; 'scheduled' -> "manual fire". The five paced rows to date all passed the BARE word — every prior cycle read the instruction loosely and got lucky, which is why the defect survived a ship whose whole purpose was to make the panel binding. SECOND, INDEPENDENT DEFECT, and it is the one that gets worse on its own: v_manual compared `p_started` (now() at the moment the cycle REACHES this step) against cron_minute with a hardcoded ±2, so the grid test drifts with how much work step 0 did first — this cycle fired at 13:40:52Z, reached the gate at 13:43:12Z, distance 3, and was exempted as a "manual fire" it was not. As this runbook grows, more cycles exempt themselves. Migration ses146_scheduler_gate_trigger_parse: normalise the trigger (strip leading `trigger:`, trim, lower), anchor the grid to the cycle row's OWN started_at (stamped at step 1, the earliest fire-time proxy reachable from SQL; an unresolvable id falls back to p_started rather than raising, so the unknown path still fails open), and make the tolerance the COLUMN runner_settings.grid_tolerance_min (default 10, CHECK 0..30) — SES-143's own "the minute as a column, not a literal" precedent applied one level further, so correcting it is one UPDATE. ALL FOUR SES-143 PROPERTIES PRESERVED AND RE-ASSERTED, the predecessor predicate byte-for-byte (arm G: p_started 11:00Z correctly skips the 10:41Z did_not_run row and returns the 09:42Z shipped one) — that is the property whose naive form wedges the runner shut permanently. QA was discriminating rather than merely complete: arms A (literal line), B (bare word reached 3 min late) and D (scheduler_on=false) each return a DIFFERENT verdict on the two builds against identical inputs — paced/paced/scheduler-off shipped, run/run/run retired — and the retired-build values are this cycle's own pre-migration measurements at 13:44Z, not a reconstruction. Arm H confirms the fix does not invalidate the cycle that shipped it (1.18h >= 1h -> run). The fixture arm rolled back clean (scheduler_on true, 0 stray before-images); signature UNCHANGED so no overload (asserted 1) per .claude/rules/supabase-function-signature.md; grants asserted BOTH directions per SES-101 (anon/authenticated false, service_role true). DISCLOSED rather than left to be discovered: this cycle both FILED SES-146 and built it, because the buildable prefix of the queue was empty — SES-140/SES-121 needs-john, SES-117/SES-118 needs-desktop, SES-84 has no unattended build left (its remainder is John ratifying drip cards), SES-101's remainder is a .claude/ edit — and the first buildable ticket, SES-131, is a two-leg live-research epic that does not fit the tokens left under today's cap. Lane-top placement is John's own standing rule for a new automation ticket (q-lane-top, yes, 2026-08-21), and the change NARROWS runner autonomy rather than widening it: it makes his own off switch bind. Doc + schema; no src/api/lib change, no site change. -->
<!-- DeepBench v7.0.185 | runbooks/runner-cycle.md | SES-119 (b) — the Language block gains the half of John's standing instruction this file never carried: a ticket named in anything he reads carries its TITLE, not just its ID. His scope is verbatim and total ("across every session, display or anything that references work you perform for the backlog"), and it is the SAME sentence as the priority-class clause one level out — he should not have to memorize the digits of a class, and he should not have to memorize what SES-140 IS. v7.0.184 shipped the briefing-page.md half of part (b) and closed `partial` on the 3-file cap, promising the exact replacement text on its card; READ LIVE THIS CYCLE, that text is NOT there — the only SES-119 card (8a8559a7) covers §8 and §10 and never mentions part (b) — so it is written here from the shipped briefing-page.md wording rather than passed on silently, which is what keeps the two files stating one rule instead of two. MEASURED, NOT QUOTED, and the measurement is what shapes the rule: 562 open numbered tickets, `title IS NULL` on 0, and 50 falling back — so on 50 tickets the STORED title is a retired declaration marker (38 literally `Post-beta`), which is why the paragraph names public.backlog_display_title(title, description) as the source instead of saying "use the title column". That shorter sentence is the one that renders `Post-beta` as a ticket's name on the page he reads. THE ONE THAT WOULD HAVE SHIPPED WRONG: writing "always show ID + title" and stopping. The immediately preceding member of this rule family did exactly that — step 9's "backlog ID + Type + named P-class" told cycles to compose a display string into runner_items.backlog_id, a JOIN KEY, and every card→ticket join returned nothing on 63 of 80 rows (SES-116, v7.0.174) — so the render-time boundary ships as a stated bound, not an inference, alongside the rule that a fallback is a signal about the ticket rather than a blank to hand-fill (SES-117's TITLE CHECK is that structural fix). The §8 predicate, the rejected length heuristic and the CHI-97 boundary are CITED to briefing-page.md, never restated, per the v7.0.114 drift lesson. Doc-only; no src/api/lib change, no schema change, no site change. SES-119 closes `done`: both halves of part (b) now exist and (a)/(c) shipped in v7.0.184. -->
<!-- DeepBench v7.0.182 | runbooks/runner-cycle.md | SES-143 — new step 1b, THE SETTINGS GATE: John's §2b Automation panel stops being a display and becomes binding. Locked spec docs/BRIEFING-REDESIGN-0822.md §2b (committed 840639e5). THE MECHANISM, and it is why the ticket has this shape: a cycle CANNOT edit the routine that fired it — the platform refused exactly that on 2026-08-23 (SES-140, verbatim: "fire_trigger: this routine was created via http_api, not by an agent") — so the panel cannot touch the cron and does not need to. The stored prompt already says "execute runner-cycle.md EXACTLY", so a gate written HERE binds every future cycle with no trigger edit: the cron stays hourly PERMANENTLY and each cycle paces ITSELF down to John's N, which also retires SES-140's restore obligation — there is no interval left to restore. The arithmetic is migration ses143_runner_settings's scheduler_gate(), not prose a cycle re-derives, the eighth time this platform has made that correction (SES-86 phase 3, v7.0.146, SES-101, SES-111, SES-127, SES-128, SES-129). THE ONE THAT WOULD HAVE SHIPPED WRONG AND WEDGES THE RUNNER SHUT FOREVER: a predecessor read as "the most recent runner_cycles row" means t=0 runs, t=1h paces, and every later fire's predecessor is the paced row an hour before it — always <3h old, so nothing ever runs again and only John notices. The predecessor is therefore the last cycle whose outcome is NOT did_not_run (an open row counts, a failed row counts). NEGATIVE CONTROL, not reasoning: on identical fixtures the shipped predicate returns run and the naive one returns paced. It FAILS OPEN on every unknown — no settings row, a NULL column, no predecessor, an unrecognised trigger — because a gate that can stop the fleet must never stop it by accident; scheduler_on=false is the only off switch and that is John's decision. Scope is his, verbatim: the scheduler governs SCHEDULED cycles only, so a chained drain successor (SES-141) is exempt and while a drain stands the CHAIN, not the interval, sets the cadence — disclosed rather than discovered. THE HALF THE SPEC DID NOT SETTLE: it is silent on John's own manual fire, and §2b puts his "Run a cycle now" link on that very panel, so a paced-out tap is a dead button — a fire off the cron grid is exempt, the same test step 1 already uses, with the minute as a COLUMN (cron_minute) not a literal, and q-manual-fire-pacing asks him to confirm. Step 9's tail gains the settings harvest, including the drain checkbox as drain CREATION — already sanctioned by drain_epic_next property 5 ("a directive row or a briefing tap"), and the runner still may never start one itself. All nine QA arms proved live on fixtures inside a deliberately rolled-back transaction; grants asserted BOTH directions per SES-101 and DAT-18. Doc + schema; no src/api/lib change, no site change. -->
<!-- DeepBench v7.0.180 | runbooks/runner-cycle.md | SES-141 — tail step (8)'s actuator swapped: fire_trigger (platform-refused on a routine the agent did not create, SES-140) becomes create_session, per John's verbatim ruling 2026-08-23: "we should still only do 1 ticket per session, just have the prompt kick off another session." Gates A/B and every SES-139 bound unchanged; the spawned session carries the runner prompt verbatim with a `chained (drain continuation)` trigger marker and echoes it into its runner_cycles row; GOVERNANCE-MODES.md now states chained sessions are runner-launched. Not a route-around of SES-140 (SES-019's rule stands): John authorized this exact mechanism after the refusal was stated plainly. Shipped by the ATTENDED design-briefing-redesign session — doc-only, and deliberately not left to a cycle, because the chain fix waiting on the chain was itself the stall. Live-spawn proof deliberately still owed: the first chained session appearing with its marker echoed is the QA, observable on the next draining cycle's tail. -->
<!-- DeepBench v7.0.179 | runbooks/runner-cycle.md | SES-142 — a standing drain finishes on the FIXED member list John named, never on the live now-tier predicate. His ruling, verbatim: "the user must name when the drain is done… The use case is the epic automation — all its current tickets in the now bucket are complete." MEASURED BEFORE A LINE CHANGED, and the defect selected the very cycle that fixed it: John named 18 members on directive b74009ea; the epic's live now tier held 19; the extra one was SES-142 ITSELF, filed 03:51Z after the naming — and drain_epic_next() returned it as the pick. Cycles file into a drained epic continuously (SES-140, SES-141, SES-142 all landed in one night), so open_now = 0 receded as fast as the runner approached it and a standing order John gave with an end in mind was becoming an open-ended mandate the runner granted itself. That is an authorisation defect, not a tidy-up. Migration ses142_drain_scope: new public.runner_drain_scope (one FK row per named member, unique (directive_id, item_id)), drain_epic_next() rewritten to pick from and retire on THAT list, and the standing drain backfilled with John's 18 (before-image per INSERT, row_data = NULL). A TABLE OF FKs RATHER THAN THE text[] THE TICKET ALSO ALLOWED, for a reason this repo has already paid for: backlog_id is NOT unique (CHI-48 occupies two rows, SES-97), so an id array silently pulls in both — the same "the epic is an FK, never prose" property SES-111 already states, applied to the scope. THE DECISION MOST LIKELY TO BE GOT WRONG LATER, so it is written as a property: the named list REPLACES the tier predicate and is not kept alongside it — keeping tier='now' leaves a SECOND moving predicate, so re-tiering a named ticket would silently drop it out of a drain John declared over it (proven live: with SES-141 re-tiered to next, the shipped build still picks it, the retired build picks SES-140 instead). New fifth outcome `unscoped` — a drain with no named list falls through to the board like `blocked` but is deliberately NOT called `blocked`, because the one thing it must never do is quietly fall back to the live predicate, which is the bug wearing a default's clothes; it also does not retire the drain. QA was discriminating rather than merely complete: the retirement arm is claim-independent (all 18 named marked done inside a deliberately rolled-back transaction -> shipped build `retired`, retired build still sees SES-142 open and keeps draining), and the negative control for the pick is this cycle's OWN pre-migration call at 03:52Z, which returned pick SES-142 / open_now 19 against the shipped build's pick SES-141 / open_now 18 on identical live data. Rollback proved clean on every fixture (directive still queued, 0 named done, 0 stray before-images). Grants asserted BOTH directions per SES-101 on the function AND all four DML verbs on the table per DAT-18. Two stale claims in this file corrected from a live read, not recalled: SES-110/SES-106 are both `done`, so the "cannot drain to completion" paragraph and the tail's "does NOT self-terminate" paragraph both named a blocker that is gone — while the half that still holds (the pick predicate never reads design_status, so SES-140's needs-john flag is skipped procedurally at step 5) is kept and said plainly. Doc + schema; no src/api/lib change, no site change. -->
<!-- DeepBench v7.0.176 | runbooks/runner-cycle.md | SES-139 — the serial tail gains step (8): a draining cycle fires exactly one successor. Root cause of the stall, from John's "find root cause why automation is stalling": SES-111 changed what a cycle PICKS and nothing anywhere fired the NEXT one, so the back-to-back cadence of 2026-08-22→23 was hands on manual fires and fell to the 3h cron the moment they stopped. NOT a widening of §19v — its Operations paragraph has specified "24×7 as chained short sessions" since 2026-08-19 and only the cron half was ever built; John authorised the rest explicitly ("Yes", 2026-08-23, after it was stated plainly). THE GATE THE TICKET DID NOT HAVE, and it is the whole safety of the step: bound (2) reads "only from a cycle that ran its tail", and a wall-stop RUNS its tail (step 3, verbatim) — so as filed, a token-wall stop fires a successor that stops at the same wall and fires another, an unbounded loop of did_not_run rows that converts the budget wall from a brake into a metronome. Gate A (outcome ∈ shipped/gated_before_build/reverted) is what makes a wall-stop the END of the chain. Measured at ship, not reasoned: 20,851,000 est tokens across 27 cycles in the CST day against John's 25M override 43a9d4ae expiring 05:00Z, after which the allowance reverts to a 10M cap the day had already passed — the first fire after 05:00Z wall-stops. Gate B's drain_epic_next call is deliberately NOT a preview: read from pg_get_functiondef, it writes a before-image and closes the directive on the empty path, so the last cycle of a drain closes it and fires nothing. Its parameter is a STAMP, not a selector — this cycle passed the epic id at step 5 and got a correct pick with no write, which is exactly why the trap is written down at the second call site, where retirement makes it cost something. DISCLOSED RATHER THAN PAPERED OVER: the ticket's bound (3) self-termination does not currently hold — SES-110 is partial with a .claude/ half (B39, card 9e7d8bf2) and the pick predicate never reads design_status, so a needs-desktop member returns as a pick, is skipped at step 5 (SES-114), and the cycle builds from the board instead; the real bound is Gate A plus the token wall. Drain CREATION stays John-only (property 5), fleet size stays N not N^2. Doc-only; no code, no schema, no site change. -->
<!-- DeepBench v7.0.174 | runbooks/runner-cycle.md | SES-116 — step 9's card-filing line stops teaching the defect it caused. It read "backlog ID + Type + named P-class per the Language block above", so every cycle composed 'SES-115 (Tooling · P10 - Tooling)' and stored it in `runner_items.backlog_id` — a JOIN KEY to `backlog_items.backlog_id`. Every card→ticket join therefore returned nothing, silently: the help-me ticket, the pending-on-John views, SES-112's needs-john backfill. The Language block governs what John READS and never governed a key column. MEASURED BEFORE A LINE CHANGED and the ticket UNDER-COUNTED IT 20×: it says "3 of 4 open gated cards"; the live census was 63 of 80 non-NULL rows violating, SEVEN of them undecided (CHI-84 and AGT-015 among them — both real, both mis-joining while sitting on John's page awaiting his tap). Corroboration that this was already costing real work rather than being theoretical: v7.0.173's own SES-115 view had to reach the ticket through `substring(backlog_id from '^[A-Za-z]+-[0-9]+')` because the direct join matched zero rows — a workaround written one cycle earlier, for this. Migration ses116_backlog_id_bare_check: new nullable `display_ref`, 63 rows repaired (41 to a bare id, 22 to display_ref-only), then `ck_runner_items_backlog_id_bare` VALID. THE HALF THE TICKET DID NOT ANTICIPATE, and it is why display_ref exists rather than NULL: the ticket's "NULL stays allowed for non-ticket cards" is right for a card that never had a reference, but 22 live rows carry the ONLY copy of a real one — eleven a directive uuid, two a governance register, two an ARCHITECTURE clause — so nulling them destroys it (§19v) and blanks the id chip on two cards John has not yet decided. THE ONE THAT WOULD HAVE SHIPPED A LIVE HAZARD: `NOT VALID` looks like the safe way to avoid touching history and is the opposite — it is still enforced on UPDATE, so those 22 rows become un-updatable and the next harvest of John's tap on card 477454d7 FAILS. That arm is QA'd explicitly (D=PASS) rather than reasoned about. Pattern surveyed, not chosen: matches all 603 live backlog_items ids, zero exceptions. All five QA arms proved live on fixtures inside a deliberately rolled-back transaction, both directions per SES-101. -->
<!-- DeepBench v7.0.165 | runbooks/runner-cycle.md | SES-114 — the blocked prefix of the queue is READ, not re-derived. Three flags mean "keeps its number, step past it" — `status = 'removal proposed'` (SES-113), `design_status = 'needs-john'`, `design_status = 'needs-desktop'` — and until now only the first was visible to step 5's selection query, so a blocked ticket looked exactly like a buildable one and the only way to tell was to read its description and reason the blocker out again. MEASURED, and this cycle paid the cost it is fixing: live `runner_skips` at 23:10Z held SES-106 and SES-110 at queue 1 and 3, the top of John's standing Automation drain, and their `skip_count` went 1 -> 2 while this cycle re-established for the THIRD time that day what cycles 1df7d9c6 (19:12Z) and ed1a5eb3 (23:03Z) had already established. Three re-derivations of one answer on a 3-hour cadence. THE HALF THAT WOULD HAVE SHIPPED INERT: census before a line changed — `design_status` was `designed` on 23 rows and NULL on 573, with ZERO rows carrying `needs-john` or `needs-desktop`. Projecting the column alone adds a skip that can never fire and a QA that passes while nothing changes, so (b) the filing-time write ships in the SAME commit, and the two live permission-gate rows were corrected to `needs-desktop` from THEIR OWN descriptions (before-image first), never from this cycle's opinion. CHI-89 deliberately untouched: `removal proposed` lives in `status`, and giving one fact a second home is how two copies start disagreeing. Step 6 gains the `designed` fast path — 18 open tickets carry it and SES-112's CHECK guarantees the `kickoff_link` is there — with revalidation explicitly NOT skipped by it. Same prose->column correction as SES-86 phase 3 / SES-101 / SES-111 / SES-127: a rule each cycle must re-derive is a rule that gets re-derived differently, or three times. -->
<!-- DeepBench v7.0.164 | runbooks/runner-cycle.md | SES-129 — step 9's "mark the directive `done`" becomes the one call that cannot forget the half John reads. §7's new follow-through card tells him what became of each directive he wrote, and the outcome it needs exists nowhere: measured before a line changed, runner_cycles.item_id — the only plausible derivation — holds a runner_items uuid, the directive's OWN id, and free prose (one value a 96-character sentence) across the 24 closed rows, so deriving it renders a column of uuids and half-sentences. New close_directive(cycle, directive, outcome, note), migration ses129_directive_outcome, sets status + acted_cycle + outcome + note in one call, writes its own before-image, and RAISES rather than defaulting when the outcome or the note is missing. That is deliberate and is the whole point: a second write a cycle must remember is the failure this platform has now paid for six times (SES-86 phase 3, v7.0.146, SES-101, SES-111, SES-127, SES-128), and the previous wording — three words, "mark it done" — is exactly the shape those six took. Idempotent in the direction that matters: a directive already closed WITH an outcome returns already_closed and is untouched, so a re-run can never overwrite a verdict already sitting on John's card. 'closed_unrecorded' is rejected by the function and accepted only by the column's CHECK, so the 24 backfilled rows can say what is true while no cycle can ever label its own work unrecorded. QA proved all five arms live on a fixture inside a rolled-back transaction (bad outcome rejected by the function's OWN message, backfill-only value rejected, blank note rejected, real close lands, second call preserves the note), and the grants were asserted BOTH directions per SES-101 — anon/authenticated false, service_role true. -->
<!-- DeepBench v7.0.163 | runbooks/runner-cycle.md | SES-128 — step 3's token track stops describing a calibration nobody performs and gains the call that performs it. MEASURED BEFORE A LINE CHANGED: all eight rows in runner_usage_readings carry tokens_per_pct = NULL, so step (c)'s "calibrate from the two most recent readings" has NEVER ONCE been carried out in the life of this runner — every allowance it has computed fell through to the uncalibrated 10M cap or the 3M stale floor. THE HALF THAT MATTERS AND IS NOT A FORGETTING: the two most recent readings are the WRONG WINDOW. John's meter is spent by his own manual sessions as well as the runner, so a rate measured across a mixed window is confidently wrong no matter how carefully a cycle does the arithmetic. Only a night→morning pair brackets a runner-only window, which is why SES-128 puts a slot on the reading and why derive_token_allowance() reads that pair and nothing else. Same prose→code correction as SES-86 phase 3 / v7.0.146 / SES-101 / SES-111 / SES-127, and the sixth time this platform has paid for the alternative. Four guards return NULL rather than a number, and NULL is explicitly NOT a failure — it means fall back to the guardrails that already exist. The one that would have shipped wrong: a 57-hour bracket with a positive delta and 28M real tokens inside it satisfies every arithmetic precondition and is not a runner-only window, so the 24h guard is what stands between this feature and an allowance eleven times too large. Precedence is written down as three ranked lines so no cycle re-derives it differently: John's unexpired budget_override.max_tokens outranks the derived number, which outranks the 10M/3M fallbacks, with the weekly rest wall above all three and overridable by none. And the ONE assumption inside the function is named in the open rather than buried: the meter-week reset day is stored nowhere, so the pool is divided by the worst case of 7 — fail-closed, can only under-spend — with question q-meter-week-anchor filed to replace it with John's real answer, at which point the allowance gets larger and never smaller. -->
<!-- DeepBench v7.0.209 | runbooks/runner-cycle.md | SES-166 — design_status gains 'john-paced' (John ratifying on-page cards; step past, record NO skip — the SES-154 one-ask-one-home boundary applied to a non-delivered ticket). Step 5's table + the delivered paragraph + the drain note updated; migration ses166_john_paced_design_status set SES-84 to it and resolved its skip row. Prior header (SES-121, v7.0.198): skill bodies moved verbatim to docs/runbooks/, SKILL.md files are thin loaders. -->
<!-- DeepBench v7.0.162 | runbooks/runner-cycle.md | SES-127 — step 5 stops letting a skip be a sentence, and the step-9 tail gains the two writes that creates. MEASURED BEFORE A LINE CHANGED, not recalled: fifteen public.runner_* tables exist and NOT ONE stores a skip, so every skip this platform has ever made lives as prose in runner_cycles.notes — live example read this session, cycle 1df7d9c6 at 19:12Z: "Step 5: queue #1 SES-110 skipped per B24 …". That sentence is real, correct, and completely invisible to John, who does not read the ledger; it was the only record that four of his top-five queue positions were being stepped past every cycle. New: one call, public.record_skip(cycle, ticket, reason_kind, reason), before you drop to the next ticket — migration ses127_skip_records, which writes its own before-image on both paths so the call is the whole obligation. THE HALF THAT WOULD HAVE BEEN GOT WRONG: it is idempotent AND you are meant to call it every time. John's standing Automation drain re-reads 25 open now-tier members eight cycles a day, so an INSERT-per-skip design puts the same SES-110 row in front of him 8×/day forever; uniq_open_skip bumps skip_count instead, and skip_count is itself the signal ("this has blocked 14 times"). Two boundaries stated so no cycle re-derives them differently: a skip you can resolve YOURSELF is never recorded ('claimed-by-peer' is deliberately absent from the vocabulary — a contested claim expires in 24h and the section is titled "waiting on YOUR input"), and you never resolve a skip afterwards, because §10 derives "still skipped" from backlog_items.status NOT IN ('done','removed') — building the ticket later clears the row with no write from anyone. That is the SES-86 phase 3 / SES-101 / SES-111 prose→code lesson applied by DELETING a rule rather than writing one. Tail: (3) harvests the new `unblocks` briefing-state key alongside `answers`/`asks`, and new (5b) stamps briefed_at AFTER the republish returns — briefed_at IS NULL is the NEW chip, so stamping first eats it on rows a failed publish never showed him, and stamping after risks only one extra night marked new. -->
<!-- DeepBench v7.0.158 | runbooks/runner-cycle.md | SES-113 — a `removal proposed` ticket KEEPS its earned queue slot, and step 5 gains the procedural skip that keeps it safe. John's ruling 2026-08-22, verbatim: "what if I reject the proposal?" A removal-proposed ticket is one awaiting his verdict — exactly like `needs-john` — and the two were treated oppositely: `needs-john` kept its number and was skipped, removal-proposed was stripped from the standings the moment the proposal was filed and vanished from every ranked view he has, so his Reverse had to re-insert it from nowhere. That asymmetry WAS the bug. Migration `ses113_removal_proposed_keeps_slot` changes `recompute_backlog_queue()` in exactly three predicates (the ineligible-clear WHERE, the `v_total` count, the `eligible` CTE) to `status NOT IN ('done','removed')`; everything else is byte-for-byte the prior body, all five documented ordering traps preserved and re-asserted individually against `prosrc`. The pin-clear deliberately stays `('done','removed')` — it already was — so a removal-proposed ticket now keeps its PIN as well as its number, the same rule applied consistently for the first time. MEASURED BEFORE A LINE CHANGED, not recalled: CHI-89 (`P5 - Enhancements`, tier `now`) sat at `queue = NULL` while carrying an UNDECIDED gated card (`e1c7a940`) — so John had a live decision pending on a ticket his own board would not show him in any ordered list. THE HALF THAT WOULD HAVE SHIPPED A LIVE HAZARD ALONE: step 5's read filters on `queue IS NOT NULL` and claims, NOT on status, so numbering CHI-89 makes it selectable — a cycle could build a ticket whose premise the runner has already argued is dead. The procedural skip therefore ships in THIS commit, not a later one. QA was discriminating rather than merely complete: the pick expectation (CHI-89 → slot 23, never 559) was computed by a standalone `row_number()` that never calls the function, and the NEGATIVE CONTROL restored the pre-change body inside a deliberately rolled-back transaction — it strips CHI-89 to NULL and numbers 559, against the shipped body's 23 and 560. Note honestly: this cycle's own first recompute returned 0 rows moved, because a concurrent actor filing `SES-122` at 20:12Z ran the recompute against the already-live new function first — that 0 is idempotence, NOT evidence the change works, and is precisely the false pass `SES-86` phase 2 was bitten by; the negative control is what carries the proof. 560 numbered `1..560`, all distinct, 0 tier and 0 class inversions. Register B4 amended in RUNNER-GOV-0820-REQUIREMENTS.md: NULL = out of the standings entirely; a flag (claim / needs-john / needs-desktop / removal proposed) = IN the standings, currently skipped. `SES-114` (queue 3) generalises the skip across `design_status`. -->
<!-- DeepBench v7.0.159 | runbooks/runner-cycle.md | SES-124 — step 9 stops carrying its own copy of the briefing page's shape. The page's structure is now the LOCKED SECTION ORDER table in briefing-page.md (spec: docs/BRIEFING-REDESIGN-0822.md, John-approved mock 2026-08-22), so the two files cannot drift the way step 5 and step 7 did before v7.0.114. Two of this step's standing requirements are STRUCK because John removed the sections that carried them: the "Next up — top five" section (register B25) and the compact "Next 3" line (register B26). Said plainly rather than left to be discovered: their replacement is §8's queue matrix and §11's now-tier census, and those ship in SES-126 — so from this ship until SES-126 lands the briefing carries NO forward view of the queue. That is the redesign's own sequencing, it is disclosed on SES-124's card so John can reorder the epic in one tap, and a cycle in the gap must NOT reinstate the old sections to paper over it. Everything else in step 9 is unchanged. -->
<!-- DeepBench v7.0.156 | runbooks/runner-cycle.md | SES-111 — step 5's selection layer 1 splits into 1a (one-off directives, unchanged) and 1b, a STANDING epic drain: one `runner_directives` row John writes once (`type='drain-epic'` + `epic_id`) meaning "work this epic's open now-tier members cycle after cycle until none are left". Migration `ses111_drain_epic` adds the kind, the FK, the exclusivity CHECK, and `public.drain_epic_next(uuid)` — the rule as CODE, because a rule each cycle re-derives from John's sentence is one that gets re-derived differently (SES-86 phase 3 and v7.0.146 are the same lesson twice). Premise MEASURED before a line was written, not recalled: inserting a drain-epic row returned 23514 against the old two-value type CHECK, so the sentence could not even be stored. Five properties, all preserved by anyone who edits this: the epic is an FK not prose; a drain is never consumed (1a's "mark it in_progress" would kill the standing-ness on cycle 1, which IS the feature); now-tier only (John's SES-110 boundary verbatim); `blocked` is NOT `retired`; and it NEVER self-activates. That fourth one is the parallel-cycles trap and the one that would have shipped wrong — the obvious implementation retires when the pick query finds nothing, which passes fourteen of fifteen checks and silently cancels John's standing order the first time two peers hold the last two claims between them. QA proved it live (sole member claimed by a peer -> blocked, open_now=1, directive untouched) alongside the ticket's own bar: two consecutive cycles with no re-declaration, cycle B advancing past TWO claimed tickets, directive still `queued`; self-retirement writing its own before-image (§19v) then returning `none`. Fixtures deleted, recompute 0 rows moved. NOT DONE and said plainly rather than discovered later: the Automation epic cannot yet drain to completion, because SES-110 is `partial` with one `.claude/` half register B39 forbids an unattended cycle (carded 9e7d8bf2) — SES-112/SES-114 are the filed fix. With no drain declared, selection is byte-for-byte v7.0.155. -->
<!-- DeepBench v7.0.150 | runbooks/runner-cycle.md | SES-106 — the ticket claim is released AFTER the push, and the runbook stops telling a cycle to do two things it cannot both do. Step 7's close-out bullet said "clear the claim in the same UPDATE that sets the ticket status"; two bullets later the same step made re-asserting that claim a HARD GATE on the push. Followed literally the gate returns 0 rows — which it defines as "your claim is gone, do NOT push" — so the two rules deadlock every ship, and cycles have been resolving it by hand, each picking an order. That per-cycle re-derivation is the exact failure SES-86 phase 3 and v7.0.146 were filed to end. NOT this cycle's call to settle: cycle cb9d1417 filed it as question q-claim-release-order and JOHN ANSWERED YES at 2026-08-21T22:05Z (read live from runner_questions this session, not recalled) — release after the push. Fixed in three places so the order cannot re-fragment: step 5's SES-86 phase 1 paragraph, step 7's close-out bullet, and a new explicit post-push release statement, holder-guarded (WHERE claimed_by = '<your cycle id>') so a cycle whose claim expired and was re-taken can never clear its successor's. Step 9's tail parenthetical is tightened with them to name WHEN step 7 released rather than leaving it implicit again. The abort/wall-stop path is preserved and stated: no push, so release at the point the cycle stops — and an unreleased claim still expires on the 24h boundary, so no ordering choice here can strand a ticket. This cycle ran the corrected order for its own ship, so the procedure is exercised rather than only written. NOT DONE, and carded rather than attempted: .claude/skills/session-setup/SKILL.md step 2c carries the same contradiction for John's manual sessions, and .claude/ is not writable by an unattended cycle (register B39) — exact replacement text is on the card for a session he attends, so the ticket closes partial. Doc-only; no code, no site change. -->
<!-- DeepBench v7.0.149 | runbooks/runner-cycle.md | SES-109 — the committed backlog snapshot stops being one harvest stale. Step 7 exports and pushes `docs/backlog/BACKLOG-SNAPSHOT.md` BEFORE the step-9 serial tail, but register B42 (2026-08-21) moved the harvest WRITES — John's Accept/Reverse/Rework, answers that file tickets, a released pin — into that tail, so every board change a tap causes lands AFTER the export meant to capture it, leaving the board's only repo-side copy (the SES-81 restore path) systematically one cycle behind. Found live by cycle ff23297c (v7.0.148): its snapshot in 61fd3e4 recorded 571 tickets and missed SES-98 going done, SES-105 losing its pin, and SES-108 existing — all three written minutes later in its own tail. Of the ticket's two candidate fixes the tail RE-EXPORT is taken over moving the export wholesale, and the reason is structural: the export must ride the step-7 code push, and that push is deliberately kept OUT of the serial section so parallel cycles rebase-retry instead of serialising (B42) — so re-exporting once in the tail, AFTER the harvest writes, is the minimal change. It fires only when the harvest actually moved the board (the script is deterministic and prints `unchanged` otherwise), which makes it the one sanctioned second push: snapshot-only, guarded by the publish lease already held (the ticket claim is released at step-7 close-out, so it is NOT the token here), and a rebase conflict that outlives the retries degrades to exactly today's one-harvest lag, never a wall. The standing prohibition's "one push per ship point" gains that single carve-out. Doc-only; no code, no site change. -->
<!-- DeepBench v7.0.148 | runbooks/runner-cycle.md | SES-107 — step 2's ladder rule stops leaving a blank a cycle has to fill. It read "Accept → streak +1 (5 consecutive → rung +1)" and never said what happens to the streak AFTER a promotion; cycle 7392e345 hit that live at 20:27Z (tooling 4 → 5, rung 6 → 7), set the streak to 0, and correctly filed `q-ladder-streak-reset` instead of inventing the rule. John answered NO at 22:04Z — "which one just keeps the count going? no need to reset - why would i do that?" — so the streak now keeps running and the promotion test is stated as arithmetic, `streak % 5 = 0`, never "at least 5". Both halves are load-bearing: removing the reset ALONE, under a "5 or more" reading, promotes on every tap forever, which is the opposite failure and would compound the runner's autonomy on a rule nobody wrote. A Reverse still zeroes the streak (John, `1d01ea85`, "leave it") — only promotion stops resetting. MEASURED rather than assumed, and it is the honest half of this ship: John was told on the card "No = I will correct tonight's row", and replaying tonight's before-images under the new rule reproduces the STORED row exactly — the Reverses at 21:21Z and 22:22Z each zero the streak regardless, so the promised correction is a no-op. Said plainly on the briefing rather than quietly skipped. The B34 boundary paragraph's justification is corrected with it ("does not define" expired), while its conclusion stands on John's own `q-ladder-rewind` NO rather than on a missing value. NOT DONE, and carded rather than attempted: no code implements the ladder (grep -rl runner_ladder --include=*.js → nothing), so this rule is applied by hand in SQL every cycle; making it executable is his call, filed as a question. -->
<!-- DeepBench v7.0.147 | runbooks/runner-cycle.md | SES-101 — step 5's automation-lane block gains the filing rule the lane never had: a new automation ticket claims the TOP of the lane with one call, `SELECT public.claim_automation_lane_top('<TICKET-ID>')` (migration ses101_automation_lane_top). `automation_rank` has been recompute_backlog_queue()'s leading key since v7.0.133, but NOTHING assigned it at filing time, so a new automation ticket landed in the class-sorted backlog — the very failure the lane was built to end. John's ruling settles the direction: question q-lane-top, answered YES 2026-08-21T20:47Z (from directive 48ae1939 line 4, "if you create more automation tickets keep making them top of queue"), so the slot is min(open lane) − 1, never max + 1. Measured before shipping: the last three automation tickets filed were hand-assigned to the BOTTOM (SES-99=7, SES-100=8, SES-101=9) — the opposite of his answer, drifting silently for exactly the reason SES-86 phase 3 and v7.0.146 both diagnosed, that a rule each cycle must remember is a rule that gets forgotten. Function is idempotent, runs the recompute itself, and reads the OPEN lane only. A SECOND rule rides along, found live in this migration's own QA and general to every future function: REVOKE EXECUTE FROM anon, authenticated reports success and changes NOTHING while PUBLIC holds the default grant — the function-level twin of .claude/rules/supabase-column-grants.md. Asserted both directions after the corrected revoke. NOT DONE, and carded rather than attempted: the canonical INSERT at session-setup step 3c is under `.claude/`, which an unattended cycle may not write (step 0, register B39) — the exact replacement text is on the card for a session John attends. -->
<!-- DeepBench v7.0.146 | runbooks/runner-cycle.md | directive dda69acb (+ twin 6b6cdd71) — step 9's card-filing line gains the three plain-language columns (migration ses106_card_plain_language). v7.0.145 made the More-info panel's three fields required at RENDER only, as a per-card JS object literal, so the words had nowhere to live between rebuilds and register B18 ("build cards FROM the DB, never from memory") was unfollowable for them — the next cycle had to re-invent a card's wording from scratch. John Reworked two cards three minutes apart for that confusion (20:44Z, 20:46Z) and Accepted the v7.0.145 render half at 21:32Z; this is its data half. NULL stays NULL: it is what draws the red defect line, and coercing it to '' would make a missing summary look fine. Same prose→column shape as SES-86 phase 3. -->
<!-- DeepBench v7.0.145 | runbooks/runner-cycle.md | directive edab5908 — step 2 gains the `asks` harvest and step 9's tail gains the duty it creates. John typed a question box into existence ("I need to be able to ask questions about the issue"), and the rule that comes with it is that an ask he can see recorded but never answered is worse than no box: every open runner_card_asks row is answered on its own card in the rebuild. The idempotence note is not decoration — the page keeps every ask in briefing-state forever, so every cycle re-reads asks it already stored, and uniq_card_ask is the only thing stopping the log duplicating on each republish. -->
<!-- DeepBench v7.0.135 | runbooks/runner-cycle.md | SES-99, directive 48ae1939 — step 2's harvest gains `answers` (the briefing's new yes/no question list, table public.runner_questions) and step 9's "help me" line stops describing a paragraph. John: "create a question list for the briefing with a radio yes/no, instead of listing a full paragraph and i have to type out the answer." -->
<!-- DeepBench v7.0.133 | runbooks/runner-cycle.md | SES-86 phase 3, directive f47e5a95 — John's automation queue stops being prose a cycle has to remember and becomes the board's leading sort key. His line: "keep closing automation tooling tickets first before getting to the classified backlog." Step 5's layer (2) was a doc section every cycle had to go read and correctly interpret; the forgetting was silent, and it had already happened — measured 16:29Z, his automation tickets sat at queue 2/241/242/243/244/280/281 of 551 while the v7.0.130 briefing told him the next cycle would be "building product, not tooling". New nullable backlog_items.automation_rank (C4 step number, NULL = not in lane) is now recompute_backlog_queue()'s LEADING ORDER BY key, NULLS LAST, with all six prior clauses preserved beneath it; migration ses86c_automation_lane. Self-retiring by construction — a done ticket leaves the ranked set, so the lane evaporates when his automation queue completes, which is his "until automation is complete". Two boundaries written into the migration header so they travel with the code: a future pin (B23) goes ABOVE automation_rank, and the five load-bearing clauses from ses86b are unchanged. QA proved the lane discriminating (before: 5 of 7 past position 240; after: queue 1-5) and idempotence the honest way this time — 551 -> 0, then a REAL change (the SES-89 status correction) -> 548 -> 0, never one clean re-run on an unchanged board. -->
<!-- DeepBench v7.0.137 | runbooks/runner-cycle.md | register B42, John's ruling live in chat 2026-08-21 ("routines should be able to run multiple in parallel and not overwrite each other … What if i want to run 100 automated routines at once? should not be an issue - self administered and fixes itself if it happens to notice it is about to overwrite another session") — THE CYCLE-LEVEL LEASE IS RETIRED. Every fire that passes the stamp check runs; coordination moves to the resources: ticket claims (contested claim → take the next queued ticket, John's rule verbatim), atomic counters, rebase-retry×3 pushes, and ONE remaining serial section — the briefing tail (harvest→ladder→republish), guarded by the repurposed runner_lease singleton at a 10-minute TTL with wait-and-retry, never a did_not_run skip. Self-healing at the overwrite point: after taking the tail lease, re-fetch the live page and re-harvest before republishing; decision writes are idempotent (WHERE decision IS NULL). The v7.0.123 re-assertion gate retargets from the dead cycle lease to the ticket claim. Step 0b's silence definition rewritten for parallelism: open rows are normal; silence = 24h-open rows, expired claims, or a wedged 10-min tail lease. Budget walls named as approximate under parallelism (per-cycle-start checks; atomic allowance-claim is the upgrade if the fleet scales to tens). -->
<!-- DeepBench v7.0.130 | runbooks/runner-cycle.md | SES-86 phase 2 (register B4) — the board's order stops being re-derived on every read. New `backlog_items.queue` column + `public.recompute_backlog_queue()`, one idempotent full renumber (550 rows numbered 1..550 on first run; second run changed 0). Step 5's five-clause selection query is retired in favour of `ORDER BY queue`, with the five load-bearing traps moved into the function and repeated in its migration header; `queue IS NULL` now IS the not-pickable condition. Step 7 gains the completed/removed recompute; step 9's "Next up" reads real numbers instead of recomputing the sort per render. Two corrections ride along, both measured live rather than reasoned: the "456 of 550 unpickable" paragraph is FALSE since `SES-85` landed (now 550 open, 0 unclassed, all numbered — a cycle quoting the old figure under-reads its queue by 6×), and the queue's top is no longer all Tooling. The renumber deliberately does NOT touch `updated_at`: stamping every row would destroy the sort-field-edit signal the recompute is triggered by and would churn BACKLOG-SNAPSHOT.md on cycles that changed nothing. -->
<!-- DeepBench v7.0.129 | runbooks/runner-cycle.md | SES-96 — the second gated path class, named from John's captured prompt (2026-08-21): Bash against ~/.claude/projects/…/tool-results/ (where WebFetch saves its result) fires the same human-only permission prompt as .claude/ writes, and the briefing rebuild was doing exactly that (sed-slicing the prior page's HTML). Step 9 now prohibits shell-processing the fetched page's saved file; the safe procedure (parse briefing-state in context, rebuild from briefing-template.html + runner_ tables) is spelled out in briefing-page.md regeneration step 4. -->
<!-- DeepBench v7.0.127 | runbooks/runner-cycle.md | SES-86 phase 1 (claim-on-pick), John-approved live 2026-08-21 ("yes, ship it") — step 5 gains the atomic ticket claim: the moment any session (manual or scheduled) picks a backlog ticket it claims it with one UPDATE (claimed_by/claimed_at, new columns, migration ses86a_backlog_claim_on_pick); 0 rows returned = another session holds it, drop to the next ticket exactly as B24 drops past a gated card. The selection query now filters claimed tickets (24h expiry — the B37 evidence bar — so a dead session cannot strand one). Claims release in the step-7 close-out write. Manual sessions run the same claim via session-setup skill step 2c. QA: all three arms proven live on real rows (fresh claim → 1 row, contested → 0 rows, 25h-stale → re-claimable). This is the shared-board coordination John asked for after today's duplicate (SES-95 shipped attended while a cycle carded it). -->
<!-- DeepBench v7.0.123 | runbooks/runner-cycle.md | directive c4d95dc7 — the lease gains an enforcement point it never had. Self-filed by cycle 633fe486 before it stood down: the lease was asserted ONCE at claim time and never again, so a cycle whose lease was stolen on the TTL keeps building and pushing, because nothing tells it. 633fe486 came one command short of pushing a duplicate of already-shipped work to dev — the exact ADM-1 double-build (e36d4379/4da5a7bd) B31 built the lease to prevent, reached by a route the lease did not cover — and was saved only by happening to re-fetch origin/dev at the ship point. Luck, not a control. New: a holder-guarded re-assertion SELECT, defined once in step 0 and wired as a hard gate before the step-7 push and before every counter claim, with the stolen-from procedure spelled out (do not push, do not claim, do NOT release the lease, close your OWN row, push the session branch so the work is cherry-pickable, and check whether the successor already shipped the item before discarding). Step 0's TTL bullet is CORRECTED with it: the sentence "a stolen lease means the holder is dead, not slow" is disproved by measurement — 633fe486 was stolen from at ~05:52Z and was still executing normally at 13:10:51Z, ~8h, because a cloud session can be suspended and resumed across gaps invisible from inside it. A steal means SILENT, not dead — the same correction step 0b already makes for `failed`, now applied to the lease that produced it. -->
<!-- DeepBench v7.0.122 | runbooks/runner-cycle.md | directive 34865f07 — John's testimony names the mechanism behind four days of `.claude/` stalls, and step 0's clause is rewritten on it for the fourth and, this time, evidenced reason. He wrote: "Those sessions came back alive because I opened them and allowed permissions. That should not be happening." So the gate is a harness permission prompt that renders ONLY in the human session UI — invisible to the agent, unanswerable by it, and cleared by a person. The path was never blocked; `v7.0.121`'s 18-minute stall ended in a successful write. What was wrong was B38's clearing model ("an intermittent stall that clears" → "a cost, not a prohibition"), and the partition disproves it exactly: John's briefing taps stop 03:48Z and resume 12:50Z, and every probe that cleared ran inside his waking window while all three that parked 8h+/never ran inside the nine-hour hole — the two parked cycles resuming TOGETHER eighteen minutes after his first morning tap. So "budget ~35 minutes" was a sample of the attended cases only. New rule, narrower than v7.0.117's and broader than B38's: an UNATTENDED cycle never enters the gate, because it has no bounded recovery; the edit stays legitimate work needing a session John attends. Step 0b gains the leading evidenced hypothesis for a silence, plus the rule that "open the session and approve" is never written to John as a remedy — it is the thing he ruled out. His onset claim ("after the new rules of the database for the backlog") is contradicted by 21 hours and said so plainly; his mechanism is right, and a real mediated link survives. -->
<!-- DeepBench v7.0.121 | runbooks/runner-cycle.md | directive 1d01ea85 — John's three answers reach the procedure. Step 2's Reverse-on-gated bullet stops calling itself an open question: asked directly, John said "leave it", so a Reverse on a gated card still demotes and that is now his ruling (B34's second "deliberately not done" is closed; the no-retroactive-re-derivation half still stands). Step 3 gains the budget day boundary — "today" is an America/Chicago day, SQL quoted verbatim, forward-only so a stored override expiry is never retroactively shortened, and explicitly NOT the same thing as the display-only times rule. New step 0b: a predecessor that has gone quiet is PUSHED to John with why + what to do next. THAT RULE WAS REWRITTEN MID-CYCLE BY MEASUREMENT (B37): its first draft said an open row past the TTL means dead — and while it sat unshipped, the two cycles it was about (ba8f2ce3, 633fe486, both closed `failed` by a successor at 08:24Z) resumed after nine hours, finished, declined to race the live lease, and filed their work. So a successor now never adjudicates a predecessor's outcome, `failed` needs evidence rather than elapsed time, and the word is "went silent". -->
<!-- DeepBench v7.0.118 | runbooks/runner-cycle.md | directive fb643367 — John's Q1 ruling reaches the procedure. Step 2's flat "Accept → streak +1" now excludes `gated_before_build` cards: a gated Accept is permission, not a rating, and does not touch `runner_ladder`. Two boundaries written down with it, both deliberate: the rule applies forward and the ladder's history is NOT re-derived (the streak-reset-on-promotion value is undefined in the written rule, so unwinding the two earlier gated-counting harvests would invent a rule); and Reverse-on-gated is NOT covered — John ruled on Accept only, so it still demotes and the asymmetry goes to him as an open question rather than being harmonised by inference. -->
<!-- DeepBench v7.0.117 | runbooks/runner-cycle.md | directive 73e41d2c — two corrections a cycle paid for in blood. Step 0's `.claude/` clause is widened from "no inflight file" to "a cloud cycle writes NOTHING under `.claude/`, it cards the edit for a laptop session", with the three measurements behind it (a ~35-minute probe return, two cycles dead mid-run on that one mission, and a fresh probe that produced no tool result at all). Step 6 gains the rule those cycles broke: a subagent that has not returned is NOT a result — wait for it or report the question open, and leave a breadcrumb outside the paths under test so a hang still says where it hung. -->
<!-- DeepBench v7.0.114 | runbooks/runner-cycle.md | SES-83 (d) cycle 3 — step 7's close-out line stops telling every cycle to edit a `FEATURES*.md` row (status + P-class) and names the Supabase write instead. Cycle 1 flipped SELECTION to the table but left this WRITE line pointing at the files, so from v7.0.113 (the trim) until now the runbook contradicted itself: step 5 read the table, step 7 told the same cycle to update a stub. Found by the cycle-3 ceremony sweep. NOTE FOR JOHN: the stored routine prompt's step 4 still names the three markdown files for work selection — superseded by step 5 here, but only he can edit that prompt. -->
<!-- DeepBench v7.0.112 | runbooks/runner-cycle.md | SES-83 (d) — step 5's selection layer (3) stops parsing FEATURES.md / FEATURES-NEXT.md / FEATURES-LATER.md and reads public.backlog_items via one canonical SQL query, quoted verbatim. John's "table is authority" call, Accepted 2026-08-21T00:19Z. Four live traps encoded in the query itself: numeric P-class ordering (lexical puts P10 before P2), the `· FLAGGED` suffix, the Beta-gate/Post-beta declaration regex (ILIKE '%beta%' over-matches by 20), and `title` holding the class string for imported tickets. Layers (1) directives and (2) John's automation queue are unchanged and still outrank the table. -->
<!-- DeepBench v7.0.108 | runbooks/runner-cycle.md | SES-89 — new step 8b, the Heal sweep: `scripts/heal-engine.js` groups `durable_hops` failures into signatures and files evidenced `P9 - Bug Fixes` tickets (dry-run by default; the cycle claims the id block and passes it in). Reads `durable_hops`, NOT `ai_activity_log` — the latter has no error column, verified live. -->
<!-- DeepBench v7.0.107 | runbooks/runner-cycle.md | SES-83c — step 7 gains the backlog snapshot export: `scripts/export-backlog-snapshot.js` regenerates `docs/backlog/BACKLOG-SNAPSHOT.md` into the ship commit set, so the Supabase board has a git-history + offline restore copy (SES-81's backup gap). Deterministic by construction — an unchanged table writes nothing. -->
<!-- DeepBench v7.0.106 | runbooks/runner-cycle.md | B31 — step-0 assertion (2) becomes an atomic lease claim on the new public.runner_lease singleton, and every exit path releases it. The read it replaces ("no foreign open cycle") missed a cycle opened 17 seconds earlier and let two cycles build ADM-1 v1 in parallel (e36d4379 vs 4da5a7bd, 2026-08-20). -->
<!-- DeepBench v7.0.105 | runbooks/runner-cycle.md | B32 — the subscription-token wall gains the same unexpired-budget_override escape the dollar wall already had (new runner_directives.max_tokens + .expires_at, both nullable/fail-closed). John live 2026-08-20: "allow overance for the day and keep sessions going." The weekly rest wall stays non-overridable; the API-dollar wall still needs its own max_usd override. -->
<!-- DeepBench v7.0.102 | runbooks/runner-cycle.md | B17 BACKFILL — codify the two step-0 assertions (stamp match, no foreign open cycle) John accepted 2026-08-20 12:51Z and the step-9 register B18 briefing-rebuild rule (build cards FROM the DB's undecided runner_items, not from in-cycle memory). -->
<!-- DeepBench v7.0.99 | runbooks/runner-cycle.md | S-SES-78c — the Automated-mode cycle: the nine steps as an executable standing prompt. Governing: ARCHITECTURE.md §19v; design: docs/SES-78-RUNNER-DESIGN.md. -->
# Runner Cycle — Standing Prompt (§19v)

You are one cycle of DeepBench's Automated development runner, executing in an isolated cloud
session. Your routine prompt carries your **stamp** and **trigger** — echo both into your
cycle row. Run the steps in order; **fail closed at every wall** (log a `did_not_run` cycle and
end — never proceed on hope). Everything you ship must satisfy `ARCHITECTURE.md` §19v; when this
runbook and §19v disagree, §19v wins and the disagreement is itself a briefing item.

**Language (John, 2026-08-20, `design-runner-gov-0820`).** Cycle outcomes are `shipped` /
`gated_before_build` / `reverted` / `did_not_run` / `failed` (the `runner_cycles` check
constraint; the former values `noop` and `proposal` are retired — the constraint rejects them).
In anything John reads — briefing cards, notifications, chat — write them as plain words:
"did not run", "gated before build". A priority class is **always written named, never a bare
digit**: `P1 - Improves John's Skills`, `P2 - Inventive`, `P3 - Investor Value`,
`P4 - New Customers`, `P5 - Enhancements`, `P6 - Agent Enhancement`, `P7 - Agent Creation`,
`P8 - Determinism Removal`, `P9 - Bug Fixes`, `P10 - Tooling` (canonical list: `FEATURES.md`'s
Priority Class legend). John should never have to memorize the digits.

**A TICKET NAMED IN ANYTHING JOHN READS CARRIES ITS TITLE, NOT JUST ITS ID (`SES-119` part (b),
`v7.0.185`; John's standing instruction 2026-08-22).** His scope is verbatim and it is total:
*"across every session, display or anything that references work you perform for the backlog"* —
always **ID + title**, because he does not memorize IDs. That is the same sentence as the clause
above it, applied one level out: he should not have to memorize the digits of a priority class, and
he should not have to memorize what `SES-140` **is**. So a ticket reference on a surface he reads —
a briefing card's id chip, a §10 row, a push notification, the session name, a `close_directive`
note, a `record_skip` reason — reads `SES-140 — the successor fire is refused by the platform`,
never a bare `SES-140`. The session rename at step 5 (`"<TICKET-ID> — <short name>"`) already has
this shape and is the pattern, not an exception to it.

Three boundaries, each of which is how this rule gets got wrong:

- **The title is `public.backlog_display_title(title, description)` — never the raw `title` column
  and never the `gist` extract** (`SES-119`, `v7.0.184`, migration `ses119_display_title`).
  **Measured live 2026-08-23, not quoted: of 562 open numbered tickets, `title IS NULL` on 0 and
  50 fall back**, i.e. on 50 tickets the stored title is a retired declaration marker rather than a
  title (38 of them literally `` `Post-beta` ``). So *"use the title column"* — the obvious short
  form of this rule — renders `` `Post-beta` `` as a ticket's name, and the `gist` it would replace
  is the first 70 characters of the *description*, which on this board is provenance (*"FOUND LIVE
  2026-08-23T03:31Z by cycle b9201486…"*). The function is the fallback between the two and is the
  only sanctioned source. Its predicate, the rejected length heuristic, and the `CHI-97` boundary
  live in `briefing-page.md`'s §8 contract — **cited here, not restated**, so these two files cannot
  drift the way step 5 and step 7 did before `v7.0.114`.
- **This is a RENDER-time rule and it must never reach a key column (`SES-116`, `v7.0.174`).** The
  immediately preceding member of this rule family did exactly that: step 9's card-filing line read
  *"backlog ID + Type + named P-class"*, so every cycle composed `'SES-115 (Tooling · P10 -
  Tooling)'` and stored it in `runner_items.backlog_id` — **a join key** — and every card→ticket
  join silently returned nothing on 63 of 80 rows. `backlog_id` stays **bare**
  (`ck_runner_items_backlog_id_bare` now rejects anything else at INSERT), a human reference that is
  not a board ticket goes in `display_ref`, and the title is looked up **when the surface is drawn**.
  Composing `SES-119 — Briefing and displays show…` into either column is that same defect wearing
  this rule's clothes.
- **A fallback is a signal about the ticket, not a formatting problem to patch by hand.** When
  `backlog_display_title()` falls back, that ticket has no usable stored title, and the honest
  rendering is the fallback. Do **not** invent a title at render time to make the row look
  finished — that is a fact with a second home, and it hides the population `SES-117`'s TITLE
  CHECK is the structural fix for.

**Supervised-run notes** are inline where the first supervised cycle (SES-78c QA) runs a
reduced version of a step; 78d replaces them with the full mechanism.

## Phase 1 — judgment first

**0. Bootstrap.** Your clone's default branch is `main` — never work there. `git fetch origin
dev`, then `git checkout -B session/cycle-<UTC yyyymmdd-hhmm> origin/dev`. This exclusive
clone + session branch satisfies CLAUDE.md's worktree-isolation rule by construction (the rule
exists to isolate concurrent sessions sharing one machine checkout; you have the whole clone).
All other CLAUDE.md hard rules apply verbatim — atomic counters, `push origin HEAD:dev`,
kickoff-gated coding, verify-never-assert. Do NOT create an inflight file: `.claude/` paths are hard-coded protected and prompt for permission even in routine sessions (found live, SES-78c — two stalls), and the marker is redundant here — the exclusive clone dies with the session and your `runner_cycles` row is the liveness signal. (Laptop sessions keep the inflight convention — at repo-root `inflight/` since 2026-08-21, John-approved register B41, moved out of `.claude/` precisely because of this gate; the cloud-cycle skip stays, since the exclusive clone and the `runner_cycles` row already cover liveness.)

**An UNATTENDED cycle writes nothing under `.claude/` — and the reason is now known, which changes what the rule is for (John, 2026-08-21, directive `34865f07`, register B39).** This clause has been rewritten four times. Read the reason before you touch it again, because three of the four rewrites argued about a mechanism nobody had observed, and John then observed it in one sentence:

> *"Those sessions came back alive because I opened them and allowed permissions. That should not be happening."*

**What that settles.** The path is **not blocked** — writes land, and `v7.0.121` proved it (an 18-minute stall that ended in a **successful** write). The gate is a **harness permission prompt that renders only in the human-facing session UI and never in the agent's transcript**. An agent therefore cannot see it, cannot report it, and cannot answer it: from inside, an unanswered prompt is indistinguishable from latency, from a suspend/resume, and from a hang. This is why every previous reading was defensible and wrong. `v7.0.121`'s register B38 got the location exactly right — *"permission-shaped… in the harness permission layer, not the shell"*, measured with `date +%s` printing the same second either side of the stalled command — and then concluded *"what is not happening is anyone being asked in a way they could answer."* Someone was asked. It was John, in a UI no cycle can see.

**The measurement that makes it a rule rather than a story** — the partition by whether John was demonstrably in the app, his briefing taps as the timestamped proxy. His taps stop at `03:48Z` and resume at `12:50Z`, a nine-hour hole on the night of 2026-08-20→21:

| Probe | Started | John in the app | Outcome |
|---|---|---|---|
| `c6c50bdc` (`v7.0.115`) | `02:06Z` | yes | returned, ~35 min |
| `ba8f2ce3` | `03:52Z` | **no** | **parked ~9h20m** |
| `633fe486` | `05:07Z` | **no** | **parked ~8h05m** |
| `12953ca8` (`v7.0.117`) | `08:07Z` | **no** | **never returned** |
| `55defd59` (`v7.0.121`) | `13:01Z` | yes | returned 18m04s; next call ~6 s |

Every probe that cleared ran while he was at his desk; every probe that parked for hours ran inside the hole. The two parked cycles resumed **together, 13:09–13:12Z — eighteen minutes after his first tap of the morning.** So B38's *"a cost, not a prohibition — budget ~35 minutes"* was never a distribution; it was **a sample of the attended cases**. Unattended, the observed values are ~9h, ~8h, and never.

**Therefore, the rule, and note what it is NOT.** It is not "never edit `.claude/`" — that edit is legitimate work. It is: **an unattended cycle has no bounded recovery from this gate, so it does not enter it.** A cloud cycle that needs a `.claude/` edit **files a card carrying the exact replacement text**, names it as needing *a session John is attending* (not merely "a laptop session" — attendance is the operative property, not the machine), and moves on. It never spends the cycle on the attempt, and — `CLAUDE.md`, `SES-019` — never retries the same write through a different tool to get around it. **The rule exists to protect John's attention, on his instruction:** *"That should not be happening"* means his opening a session to clear a prompt is the failure being designed out, never the recovery path a cycle may plan around.

**Do not re-soften this on another latency reading.** That is exactly how it was softened last time, and a fast `.claude/` write is not evidence the gate is gone — it is evidence somebody was watching. **What would legitimately reopen it:** a prompt actually captured, or a pre-approval John grants these sessions that is then shown to survive an unattended run. Three things stay labelled inference, not fact: no prompt has ever been directly captured; `v7.0.115`'s 35-minute clearance has no identified clearer; and `ba8f2ce3`'s fast `Write`/`Edit` calls are not ordered against John's approval, so "`Write`/`Edit` never prompts" is not excluded. Read `runner_secrets` via the Supabase
connector and export what a step needs as env vars — secrets never go into files, commits, or
logs.

**Step-0 assertions — prove both cheaply before opening the cycle, fail closed if either fails
(B17, John-accepted 2026-08-20 12:51Z, `runner_items d1c1ca1b`).** **(1) Stamp match.** Your
prompt carries a `stamp:` clause; call `list_triggers` and match that stamp against the
current routine's stored prompt verbatim. A mismatch means the routine was updated and this
prompt is superseded — CLOSE `did_not_run` immediately with the mismatched pair in `notes`,
never run superseded instructions (found live, `SES-78`: a retired prompt fired a second
runner cycle five minutes after the real one). **(2)** — retired 2026-08-21 (register B42):
there is no cycle-level lease any more. Mint your cycle id (`gen_random_uuid()`) and open your
`runner_cycles` row (step 1). **Every fire that passes the stamp check RUNS.**

**PARALLEL CYCLES ARE THE DESIGN — the cycle-level lease is RETIRED (John, live in chat
2026-08-21, register B42).** His ruling, verbatim: *"routines should be able to run multiple in
parallel and not overwrite each other and manage sessions accordingly. I can run 10 sessions
manually and there is no problem. What if i want to run 100 automated routines at once? should
not be an issue - self administered and fixes itself if it happens to notice it is about to
overwrite another session."* B31's one-runner-at-a-time mutex (`v7.0.106`) was built when
tickets had no claims — the only way to stop two cycles building `ADM-1` twice was to stop the
second cycle entirely. Since `v7.0.127` the coordination lives on the resources themselves, so
the mutex now only throws away throughput. What replaces it, resource by resource:

- **Tickets:** the atomic claim (step 5). A contested claim returns 0 rows → **take the next
  ticket in the queue** — John's rule, exactly. N cycles work N different tickets.
- **Version numbers and backlog IDs:** already atomic (`UPDATE … RETURNING`); no lease needed.
- **`dev` pushes:** fetch → rebase → push (step 7). Under parallelism a non-fast-forward is
  routine, not an anomaly — re-fetch, re-rebase, retry **up to 3 times** (was once).
- **Your own ticket, before anything irreversible:** re-assert the CLAIM, not a lease — see
  the re-assertion gate below.
- **The briefing tail** — the one genuinely serial section (harvest John's taps → ladder
  writes → republish). Two cycles republishing at once can overwrite each other's cards and,
  worse, eat un-harvested taps. That section, and only that section, takes the singleton lock:

```sql
-- Publish lease (the repurposed runner_lease row): taken at the START of the serial tail
-- (step 9), released at its end. Held for seconds-to-minutes, so the TTL is 10 minutes,
-- not 45. 1 row = the tail is yours. 0 rows = another cycle is publishing.
UPDATE public.runner_lease
   SET holder      = '<your cycle id>',
       stamp       = '<your stamp>',
       held_since  = now(),
       released_at = NULL,
       steals      = steals + (CASE WHEN holder IS NOT NULL THEN 1 ELSE 0 END),
       updated_at  = now()
 WHERE id = 1
   AND (holder IS NULL OR held_since < now() - INTERVAL '10 minutes')
RETURNING holder, steals;
```

**0 rows → WAIT, never skip:** retry every ~30s until you hold it (the 10-minute TTL bounds the
wait). The tail is where your cycle's record, cards, and John's harvested taps get written —
a cycle must never end without it. **This wait replaces the old "did not run — lease held by a
live cycle" exit, which is exactly the behavior John rejected.**

**Self-healing at the overwrite point ("fixes itself if it happens to notice it is about to
overwrite" — his words, the operative spec):** inside the tail, AFTER taking the publish lease,
re-fetch the live page and re-parse `briefing-state` — never republish from a harvest taken
before the lease, because another cycle may have republished while you were building. Decisions
are harvested idempotently (`UPDATE runner_items SET decision=… WHERE id=… AND decision IS
NULL` — only rows you actually flipped feed the ladder), so a double-harvest writes nothing
twice, and cards are always rebuilt from the DB's undecided set (register B18), never from
memory.

Three properties worth knowing before you edit any of this:

- **`holder` is deliberately not a foreign key.** The claim mints the cycle id with
  `gen_random_uuid()` *inside* the claiming UPDATE, and the `runner_cycles` row is inserted
  with that id in the next statement (step 1). Splitting it into claim-then-bind inside one
  statement does not work: Postgres silently drops a second UPDATE of the same row in the same
  statement, which would leave `holder` NULL and the lease effectively open.
- **The 45-minute TTL is the anti-deadlock — but a steal means the holder is SILENT, not dead
  (corrected `v7.0.123`, directive `c4d95dc7`).** A cloud session that goes quiet mid-cycle never
  releases; without a TTL the routine would be wedged until a human noticed, so the TTL has to
  exist and is unchanged. What was wrong is the sentence that used to sit here: *"Longest real
  cycle to date is ~18 minutes against a 3-hour cadence, so a stolen lease means the holder is
  dead, not slow."* Cycle `633fe486` disproves it by measurement — it opened `05:07:15Z`, had its
  lease stolen on the TTL at ~`05:52Z`, and was **still executing normally at `13:10:51Z`**
  (`select now()` read from inside that session), ~8 hours later, having completed its probe,
  subagent delegation, edits, kickoff doc, build, regression and snapshot export. A cloud session
  can be suspended and resumed across wall-clock gaps that are **invisible from inside it**, so
  the elapsed-time premise the old sentence rested on does not hold — the same correction step 0b
  makes for `failed`, applied here. A steal increments `steals`; a non-zero value is the signal
  that cycles are going silent, and belongs in the briefing when it moves. **Because a stolen-from
  cycle keeps running, the steal alone protects nothing — see the re-assertion gate below.**
- **The lease is ledger state, not content.** Its own columns (`holder`, `held_since`,
  `steals`, `released_at`) are the audit trail, so the claim and the release do not each need a
  `runner_before_images` row; anything else you write to it (a QA fixture, a manual repair)
  does, exactly like every other Supabase write.

**RE-ASSERT THE TICKET CLAIM BEFORE EVERY IRREVERSIBLE ACT — a claim is a starting gun, not a
standing guarantee (`v7.0.123`'s lesson, directive `c4d95dc7`, retargeted from the retired
cycle lease to the ticket claim, register B42).** The principle `633fe486` paid for is
unchanged: a cycle that lost its coordination token keeps working, because nothing tells it —
it came one command short of pushing a duplicate to `dev` and was saved only by an incidental
`git fetch`. Under parallel cycles the token is the **ticket claim** (24h expiry), so run this
immediately before **any** irreversible act — the step-7 push, and every counter claim
(`dev_version_counter`, `feature_id_counter`):

```sql
-- Re-assertion. 1 row = the ticket is still yours, proceed. 0 rows = your claim expired
-- and another session took it.
SELECT claimed_by, claimed_at FROM public.backlog_items
 WHERE backlog_id = '<your TICKET-ID>' AND claimed_by = '<your cycle id>'
   AND claimed_at > now() - INTERVAL '24 hours';
```

**0 rows → your claim is gone. STOP, and note precisely what stop means here:**

- **Do NOT push.** Whoever re-claimed the ticket after your claim expired may have shipped
  the very item you are holding. Pushing now is the duplicate-build failure, arriving late.
- **Do NOT claim a counter.** A version or ID claimed after you lost the ticket is a permanent
  gap at best and a collision at worst.
- **Do NOT touch the new claimant's claim.** The re-assertion is holder-guarded by
  construction — but attempting a "repair" write is how a cycle talks itself into touching a
  successor's state. Leave it alone, exactly as step 0b forbids adjudicating a predecessor's
  outcome.
- **Close and annotate your OWN row, then end.** `outcome='did_not_run'`, with the reason and
  the successor's holder id in `notes`. Your work is not necessarily lost: **push your session
  branch** (never `dev`) so the commits survive the container, and name that branch in the
  notes — `ba8f2ce3` and `633fe486` both did exactly this, and their work was recoverable by
  cherry-pick rather than redone.
- **Before you discard, check whether your item already shipped.** `git fetch origin dev` and
  read the log: if the successor shipped it, the discard is correct and deliberate; if it did
  **not**, say so in the notes so the item is re-picked rather than silently dropped.

The gate is cheap (one indexed single-row `SELECT`) and it is the enforcement point the standing
prohibition never had. **It does not replace the ship-point `git fetch origin dev`** — that
catches work that already landed on `dev` regardless of claims; this catches the case where your
claim expired and moved. Two different failures, both real, and `633fe486` was saved by the
first one only by accident.

**0b. A SILENT predecessor is PUSHED to John — and is never declared dead by a successor (John,
2026-08-21, directive `1d01ea85`, register B35; corrected the same cycle by measurement, B37).**
Asked what he wanted when a run dies, John answered: **"need to know why it died and what to do
next."** Detection already existed — the TTL steal and the `ended_at IS NULL` sweep — and it was
the *only* thing that noticed when `ba8f2ce3` and `633fe486` went quiet on 2026-08-21; John found
out from a briefing card the next morning. The signal was dying in the ledger. It no longer may.

**Read this before you write anything about a predecessor, because the obvious version of this
rule is wrong and was disproved live.** An open `runner_cycles` row past the 45-minute TTL means
the cycle is **silent**. It does **not** mean the cycle is dead. Measured 2026-08-21: cycles
`ba8f2ce3` (started 03:52Z) and `633fe486` (05:07Z) were closed `outcome='failed'` by a successor
at 08:24Z on exactly that reasoning — and both were **still executing**. They resumed, finished
their missions, wrote their own token accounting, discovered the live lease, correctly declined
to push, and filed their findings as directives at 13:11Z and 13:12Z — **more than nine hours
after they started and five hours after they were pronounced dead.** A harness suspend/resume,
not a death. So:

- **A successor never adjudicates a predecessor's outcome.** Take the lease — that is what the
  TTL is for, and it is still correct — but **do not** set `ended_at` or `outcome` on a row that
  is not yours. Only a cycle closes its own row. Closing it for them destroys the record they
  are about to write, and mislabels a working cycle as a failure in the ledger John reads.
- **`failed` on a silent row needs evidence, not elapsed time.** The longest observed resurrection
  gap is **~9h20m**. A row may be closed `failed` by someone else only after **24h** of no writes
  attributable to it (that bar is derived from the measurement, not chosen), and the closing note
  must say what evidence was used.
- **Say "went silent", never "died", in the push, the card and the ledger** — until something
  actually proves death. This is the `v7.0.115` failure (a hung probe's silence read as a finding)
  in its third costume; the rule "a subagent that has not returned is not a result" applies to an
  absent *cycle* exactly as it does to an absent *subagent*.

**Heartbeat first (`SES-103` — permission-stall tripwire, John's ask 2026-08-21, `v7.0.143`):
at every numbered step boundary, update your own row** —
`UPDATE runner_cycles SET heartbeat_at = now(), last_step = '<step name>' WHERE id = '<your id>'`
— one cheap write per step. This is what lets your peers tell John *where* you froze if a
permission prompt catches you: a prompted session is stuck inside the gated call and can send
nothing itself (register B39), so the heartbeat trail is its only voice.

Run this at step 0, every cycle. **Under parallel cycles (register B42) an open row is
NORMAL — concurrency is the design, not a symptom.** Silence now has FOUR concrete shapes,
none of which is "another cycle exists":

```sql
-- (a) open cycle rows older than the 24h evidence bar (B37) — candidates for silence
SELECT id, started_at, item_id,
       round(extract(epoch FROM (now() - started_at))/3600, 1) AS hours_open
  FROM public.runner_cycles
 WHERE ended_at IS NULL AND id <> '<your cycle id>'
   AND started_at < now() - INTERVAL '24 hours';
-- (b) ticket claims past their 24h expiry (a session that vanished mid-build)
SELECT backlog_id, claimed_by, claimed_at FROM public.backlog_items
 WHERE claimed_at < now() - INTERVAL '24 hours' AND claimed_by IS NOT NULL;
-- (c) the publish lease wedged past its 10-minute TTL
SELECT holder, held_since FROM public.runner_lease
 WHERE id = 1 AND holder IS NOT NULL AND held_since < now() - INTERVAL '10 minutes';
-- (d) the PERMISSION-STALL TRIPWIRE (SES-103): an open peer whose heartbeat is >20 min stale
--     and who has not yet been reported — the fast detector John asked for
SELECT id, started_at, last_step, heartbeat_at,
       round(extract(epoch FROM (now() - heartbeat_at))/60) AS minutes_frozen
  FROM public.runner_cycles
 WHERE ended_at IS NULL AND id <> '<your cycle id>'
   AND heartbeat_at < now() - INTERVAL '20 minutes'
   AND stall_notified_at IS NULL;
```

**A row from (d) gets its own IMMEDIATE push — this is the "a session is asking for
permission" alert (`SES-103`).** First claim the report atomically so John gets exactly one
push per stall, however many peers are sweeping:
`UPDATE runner_cycles SET stall_notified_at = now() WHERE id = '<stalled id>' AND
stall_notified_at IS NULL RETURNING id` — 0 rows means another peer already pushed; stand down.
On 1 row, push: which cycle, frozen since when, its `last_step`, and the hypothesis stated as a
hypothesis — *"likely waiting on a permission prompt only you can see, in that session's
window"* when the last step touched a known gated path class, plainer "went quiet at step X"
otherwise. Tell John where the prompt would be; whether to open it is his call — never phrase
approval as a task he owes (the 34865f07 rule). If the cycle later resumes, its own next
heartbeat is the all-clear; note the resolution in your tail if you observe it.

Any row from these — or a `steals` jump on your own tail-lease claim — means a session has
gone silent. **Send a push notification** carrying both halves of what John asked for — and
leave the row alone:

- **Why it went silent — only what is observable.** Which cycle, when it started, how long it
  has been quiet, what it had picked (`item_id` / `notes`), whether the lease was taken by TTL
  steal or found free, and whether anything was pushed. **State the limit in the message
  itself:** a cloud cycle's transcript is not readable from here, so the runner reports last
  observable *state* plus a named hypothesis — never a cause it did not observe. "It went silent
  after step N and the last thing it wrote was X" is a real answer; an invented root cause is
  not, and neither is "it died".
- **There is now a LEADING hypothesis, and it is evidenced (register B39, 2026-08-21).** When a
  cycle goes quiet, check first whether its last observable step touched a `.claude/` path.
  If it did, the named hypothesis is **parked on a permission prompt that only a human can
  answer** — step 0's clause has the measurement, and the partition there is exact: every
  observed park happened while John was away, every clearance while he was at his desk. Say it
  as the hypothesis it is, still labelled, still alongside the observable state. It does **not**
  license skipping the "only what is observable" rule above; it means the runner finally has
  something better than a shrug to put next to the state.
- **A silence during John's own waking hours is a DIFFERENT finding.** The evidenced cause
  requires his absence. A cycle that goes quiet while he is demonstrably in the app is not
  explained by B39, and the push should say so rather than reach for the nearest known cause —
  that reflex is how this platform got three wrong rulings in a row.
- **What to do next — concretely, including "nothing".** Most silences need no action at all:
  the claim's 24h expiry re-opens the ticket, the next cycle re-picks it, and the silent
  cycle may simply come back and finish. Say that plainly rather than implying an emergency. Name
  an action only for real residue: a directive stuck `in_progress` (re-claim it — before-image
  first, never quietly), a version number claimed and unused (a permanent counter gap; record it,
  never reuse it), an unpushed session branch (**recoverable — cherry-pick it, do not redo the
  work**; check for one before assuming anything was lost), or the same mission going silent
  twice, which is the one shape that means *stop and look* rather than *let it retry*.
  **One thing that is NOT an action to give him.** Opening the session and approving the prompt
  does clear a `.claude/` park — that is how the 2026-08-21 pair came back. **Never write that
  to John as the remedy.** He has ruled on it (`34865f07`: *"That should not be happening"*), and
  a push that hands him a tap to perform has converted his instruction into a chore. Report the
  park, name what it cost, and say the work is recoverable; the fix belongs in the procedure —
  the cycle should not have entered the gate — not in his inbox.

Two consecutive silences on the same item is itself the finding, and the push says so — that is
what `ba8f2ce3` and `633fe486` were, and nothing told him at the time. Both, note, later came
back and pushed their work to their own session branches; the correct action for that pair was
"cherry-pick `69bc903`", never "the work is gone".

**1. Open the cycle — and tell John's phone it started (`SES-102` — runner transparency on the
phone, John's ask 2026-08-21, `v7.0.142`).** Immediately after inserting your cycle row, send
**exactly one push notification**: fire kind + time + where the result lands — e.g.
`"Runner cycle started (scheduled 3:00 PM CST fire). Pick and outcome will be on the briefing."`
(or `"(manual fire)"` when the start time sits off the 3-hour grid). One push per cycle open,
never more — the step-0b silence pushes and the close-out remain the only other notification
senders. If no push mechanism is available in the environment, note that in the cycle row and
continue. INSERT `runner_cycles` **with the id the claim returned** —
`INSERT INTO runner_cycles (id, stamp, trigger, model) VALUES ('<claimed cycle_id>', …)` — via
the connector, leaving `outcome` NULL until close (the check constraint has no in-progress
value; found live, SES-78c). Every later step's evidence hangs off this row's id; "who is
running right now" is `SELECT … FROM runner_cycles WHERE ended_at IS NULL` — and under
parallel cycles (register B42) **multiple open rows are normal**, not a signal.

**Release the PUBLISH lease at the end of your tail — and only if you took it.** Every cycle,
even a wall-stop or a `failed` close, still runs the serial tail (its record must be written),
so the release always happens there. The statement is holder-guarded so a cycle whose tail
lease was TTL-stolen can never clobber the new holder:

```sql
UPDATE public.runner_lease
   SET holder = NULL, released_at = now(), updated_at = now()
 WHERE id = 1 AND holder = '<your cycle id>'
RETURNING released_at;   -- 0 rows = the tail lease was stolen; leave the new holder alone
```

**1b. THE SETTINGS GATE — John's Automation panel, honoured (`SES-143`, `v7.0.182`, migration
`ses143_runner_settings`).** §2b of the briefing gives John a scheduler switch with an interval and
a drain switch. This is the step that makes them binding. Run it immediately after your cycle row
exists — it needs a row to close — and before anything else:

```sql
SELECT * FROM public.scheduler_gate('<your cycle id>', '<your prompt''s trigger: line, verbatim>', now());
```

- **`verdict = 'run'`** → carry on to step 2. The normal case.
- **`verdict` anything else** (`paced` / `scheduler-off`) → **close the cycle now**:
  `outcome='did_not_run'`, the returned `reason` verbatim in `notes`, `item_id` NULL. Then run the
  step-9 serial tail exactly as any other wall-stop does (its record must be written), rename the
  session per the routine prompt (`"did not run — paced by your scheduler setting"` /
  `"did not run — scheduler off"`), release any claim you hold, and **end**. Gate A means you fire
  no successor.

**Why this is a gate and not a cron change.** A cycle **cannot edit the routine that fired it** —
the platform refused exactly that on 2026-08-23 (`SES-140`, verbatim: *"fire_trigger: this routine
was created via http_api, not by an agent"*). It does not need to. The stored prompt already says
*"execute runner-cycle.md EXACTLY"*, so this step binds every future cycle with no trigger edit at
all: **the cron stays hourly permanently and each cycle paces itself down to John's `N`.** That is
also what **retires `SES-140`'s restore obligation** — there is no interval left to restore.

Five properties of `scheduler_gate()` that are load-bearing. **Do not re-derive any of them by
hand** — that is the eighth time this platform would have made the same mistake (`SES-86` phase 3,
`v7.0.146`, `SES-101`, `SES-111`, `SES-127`, `SES-128`, `SES-129`):

- **PACING IS JOHN'S CLOCK GRID, not elapsed time since a predecessor (`SES-151`, `v7.0.196`).**
  A scheduled fire runs iff its cycle row's `started_at` falls in an **America/Chicago hour
  divisible by `interval_hours`** — at the standing 3 that is **12, 3, 6, 9 AM/PM on John's
  clock**, exactly, every day, DST-proof by construction (wall clock, not UTC — the retired
  UTC-cron realign chore is gone for good). Why the elapsed-hours form had to die, measured not
  reasoned: its `v_hours` mixed clocks (call-time `now()` against the predecessor's
  `started_at`), so sub-minute step-0 jitter decided verdicts — **3 of 9 hourly fires were
  wrongly paced in the `interval=1h` era** (cycle `6177c7aa`, question
  `q-hourly-interval-boundary`) — and at any interval it drifts off whatever clock grid John
  actually means. The grid form has no boundary to jitter across: the minute never matters, only
  the hour.
- **THE PREDECESSOR IS THE LAST CYCLE THAT ACTUALLY RAN**, i.e. the most recent row whose
  `outcome` is **not** `did_not_run` (an open row counts — a peer running right now is the runner
  running; a `failed` row counts — it consumed a slot). Since `SES-151` the predecessor is
  **reporting-only** (the verdict reads the clock grid), but the predicate is preserved
  byte-for-byte and must never regress to *"the most recent `runner_cycles` row"* — under any
  future elapsed-time use that form **wedges the runner shut permanently** (`t=0` runs, `t=1h`
  is paced, every later fire's predecessor is the paced row an hour earlier). Proven with a
  negative control rather than reasoned about.
- **It fails OPEN in every unknown** — no settings row, a NULL column, no predecessor, a trigger
  word it does not recognise → `run`. A gate that can stop the whole fleet must never stop it by
  accident. `scheduler_on = false` is the only thing that switches the runner off, and that is
  John's decision, never a default the code fell into.
- **The scheduler governs SCHEDULED cycles only** (spec, verbatim). Pass your prompt's `trigger:`
  line **as written**: `scheduled` is paced, `chained (drain continuation)` (`SES-141`) is exempt
  and runs regardless of interval. So scheduler OFF + drain ON = the chain still runs, and while a
  drain is standing **the chain, not the interval, sets the real cadence** — which is the spec's
  own choice, and John turns it off with the drain checkbox, not the scheduler one.
  **The function NORMALISES what you pass, and until `SES-146` it did not (`v7.0.188`).** It now
  strips a leading `trigger:`, trims and lowercases before matching, so the verbatim line and the
  bare word both work. **That instruction above used to be false in the one direction a cycle is
  most likely to take it:** the retired body tested `p_trigger = 'scheduled'` by exact equality, so
  a cycle passing `trigger: scheduled` — which is what *"as written"* means, and what the stored
  prompt's *"execute it EXACTLY"* commands — fell through to *"not a scheduled cycle"* and skipped
  **both** the pacing branch **and** the `scheduler_on = false` branch beneath it. It failed open,
  so nothing broke and nothing in the ledger showed it; the five paced rows to date all happened to
  pass the bare word. Do not "simplify" the normalisation back to an equality test.
- **A manual fire is exempt**, detected as a start that sits **off the cron grid** — the same test
  step 1 already uses to label a fire `(manual fire)`. This is the one case the spec does not
  settle, and it had to be settled somehow, because §2b puts John's own *"▶ Run a cycle now"* link
  on that very panel and a paced-out tap is a dead button. The grid minute is the column
  `runner_settings.cron_minute` (40, read live from the routine), so correcting it is one `UPDATE`.
  Filed as question `q-manual-fire-pacing` rather than left as an inference.
  **The grid is measured against your cycle row's `started_at`, NOT against the `p_started` you pass
  (`SES-146`, `v7.0.188`) — and the tolerance is the column `runner_settings.grid_tolerance_min`
  (default 10, `CHECK 0..30`), never a literal.** The retired body compared `p_started` — `now()` at
  the moment you *reach* this step — against `cron_minute` with a hardcoded ±2. That clock drifts
  with how much work step 0 did first, so the defect got **worse as this runbook grew**: cycle
  `72561db3` fired at `13:40:52Z`, reached the gate at `13:43:12Z` (distance 3), and was exempted as
  a "manual fire" it was not. `started_at` is stamped at step 1, immediately after step 0, and is the
  earliest fire-time proxy reachable from SQL; an unresolvable cycle id falls back to `p_started`
  rather than raising, so the unknown path still fails open. Same *"a column, not a literal"*
  correction this step already made for `cron_minute`, applied one level further.

**2. Harvest John's judgment — the WRITES now happen inside the step-9 serial tail (register
B42), under the publish lease; this step is now READ-ONLY.** Read the page for anything that
changes your selection — new directive text, a fresh usage reading, taps on gated cards — and
carry it forward, but write nothing here: decision/ladder/reading/directive writes race under
parallel cycles and belong in the tail, where they are idempotent (`… AND decision IS NULL`)
and serialized. The rules below govern those writes wherever they run. Original step text:
Read the briefing page (URL in
`docs/runbooks/briefing-page.md`) and parse its `briefing-state` JSON block. For each decided
item: write `decision`/`decision_reason`/`decided_at` to `runner_items`; **Accept** → ladder
streak +1, and **promote a rung on every 5th Accept — the test is `streak % 5 = 0`, never "at
least 5" — leaving the streak to keep counting (see the no-reset rule below)**, **on a `shipped`
card only — see the gated-card rule below**;
**Reverse** → revert-forward the item's commits and/or
restore its before-images, reopen its backlog row carrying John's line, ladder streak → 0 and
rung −1; **Rework** → John's line becomes a new `runner_directives` row, queued first.

**AN ACCEPT ON A `shipped` CARD NOW WRITES THE TICKET `done` — IT IS THE ONLY THING THAT EVER DOES
(`SES-154`, `v7.0.205`; spec `docs/design/BRIEFING-COMMENTS-0823-DRAFT.md` decision 1).** Step 7's
close-out writes `delivered`; this harvest is where completion is actually conferred. Before-image
first, like every Supabase write, then set `status = 'done'` and run
`SELECT public.recompute_backlog_queue();` — **this is the call site that releases the ticket's
queue number**, which step 7 deliberately no longer does. Two boundaries so this cannot be
re-derived differently:

- **It applies to a `shipped` card only.** An Accept on a `gated_before_build` card is permission to
  build, not a verdict on work — it has no `delivered` ticket behind it, touches no ladder (B34),
  and must never write `done`.
- **Reverse is the reject, and it already did the right thing.** Its existing rule — revert forward,
  restore before-images, reopen the backlog row carrying John's line — is unchanged and needs no
  edit: reopening a `delivered` ticket restores the prior open state, which is exactly what decision
  1 asks of a rejection. Note plainly rather than inventing it: **the spec's decision 2 renames this
  button to "Reject"; that rename is not this ticket and has not shipped**, so the page still says
  Reverse and so does this runbook. Do not write a rule against a button that does not exist yet.

**What this changes about waiting, which is the point of the ticket:** nothing. The runner never
blocks on an Accept. A delivered ticket is stepped past at step 5 and is unpickable by a drain in
SQL, so it cannot be built twice while it waits, and a cycle that finds nothing but delivered work
falls through to the board exactly as it does for any other blocked prefix.

**THE STREAK IS NEVER RESET ON PROMOTION — the count keeps running, and a rung is earned on every
5th Accept (John, 2026-08-21, question `q-ladder-streak-reset` answered **no** at 22:04Z; `SES-107`,
`v7.0.148`).** The written rule used to be *"Accept → streak +1 (5 consecutive → rung +1)"*, which
never said what happens to the streak **after** a promotion. Cycle `7392e345` hit that blank live
at 20:27Z — John's Accept took `tooling` from streak 4 to 5, promoting rung 6 → 7 — set the streak
to 0, and filed the question rather than letting an invented rule stand. John's answer was **no**,
with his own words on the card: *"which one just keeps the count going? no need to reset - why
would i do that?"*

**Why the reset existed, and why removing it alone would have been wrong.** Written as *promote at
5 **or more***, a streak left at 5 promotes again on the very next Accept, and again on the one
after that — **a rung per tap, forever**. That runaway is not what John asked for either; it is
simply the opposite failure, and it would have compounded the runner's own autonomy on a rule
nobody wrote. The form that gives him exactly what he asked for **without** the runaway is the one
now in force, and it is stated as a test so the ambiguity cannot come back:

```
promotion  ⇔  streak % 5 = 0        -- 5, 10, 15, … ; NEVER "streak >= 5"
after promotion:  streak keeps its value — it is not reset, not to 0 and not to anything else
```

Three boundaries, so no later cycle has to guess:

- **A `Reverse` still sets the streak to 0.** That is a different rule, John ruled on it
  separately ("leave it", directive `1d01ea85`), and it is untouched here. Only *promotion* stops
  resetting.
- **Forward only; the ladder's history is NOT re-derived** — register B34's boundary, and John
  answered `q-ladder-rewind` **no**. Note what this did and did not cost, because it was measured
  rather than assumed (`SES-107`): replaying tonight's `runner_ladder` before-images under the new
  rule yields **exactly the stored row**, because the two `Reverse`s at 21:21Z and 22:22Z each set
  the streak to 0 regardless, erasing the difference. The correction John was promised on the card
  is a **no-op on this row** — which is worth saying to him plainly rather than quietly skipping.
- **The rule lives only here and in `briefing-page.md`.** No code implements the ladder
  (`grep -rl "runner_ladder" --include=*.js` → nothing); every cycle applies it by hand in SQL at
  harvest time. Making it executable so the arithmetic cannot be got wrong is a real idea and is
  this platform's own recurring lesson — it is **John's call, filed as a question, not done here**.

**An Accept on a `gated_before_build` card is permission, not a rating — it does NOT touch
`runner_ladder` (John, 2026-08-21, directive `fb643367`, register B34).** Asked outright
whether a gated Accept should count toward the ladder, John answered **"no"**. The reason it
matters is not bookkeeping: the ladder measures whether the runner's *unattended judgment* can
be trusted, and it is fed by John's verdict on work the runner **already did**. A gated card is
the opposite transaction — the runner did not build, and is asking. Counting "yes, go ahead" as
five-sixths of a promotion pays the runner for asking permission, which is the one behaviour
that must always be free. So a gated Accept does exactly two things, both unchanged: it
authorises that one build, and it re-enters the ticket at queue #1 (register B23). It writes
`decision`/`decision_reason`/`decided_at` like any other tap, and it leaves `rung` and `streak`
alone.

Two boundaries on that rule, stated so no later cycle has to guess:

- **It applies forward from the 2026-08-21T03:53Z harvest, and the ladder's history is not
  re-derived.** Two earlier harvests (`runner_items` `ae7b57c7` 00:19Z, `bfa4f42a` 02:19Z) did
  count gated taps. Unwinding them needs the ladder's streak-reset-on-promotion value, which at
  the time the written rule **did not define** and this platform had done both ways — so a
  re-derivation would have been inventing a rule, not applying one. It is named on the briefing
  instead. **That value is now defined** (John, `q-ladder-streak-reset` **no**, 22:04Z; the
  no-reset rule above, `SES-107`/`v7.0.148`), so the original *reason* has expired — but **the
  conclusion has not, and it is not reopened by this**: John answered `q-ladder-rewind` **no**
  at 17:20Z, so the history stands as-is on his word rather than on the absence of a value. If he
  ever says "rewind the ladder", that is the authorisation to re-derive, and the rule to re-derive
  under is now written down rather than being the first thing to ask him about.
- **A Reverse on a gated card still demotes — and that is now John's ruling, not a default
  awaiting one (John, 2026-08-21, directive `1d01ea85`, register B35).** `v7.0.118` left this
  half open on purpose. The symmetric argument — that declining permission should be
  ladder-neutral too, since the runner is otherwise penalised for asking and being told no — is
  a good one, and that cycle refused to apply it, because a cycle does not widen its own
  autonomy rule on an inference. So it was put to John in his own words. He answered
  **"leave it"**. The *behaviour* is therefore unchanged — a Reverse on a gated card sets the
  streak to 0 and demotes a rung, exactly as before — but its *status* is: it is settled.
  **Stop carrying it as an open question on the briefing, and stop flagging it in the docs as an
  unclosed asymmetry.** A later cycle that thinks it should change puts a fresh case to John; it
  does not reopen it by inference, in either direction.

**Pins (`SES-86` — the queue engine, register B5, `v7.0.140`):** a directive-box line matching
`TICKET-ID — move to N` sets that ticket's `pinned_position = N` (then run the recompute — the
pin takes its absolute slot, everything else renumbers around it); `TICKET-ID — release` clears
it. Latest call wins a collision (`updated_at` breaks the tie in the function); completion or
removal clears the pin automatically inside the recompute. A pin line is consumed as a pin, not
stored as a directive row. All other non-empty directive text in the page becomes a
`runner_directives` row (verbatim). A saved
usage reading (the three meter percentages John types in) becomes a `runner_usage_readings`
row: store the percentages verbatim, compute `est_tokens_since_prev` (sum of cycle token
estimates since the prior reading) and `tokens_per_pct` (that sum ÷ the all-models delta,
only when the delta is positive and the window is runner-only — overnight windows qualify;
otherwise leave it NULL rather than storing a confounded number). Update the
ladder with a before-image first, always. *(Supervised run: if the page is unreachable from
the cloud session, log that in the cycle row and continue — this run's decisions were already
harvested manually; whether cloud can reach it is one of the things this run measures.)*

A non-empty `answers` object in the page's `briefing-state` (`SES-99`) is harvested the same
way: for each answered `qid`, write a `runner_before_images` row first, then UPDATE
`public.runner_questions` SET `answer`, `answered_at`, `answer_note`, `status='answered'`,
`acted_cycle` = this cycle's id. An answer is John's word and outranks a cycle's own reasoning
on that question, exactly as a directive does. An unanswered question is **not** a "no" — it
carries forward. The page-side contract (rendering, the yes/no-askable rule, the 5-open cap)
lives in `briefing-page.md`'s question-list section — cited here, not restated.

**A non-empty `settings` object (`SES-143`, `v7.0.182`) is §2b's two switches, and it is the one
harvest that can change what the runner itself does.** Write it in the serial tail, before-image
first, exactly like every other harvest:

- **Scheduler half** — `UPDATE public.runner_settings SET scheduler_on = …, interval_hours = …,
  updated_at = now(), updated_by = '<your cycle id>' WHERE id = 1`. Reject an `interval_hours`
  outside `1..24` rather than storing it (the column's own CHECK will refuse it anyway); the page
  already refuses to record one, so a bad value here means the state was hand-edited.
- **Drain half — this is John NAMING a drain, and that is already sanctioned.**
  `drain_epic_next()` property 5 reads *"Nothing creates a drain row but John's own declaration —
  a directive row **or a briefing tap**."* A tick is that tap. Resolve `drain_epic` to an
  `epics.id`, then, **if no queued `drain-epic` directive already names it**, INSERT the directive
  and capture its scope per `SES-142` — one `runner_drain_scope` row per open `now`-tier member of
  that epic **at naming time**, which is the whole finish line from then on. An untick **cancels**
  the standing drain (`status='cancelled'`, before-image first); it never touches shipped work.
- **Daily-max half (`SES-147`, `v7.0.201`)** — `UPDATE public.runner_settings SET
  daily_max_tokens_millions = …` for the `daily_max_millions` key. **`null` is a REAL value here and
  is not the same as an absent key:** absent means *he never touched the box* (leave the DB alone);
  `null` means *he cleared it*, i.e. "no standing cap, budget exactly as before `SES-147`". Coercing
  either one to `0` stores a cap of zero tokens — a number he never typed, and one the column's own
  `CHECK (1..1000)` will refuse anyway, so the harvest would throw on a tap he had just made. Reject
  anything outside `1..1000` rather than storing it; the page already refuses to record one, so a
  bad value here means the state was hand-edited.
- **The runner still may never start one on its own initiative.** A tick is John's; an untick is
  John's; a cycle that finds neither writes nothing. That property is not negotiable and this
  harvest does not weaken it.
- **Say it back on the page.** `settingsNow()` already renders his un-harvested tap over the DB
  value, so the acknowledgement line is what tells him the tap was actually picked up — which
  means the rebuild must read `runner_settings` fresh, in this same tail, **after** these writes.

A non-empty `asks` object (`v7.0.145`, directive `edab5908`) is harvested the same way, and is
the one harvest that is **read-and-answer, not read-and-record**: each entry is a question John
typed on a card or a question row in his own words. INSERT each into
`public.runner_card_asks` (before-image `row_data = NULL`), then **answer every `status='open'`
row on its own card in the rebuild** — an ask he can see recorded but never answered is worse
than no ask box at all. **The insert is idempotent by construction and must stay that way:** the
page carries every ask in `briefing-state` forever, so **every** cycle re-reads asks it already
stored, and only the `uniq_card_ask (target_id, asked_at, question)` constraint stops the log
duplicating on every rebuild. Full contract, including the required More-info panel fields and
the required Yes/No consequence lines: `briefing-page.md`'s More-info section.

**3. Check the walls (two-track budget — John, 2026-08-20, `design-runner-gov-0820`).** A
wall-stop still runs the step-9 serial tail (its record must be written), then ends. **Known
approximation under parallel cycles (register B42, named rather than hidden):** each cycle
reads the day's spend at its own start, so N cycles starting together can each pass a wall the
sum of them exceeds — the caps are enforced per-cycle-start, not transactionally across the
fleet. At today's scale that slack is small; if John scales to tens of parallel routines, an
atomic allowance-claim (same pattern as the counters) is the upgrade, and it should be
proposed then, not silently assumed now.

**"Today" is an America/Chicago day, not a UTC day (John, 2026-08-21, directive `1d01ea85`,
register B35).** Asked whether the spending day should end at midnight UTC — 7 PM where he is —
or at midnight where he is, John answered **"Midnight cst"**. Every "today" and "the day" in
this step therefore means a **America/Chicago calendar day**, on both tracks. Use this window
verbatim, in both the dollar sum and the token sum; do not re-derive it:

```sql
-- today, on John's clock. Substitute into any "today's spend" SELECT.
 WHERE started_at >= (date_trunc('day', now() AT TIME ZONE 'America/Chicago')
                      AT TIME ZONE 'America/Chicago')
```

Four things about this boundary, each of which has already bitten or would have:

- **It is not cosmetic.** The CST day begins at **05:00Z**, so most of a night's cycles fall
  outside it. Measured live 2026-08-21 at 13:16:54Z over the same `runner_cycles` rows: **12**
  cycles and `6,620,000` estimated tokens inside the UTC day, **4** cycles and `1,240,000`
  inside the CST day — a **5.3×** difference, and it is the *structure* (a 5-hour offset across
  a nightly cadence), not that particular ratio, that is load-bearing. A cycle sitting near the
  wall is stopped by one boundary and waved through by the other. **Take your own reading rather
  than quoting this one:** these figures moved by 420,000 in the fourteen minutes this clause was
  being written, because a cycle presumed dead came back and wrote its own token accounting.
- **It is NOT the same rule as the display-times rule**, and conflating them is the easy
  mistake: the times rule (step 9, and `briefing-page.md`) is **display-only** — store UTC,
  render CST. This one changes an **arithmetic boundary**. Both are John's, they are
  independent, and neither implies the other.
- **Forward only. Never retroactively shorten a grant John already made.** A stored
  `budget_override.expires_at` is honoured exactly as written, even when the new clock would
  have expired it earlier — re-deriving an existing grant under a later rule is the runner
  taking back something John gave. New "for the day" overrides are written to the next midnight
  America/Chicago.
- **§19v is silent on the boundary** (it states `$100/month, $5/day` and `10M tokens/day` and
  names no clock), so this defines an undefined term rather than superseding the architecture —
  no runbook↔§19v disagreement, and no briefing item owed on that account. Verified by reading
  §19v's budget paragraph, not from memory.

- **API dollars (real money, hard wall):** SELECT `runner_budget` for the current month — no
  row → `did_not_run`, END. Sum this month's and today's `api_cost_dev_usd + api_cost_qa_usd`
  from `runner_cycles`; over the month cap → `did_not_run`, END; over the day default →
  `did_not_run` END unless an unexpired `budget_override` directive covers it (then its
  `max_usd` is your ceiling this cycle). **Only true billable API calls count here** — your own
  session's thinking is subscription usage, tracked in tokens below, never in dollars.
- **Subscription tokens (the governor that replaced the phantom-dollar wall):**
  read the latest `runner_usage_readings` row (John's typed-in meter percentages).
  (a) `all_models_pct ≥ weekly_rest_pct` (85) → rest: `did_not_run`, reason "weekly meter at
  N% — resting", END. (b) No reading, or latest older than 48h → today's allowance =
  `stale_fallback_tokens` (3M). (c) Otherwise: calibrate `tokens_per_pct` from the estimated
  tokens logged between the two most recent readings vs. the meter delta (store it on the
  reading row); remaining weekly pool = `(100 − all_models_pct) × tokens_per_pct`; today's
  availability = pool ÷ days left in the meter week; runner allowance = availability ×
  `runner_share_pct` (50%), capped at `runner_day_token_allowance` (10M) until two readings
  exist to calibrate from. Sum today's `est_tokens_dev + est_tokens_qa`; at or over the
  allowance → `did_not_run`, reason "runner token share for the day spent (~N est)", END —
  **unless an unexpired `budget_override` directive covers today's token track, exactly as the
  dollar track above works** (register B32, John live 2026-08-20 21:0xZ: "allow overance for the
  day and keep sessions going"). Covering means: `type='budget_override'`, `status='queued'`,
  `max_tokens IS NOT NULL`, and `expires_at > now()`. Then `max_tokens` — never `max_usd`, which
  is dollars only — is your allowance for this cycle, and you log the override's directive id in
  the cycle row's `notes`. The rest wall (a) is NOT overridable: an override buys the day's
  allowance, never John's weekly meter, so `all_models_pct ≥ weekly_rest_pct` still rests.
  **The override never widens the API-dollar wall** — that is real money and needs its own
  `max_usd` override. Both new columns are nullable and fail closed: NULL `max_tokens` or a NULL
  / past `expires_at` means no override, and the wall stands.
  All token figures are estimates and are always labeled estimated.

**THE CALIBRATION IS DERIVED BY ONE CALL, NOT BY EACH CYCLE'S ARITHMETIC (`SES-128`,
`v7.0.163`, migration `ses128_reading_slots`).** Step (c) above describes calibrating
`tokens_per_pct` from "the two most recent readings", and **that instruction has never once been
carried out** — measured before this shipped, all eight stored `runner_usage_readings` rows carry
`tokens_per_pct = NULL`, so every allowance this runner has ever computed fell through to the
uncalibrated 10M cap or the 3M stale floor. The reason is not that cycles forgot: **the two most
recent readings are the wrong window.** John's meter is spent by his own manual sessions *and* the
runner, so any window mixing the two yields a rate that is confidently wrong. Run this instead,
before you compute the allowance:

**AND SINCE `SES-147` (`v7.0.201`) YOU DO NOT CALL IT DIRECTLY — ONE CALL RESOLVES THE WHOLE DAY
CAP, calibration included:**

```sql
SELECT * FROM public.resolve_day_token_cap('<your cycle id>');
```

`day_cap` is your allowance for the day. `cap_source` names which of the five rungs it landed on and
`cap_reason` is that rung in John's register — **put both in your cycle row's `notes`, so the number
traces to a rung rather than to a cycle's reading of this paragraph.** The function calls
`derive_token_allowance('<your cycle id>')` for you and returns its result as `calibrated_allowance`
/ `calibration_guard`, so the calibration is still stored on the morning row exactly as `SES-128`
requires — **do not also call `derive_token_allowance` yourself.** It is harmless if you do (it
writes only when `tokens_per_pct` actually differs, read from `pg_get_functiondef` rather than
assumed), but it is a second statement to remember, which is the failure this entire family of
corrections exists to remove. The retired direct call, for reading the paragraphs below:

```sql
SELECT * FROM public.derive_token_allowance('<your cycle id>');   -- now called FOR you
```

- **`guard = 'ok'`** → `day_allowance` is your allowance for the day, and the call has already
  stored `tokens_per_pct` on the morning row (writing its own before-image, §19v — the
  `record_skip` precedent).
- **`guard` anything else** → `tokens_per_pct` and `day_allowance` come back **NULL**, which is
  not a failure and never an error to report: it means no trustworthy window exists, so you fall
  back to step (b)/(c)'s existing guardrails exactly as today. The four guards are: no bracketing
  pair; a non-positive meter delta (a reset or a rolled-over week); an empty window; and a bracket
  **wider than 24 hours**.
- **Pass your cycle id, not NULL.** `derive_token_allowance(NULL)` is the read-only dry-run form —
  it computes and writes nothing. Useful for a probe, wrong for the real check, because then the
  calibration is never stored and the next cycle re-derives it from scratch.

**Why only a night→morning pair counts.** While John is asleep the runner is the only thing
spending, so the gap between his last reading of the night and his first of the morning is a clean
measurement. That is what the `slot` column exists for. **A reading with no slot never brackets a
window** — it is still a real reading for the rest wall and the 48h staleness check, it simply
cannot calibrate. The eight readings that predate this ticket are `adhoc` for that reason and were
deliberately **not** backfilled: `13:50Z` is 8:50 AM in Chicago and reads exactly like a
"morning", and slotting it on that resemblance would manufacture a pair John never declared.

**JOHN'S NUMBER ALWAYS OUTRANKS THE DERIVED ONE.** An unexpired `budget_override` directive with
`max_tokens` is the ceiling, full stop — register B32, and a derived allowance is exactly the kind
of number a later cycle would be tempted to treat as authoritative. **`SES-147` (`v7.0.201`) added
John's STANDING daily-max box to that ladder and moved the whole ladder into
`resolve_day_token_cap()`, so no cycle applies it by hand any more.** Five rungs, top down —
`cap_source` tells you which one you got:

| # | `cap_source` | The cap | Whose number it is |
|---|---|---|---|
| 1 | `override` | an unexpired `budget_override.max_tokens` | John's number for **this one day** |
| 2 | `stale-floor` | `runner_budget.stale_fallback_tokens` (3M) | the safety brake — **no reading, or the latest older than 48h** |
| 3 | `daily-max-box` | `runner_settings.daily_max_tokens_millions × 1,000,000` | John's **standing** number, typed into §2b |
| 4 | `calibrated` | `derive_token_allowance()`'s `day_allowance` when `guard='ok'` | measured from his night→morning meter pair |
| 5 | `uncalibrated-default` | `runner_budget.runner_day_token_allowance` (10M) | the standing default |

**Two of those rungs are counter-intuitive and both are deliberate. Do not "simplify" either.**

- **The 48h stale floor sits ABOVE the box, not below it.** John's spec, verbatim: *"a standing
  number must not defeat the staleness brake."* The obvious reading of *"the box is THE day cap"*
  puts it at rung 1, and that hands a runner with **no idea how much of John's meter is left** a 25M
  budget. Proven with a negative control rather than reasoned about: box `4` with every reading aged
  past 48h returns `3,000,000 / stale-floor` on the shipped build and `4,000,000` on the
  box-above-the-brake build, from identical fixtures.
- **A one-day override still beats the standing box.** A number he wrote for today is later, more
  specific word than a number he left in a box — the same reasoning that puts a pin above the
  automation lane and layer 1a above layer 1b.

**A blank box (`NULL`) is rungs 1/2/4/5 exactly as they were before `SES-147`** — that is what makes
this additive rather than a change to how the runner already budgets, and it is why `NULL` must
never be coerced to `0`. **The rest wall (`all_models_pct ≥ weekly_rest_pct`, 85) sits above all
five and is overridable by none of them.** `resolve_day_token_cap()` **reports** it as
`rest_wall_hit` so one call carries the whole token track — **reporting is not enforcing: you still
check wall (a) yourself, first, and rest the cycle when it is true.**

**One number in that function is an assumption, and it is named rather than buried.** Turning the
remaining weekly pool into *one day's* allowance needs the days left in John's meter week, and
**that value is stored nowhere** — `runner_budget` carries month, caps, share and rest, and no week
anchor (read live, not recalled). The function therefore divides by **7**, the worst case, which is
the fail-closed direction: it can only under-spend, never over. Question `q-meter-week-anchor` asks
John for the real reset day; when he answers, that divisor becomes real and the allowance gets
**larger, never smaller**. Do not quietly replace the 7 with a guess in the meantime.

- **Deploy quota:** yield to John — if his manual sessions are pushing heavily today, prefer a
  gated-before-build item over a push. Use `VERCEL_TOKEN` from `runner_secrets` if present (export as env for `scripts/check-deploy-current.js`); if absent, note the skip in the cycle row — never invent a deploy-state claim.

## Phase 2 — the work

**4. Blocker sweep #1.** Verify dev serves: request the dev URL root with the
`x-vercel-protection-bypass` header (value from `runner_secrets`). A user-blocking failure
(5xx, blank page, broken run) preempts everything — fix it first, root-cause-first, no blind
fixes. *(Supervised run: the cheap reachability probe only; the full sweep spec is a 78d
item.)*

**4b. Invention pass — once per CST day, before selection (`SES-88`, register B12, `v7.0.138`).**
Deterministic designation, no coordination needed: run this pass **iff no `runner_cycles` row in
the current America/Chicago day carries `INVENTION PASS` in `notes`** (check with the step-3 CST
day window; under parallel cycles two simultaneous first-fires may rarely both run it — two
proposals instead of one, self-limiting and harmless, never a double build). The pass:

1. **Egress probe (precondition C3, measured not assumed):** one live WebSearch. If it fails,
   write `INVENTION PASS: egress blocked` in `notes`, skip the rest — tomorrow's pass retries.
   The first success closes C3 permanently; say so in the cycle row.
2. **Research:** market/competitor/whitespace + the platform's own usage signals, grounded in
   `docs/vision/market-map.md`, `thesis.md`, and `customer.md` — the corpus is the scoring
   frame, not your generic priors. The `P1 - Improves John's Skills` lens ranks first (A4).
3. **Generate exactly as many proposals as the invention trust rung** (`runner_ladder`,
   `work_class='invention'` — rung 1 = one proposal). Volume widens only by ladder (B12).
4. **Score against the vision corpus** and run §19v's R&D gate: research → cheapest-variant
   feasibility check → logged go/no-go with traceable reasoning (§19d sniff test — a proposal
   whose "why" can't be traced to corpus claims + evidence is a feature mill, kill it).
5. **File the surviving proposal as a `gated_before_build` `runner_items` card** — value case,
   the corpus claims it scores against (cite claim ids), cost guess, and the exact first build.
   **No backlog ticket yet:** John's Accept turns the card into a queued ticket (B17/B23).
   Reverse kills it and records the rejection in `vision/rejected-paths.md`.
6. Write `INVENTION PASS: ran, N proposals, card <id>` (or `: no survivor` — an honest zero
   beats a forced proposal) in `notes`, then **continue to step 5 normally** — the pass is
   bookkeeping plus research, not this cycle's build (B24 logic; the cycle still delivers one).

**5. Pick ONE item.** Selection layers, in order (register B30):
**(1a) One-off directives** — `runner_directives` `WHERE type='directive' AND status='queued'`,
oldest first: a directive is the mission, mark it `in_progress`. **(1b) A standing epic drain**
— see the block immediately below; it sits *under* 1a, because John's latest specific word
outranks a standing build order (the same reasoning that puts a pin above the automation lane).
(2) **John's automation queue — NO LONGER A LAYER YOU EXECUTE BY HAND. It is in
the board (`SES-86` phase 3, `v7.0.133`, directive `f47e5a95`).** It used to read: go to
`docs/RUNNER-GOV-0820-REQUIREMENTS.md`'s C4 section, work out which of his tickets is the next
incomplete one, and pick it before touching the class-sorted backlog. **That prose is now
`backlog_items.automation_rank`, the leading `ORDER BY` key of `recompute_backlog_queue()`** — so
his order arrives as queue positions 1..N like everything else, and layer (3)'s two statements
below are the whole of steps (2) and (3) together. Nothing to remember, nothing to re-derive.
(3) The backlog by class — **read from `public.backlog_items` via SQL, never by parsing the markdown
files (`SES-83` (d), `v7.0.112`; John's "table is authority" call, Accepted 2026-08-21T00:19Z).**
**The order is now STORED, not re-derived on every read (`SES-86` phase 2, `v7.0.130`,
register B4).** `backlog_items.queue` holds each ticket's position, maintained by one idempotent
full renumber, `public.recompute_backlog_queue()`. Recompute first, then read — two statements,
both verbatim:

```sql
-- (1) Recompute. Idempotent: returns the number of rows whose position actually moved,
--     so a board that did not change returns 0 and writes nothing.
SELECT public.recompute_backlog_queue();

-- (2) Read the top of the queue. Claims filter SELECTION, never the numbering.
--     design_status and kickoff_link are PROJECTED, never filtered on (SES-114): a flagged
--     ticket keeps its number and you skip it by reading it, exactly as status does.
SELECT backlog_id, queue, tier, priority_class, status, design_status, kickoff_link,
       left(regexp_replace(coalesce(description,''), '^\*\*P[0-9]+[^*]*\*\*\s*', ''), 200) AS gist
  FROM public.backlog_items
 WHERE queue IS NOT NULL
   AND (claimed_by IS NULL OR claimed_at < now() - INTERVAL '24 hours')
 ORDER BY queue
 LIMIT 5;
```

`queue IS NULL` means **out of the standings entirely** (B4, as amended by `SES-113`) — it is set
for exactly the tickets the old `WHERE` excluded by hand (`status IN ('done','removed')`, or no
`priority_class`), so the filter cannot drift from the numbering the way two hand-maintained
copies of one `ORDER BY` could. **Gated tickets still get a number** (B15): gated-ness is a lane
flag, never a missing position.

**A `removal proposed` ticket NOW HOLDS ITS NUMBER — and is skipped procedurally, right here
(`SES-113`, `v7.0.158`, migration `ses113_removal_proposed_keeps_slot`).** John's ruling
2026-08-22, verbatim: **"what if I reject the proposal?"** A removal-proposed ticket is one
**awaiting his verdict**, exactly like a `needs-john` ticket — and the two were being treated
oppositely: `needs-john` kept its number and was merely skipped, while removal-proposed was
stripped from the standings the instant the proposal was filed and vanished from "Next up", the
"Next 3" line, the `now`-tier census and the snapshot's ordering. His Reverse then had to
re-insert it from nowhere. The asymmetry was the bug; it is gone.

**What that means for YOU, at this query, and it is not optional.** The read above filters on
`queue IS NOT NULL` and claims — **it does not filter on `status`**. So a removal-proposed
ticket is now *visible to selection*, and building one would mean building a ticket whose premise
the runner itself has argued is **dead**, while John's verdict is still pending. `status` is
already a projected column of that query for exactly this reason: **when the top of the queue is
`status = 'removal proposed'`, DROP TO THE NEXT TICKET (B24) and leave its number alone.** Do
not re-card it — the removal card is already filed and undecided, and a second one is noise on
John's page. Do not clear its queue, and do not "tidy" it to `removed`: **no unattended removal,
ever** (step 8c) — `removed` is written only by harvesting John's Accept.

Two consequences worth knowing before you edit any of this. **John's Reverse is now zero-motion
re-entry:** the ticket already holds its earned slot, so "no, keep it" restores `status` and
`revalidated_at` and moves nothing — where it used to land wherever the next renumber happened
to put it. And the skip above is now **one of three**, read from the same query — see the block
immediately below, which is where `SES-114` stopped them being three separate rules a cycle has
to remember.

**THE BLOCKED PREFIX IS READ AT A GLANCE, NOT RE-DERIVED EVERY CYCLE (`SES-114`, `v7.0.165`).**
Three different flags mean *this ticket keeps its number and you step past it*, and until this
ticket they lived in three places with only `status` visible to the selection query. Read them
off the two columns the query now projects, in this order, and drop to the next ticket (B24) on
any of them:

| What you see at the queue top | What it means | Who clears it |
|---|---|---|
| `status = 'removal proposed'` | The runner argued the premise is dead; John's verdict is pending (`SES-113`) | John, on the removal card |
| `status = 'delivered'` | Built and pushed by a cycle; John's Accept is pending (`SES-154`) | John, on the ship card |
| `design_status = 'needs-john'` | A decision is owed on a filed `gated_before_build` card | John, on that card |
| `design_status = 'needs-desktop'` | The remaining work is on a surface an unattended cycle may not touch (`.claude/`, register B39) | A session John attends |
| `design_status = 'john-paced'` | The remaining work is John ratifying cards **already on the page** (`SES-166`, `v7.0.209` — today only `SES-84`, whose ask is §12's vision claim cards) | John, on those cards, at his own pace |
| `design_status = 'designed'` | **Not a skip** — the design already exists; see step 6's fast path | — |

Each one is a `record_skip()` call before you drop (`reason_kind` `removal-proposed` /
`needs-john` / `needs-desktop` — or `permission-gate` when the block is the `.claude/` gate
specifically). **A contested claim is still NOT a skip** — it clears itself in 24h and John can
do nothing about it.

**`delivered` and `john-paced` are the two rows in that table that are NOT `record_skip()` calls,
and both for SES-127's own boundary rather than as exceptions to it (`SES-154`, `v7.0.205`;
`SES-166`, `v7.0.209`).** A skip row
exists to put an ask on John's page that nothing else is carrying. A `delivered` ticket already has
one — its undecided `ship` card, which asks him for the very tap that clears the status — so
recording a skip as well gives one ask two homes and puts the same ticket in front of him twice,
which is precisely how §10 stops being read. Step past it silently and let the card do its work.
It also needs no `resolved_at`: §10 derives "still skipped" from the ticket's status, and John's
Accept moves it to `done` with no write from you. Note where this skip does and does not bite: the
drain's pick predicate excludes `delivered` **in SQL** (migration `ses154_delivered_status`), so a
delivered member can never be handed to you as a drain pick — this procedural skip is for layer 3's
class-sorted board read, which filters on `queue` and claims but never on `status`.

**`john-paced` is the same boundary applied to a ticket that is not delivered (`SES-166`,
`v7.0.209`, migration `ses166_john_paced_design_status`; John, 2026-08-23: it "should not"
appear as something he must address).** The ticket's remaining work is John ratifying cards the
page already carries — for `SES-84` — *the vision corpus*, that is §12's vision claim cards, three
per rebuild — so the ask has a home and a skip row would be its second. Found live: `SES-84` wore
`needs-john`, whose row above records a skip, and `record_skip()` re-asserted it into §10.1
*Needs your decision* three times in one day with an Unblock button that had nothing to unblock
(its own reason text admitted "no unattended build is left"). Step past a `john-paced` ticket
silently — no `record_skip()`, no `resolved_at` bookkeeping — and let its cards do their work; the
ticket flips `done` on its own terms (for `SES-84`: when every claim is ratified or reworked).
Never write `john-paced` yourself: like every `design_status` re-flag that changes what John is
told he owes, assigning it is his call, made in an attended session.

**Measured before this shipped, because the waste was real and this cycle paid it too.** The
step-5 query projected `status` and nothing else, so a `needs-desktop` ticket looked exactly like
a buildable one and the only way to tell was to read its description and reason the blocker out
again. Live `runner_skips` at `23:10Z` 2026-08-22 held `SES-106` and `SES-110`, at queue **1** and
**3** — the top of John's standing Automation drain — and their `skip_count` went 1 → 2 while this
cycle re-established, for the third time that day, what two earlier cycles had already
established. Three re-derivations of one answer, on a 3-hour cadence.

**The honest half: the flag had to be made TRUE, not just visible.** Census at `23:11Z`, before a
line changed: `design_status` was `designed` on 23 rows and `NULL` on the other 573 — **zero rows
carried `needs-john` or `needs-desktop`**. Projecting the column alone would have shipped a skip
that can never fire and a QA that passes while nothing changes. So the filing-time write below
ships in the same commit, and the two live permission-gate rows were corrected to `needs-desktop`
from **their own descriptions** (`SES-106`: *"that half needs a session John attends"*;
`SES-110`: *"the `.claude/` session-setup half is needs-desktop"*), before-image first.
`CHI-89` was deliberately left alone: `removal proposed` lives in `status`, and giving one fact a
second home is how two copies start disagreeing.

**`NULL` is not `auto`.** 545 open rows carry `NULL` and run the full ceremony, which is what
`auto` also means — but they are not the same claim, and no cycle may backfill `auto` onto a row
nobody has classified.

**LAYER 1b — A STANDING EPIC DRAIN (`SES-111`, `v7.0.156`, migration `ses111_drain_epic`).**
John's ask, filed with the Automation epic 2026-08-22: *"run the Automation epic to completion
non-stop."* A drain is a `runner_directives` row he writes **once** — `type='drain-epic'`,
`epic_id` naming the epic — meaning *work **the members he named**, cycle after cycle, until none
are left.* Run it as **one call**, before layer 2/3's recompute-and-read:

```sql
SELECT * FROM public.drain_epic_next('<your cycle id>');
```

**THE FINISH LINE IS A FIXED LIST JOHN NAMED, NOT THE LIVE `now` TIER (`SES-142`, `v7.0.179`,
migration `ses142_drain_scope`).** John's ruling, 2026-08-23, in chat, verbatim: ***"the user must
name when the drain is done… The use case is the epic automation — all its current tickets in the
now bucket are complete."*** Until this shipped, both predicates read the epic's **live** `now`
tier — and cycles file new tickets into a drained epic continuously, so the finish line receded as
fast as the runner approached it and a standing order John gave with an end in mind was becoming an
open-ended mandate the runner granted itself. **Measured, and the defect selected the very cycle
that fixed it:** John named **18** members on directive `b74009ea`; the live `now` tier held
**19**; the extra one was `SES-142` **itself**, filed `03:51Z` *after* the naming — and
`drain_epic_next()` returned it as the `pick`. The scope now lives in
`public.runner_drain_scope` (one FK row per named member, `unique (directive_id, item_id)`), and a
ticket filed into the epic **after** naming never joins a standing drain: it queues normally and
waits for John.

**Five outcomes, and the whole rule is in them — do not re-derive it:**

- **`none`** — no drain declared. The normal case: ignore this layer entirely and read the board
  exactly as before. **Selection with no drain standing is byte-for-byte what it was in
  `v7.0.155`.**
- **`pick`** — build `backlog_id` (claim it with step 5's atomic claim, same as any ticket). It is
  the lowest-`queue` **named** member you can claim.
- **`blocked`** — the drain is live and named members are still open, but none you can claim right
  now (a peer holds them). **Fall through to the class-sorted board and build normally.** A drain
  must never end a cycle build-less — register B24's rule, binding here for the same reason.
- **`unscoped`** (`SES-142`) — a drain exists but **John has named no member list for it**. Behave
  exactly as for `blocked` — fall through and build from the board. It is a **separate word from
  `blocked` on purpose**: reusing `blocked` would give one outcome two meanings, and the thing it
  must never do is quietly fall back to the live-tier predicate, which is the bug wearing a
  default's clothes. It fails closed and does **not** retire the drain. The only way to reach it is
  a future drain declared without a list; the standing drain `b74009ea` carries its 18 since this
  ship.
- **`retired`** — **every named member** is `done`/`removed`. The function has already written the
  before-image and closed the directive; nothing is owed. Fall through.

Five properties that are load-bearing, each written into the migration header so they travel with
the code. **Anyone editing this must preserve all five:**

- **The epic is an FK, never prose in `body` — and so is the SCOPE (`SES-142`).** `CHECK
  ((type='drain-epic') = (epic_id IS NOT NULL))` — a drain must name an epic, nothing else may.
  The member list is `runner_drain_scope` rows keyed on `backlog_items.id`, **never a `text[]` of
  ids**: `backlog_id` carries no unique constraint (`CHI-48` occupies two rows, `SES-97`), so an id
  array silently pulls in both. `runner_drain_scope.backlog_id` is a naming-time snapshot for
  provenance and is **never joined on**. Same prose→column correction as `SES-86` phase 3 and
  `v7.0.146`, for the same measured reason.
- **A drain is NEVER consumed.** Layer 1a's *"mark it `in_progress`"* would end the standing-ness
  on cycle 1, which is the entire feature. `drain_epic_next()` touches `status` only to retire.
- **The NAMED LIST REPLACES the tier predicate — it is not kept alongside it (`SES-142`).** This
  property used to read *"`now` tier only"*, from John's boundary on `SES-110` (*"finish the
  `<epic>` tickets"*). His 2026-08-23 ruling supersedes it: the list is captured **from** the `now`
  bucket at naming time and is thereafter the whole scope. **Do not re-add a `tier` clause** — that
  would leave a second moving predicate in place, so re-tiering a named ticket to `next` would
  silently drop it out of a drain John declared over it. Proven live in QA: with `SES-141` re-tiered
  to `next`, the shipped build still picks it and the retired build drops it and picks `SES-140`.
- **`blocked` is NOT `retired`, and this is the parallel-cycles trap (register B42).** The two
  predicates differ on purpose: **retirement** asks whether any **named** member is still open,
  claims ignored; the **pick** asks which named member *you* can claim, claims honoured (24h
  expiry, the B37 bar). Conflate them and two peers holding the last two claims between them each
  cancel John's standing order while both tickets are still being built. Proven live: sole member
  claimed by a peer → `blocked`, `open_now=1`, directive untouched.
- **It never self-activates.** Nothing creates a drain row **or a scope row** but John's own
  declaration — a directive row or a briefing tap. The runner may read one; it may never write one.
  This is the property that keeps the feature from being a widening of the runner's own autonomy,
  and it is not negotiable.

**Corrected, because it was measured rather than recalled (`SES-142`, `v7.0.179`).** This paragraph
used to read *"the Automation epic cannot currently drain to completion — `SES-110` is `partial`
with one `.claude/` half an unattended cycle may not make."* Read live this cycle,
`SES-110` **and** `SES-106` are both `status = 'done'`, so that specific blocker is gone. The real
reason the drain could not terminate was never `SES-110`: it was the **live-tier predicate this
ticket replaced**, which the runner's own filings extended faster than it drained. Termination now
depends only on John's 18 named members closing — a set no cycle can add to.

**THE AUTOMATION LANE SITS ABOVE ALL SIX ORDER CLAUSES (`SES-86` phase 3, `v7.0.133`, directive
`f47e5a95` — John, 2026-08-21T16:21Z).** His line, verbatim: *"keep closing automation tooling
tickets first before getting to the classified backlog."* `backlog_items.automation_rank` holds his
C4 step number (1–6; NULL = not in the lane) and is the function's **leading** key, `NULLS LAST`.
Three things about it:

- **Why it stopped being prose.** As a doc section, layer 2 was something each cycle had to
  remember to consult, and the forgetting was silent. Measured on the live board at `16:29Z`
  2026-08-21, immediately before this shipped, his automation tickets sat at queue **2, 241, 242,
  243, 244, 280, 281** of 551 — five of seven past position 240, reachable only by a cycle that
  went and read C4 by hand. It had already failed: the `v7.0.130` briefing told John in writing
  that *"the next unattended cycle will be building product, not tooling, for the first time"*,
  and he overruled it within the hour. After the change, queue **1–5** are his open automation
  tickets in his own order and the class-sorted backlog resumes at 6.
- **It retires itself, which is his "until automation is complete".** A `done` ticket leaves the
  ranked set, so when the last lane ticket closes, the leading key matches nothing open and the
  order reverts to the six clauses — no migration, no edit, no cycle deciding it is over. Do not
  add an "is the lane finished?" check; that is the thing this replaced.
- **When pins land, a pin outranks the lane.** B23's "a gated card's Accept re-enters at queue #1"
  still has nowhere to store a pin. Add it as the key *above* `automation_rank`, never below:
  John's live tap is later word than a standing build order.
- **A NEW automation ticket claims the TOP of the lane, and one call does it —
  `SELECT public.claim_automation_lane_top('<TICKET-ID>');` (`SES-101`, `v7.0.147`, migration
  `ses101_automation_lane_top`).** Nothing assigned `automation_rank` at filing time, so a newly
  filed automation ticket landed in the class-sorted backlog exactly like the seven tickets that
  sat at queue 241–281 *before the lane existed*. **John's ruling is that it goes above the
  existing lane, not below** — question `q-lane-top`, answered **yes** 2026-08-21T20:47Z, from his
  directive `48ae1939` line 4: *"if you create more automation tickets keep making them top of
  queue."* The slot is therefore `min(open lane) − 1`, **never `max + 1`**. Three things worth
  knowing before you edit it: it is **idempotent** (a ticket already at the open lane's minimum is
  left alone, so a second call cannot ratchet it further negative); it **runs the queue recompute
  itself**, because making the caller remember a second statement is the exact class of forgetting
  this ticket exists to remove; and it reads the **open** lane only, so `done`/`removed` tickets
  keep their historical rank (`ADM-1` = 1) without competing. It is **not** `SECURITY DEFINER` and
  `EXECUTE` is revoked from `PUBLIC` — see the grants note below. **Measured, because the drift was
  already real:** the last three automation tickets filed before this shipped were hand-assigned to
  the *bottom* of the lane (`SES-99` = 7, `SES-100` = 8, `SES-101` = 9), the opposite of what he
  answered.
- **Revoking a function's `EXECUTE` from `anon, authenticated` does NOTHING — you must revoke from
  `PUBLIC` (found live, `SES-101` QA, `v7.0.147`).** This is the exact function-level twin of
  `.claude/rules/supabase-column-grants.md`: Postgres grants `EXECUTE` to `PUBLIC` by default, and
  a narrower revoke cannot subtract from the broader grant. The first migration's
  `REVOKE EXECUTE … FROM anon, authenticated` **reported success and changed nothing** —
  `has_function_privilege('anon', …)` still returned `true`. The working form is
  `REVOKE EXECUTE ON FUNCTION … FROM PUBLIC, anon, authenticated;` followed by an explicit
  `GRANT … TO postgres, service_role;`. **Assert both directions** — the denied role denied *and*
  the permitted role still permitted — exactly as the column rule requires; a one-directional
  check passes on a function nobody can call at all.

**John's rules live inside the function now — that is the point, and it does not make them
optional.** The function's `ORDER BY` is the retired query's, clause for clause: tier
`now → next → later`, then `P1 - Improves John's Skills` → `P10 - Tooling`, then beta-marked
first, then newest filed, then oldest (John, 2026-08-20); `backlog_id` last so two readers of the
same board always see the same #1. Five things about that ordering are load-bearing and were each
found live. **Anyone editing `recompute_backlog_queue()` must preserve all five** — they are
repeated in the migration's own header comment (`ses86b_backlog_queue_numbers`) so they travel
with the code:

- **Order the class numerically, never lexically.** `ORDER BY priority_class` is a text sort and
  puts `P10 - Tooling` *ahead of* `P2 - Inventive` — exactly backwards. Hence the digit extract.
  **Measured against the live board 2026-08-21 (`v7.0.130`'s negative control), because "it looks
  right" is not a test:** numbering the same 550 tickets lexically produces **17,616** class
  inversions and **81,281** tier inversions; the shipped function produces **0** of each. That
  gap is what makes the QA discriminating — an implementation that merely gave every ticket
  *some* number would pass a completeness check and fail this one.
- **`priority_class` carries suffixes.** Live values include `P9 - Bug Fixes · FLAGGED` (19
  tickets). Matching the ten legend strings by equality silently drops every one of them;
  extracting the digit tolerates the suffix.
- **Beta-marked means the retired *declaration*, not the word.** `ILIKE '%beta%'` matches 130
  tickets against the declaration form's 110; the 20-ticket gap is prose, 10 of it the session
  slug `beta-doc-0728c` quoted as evidence inside unrelated bug tickets. Use the regex form.
- **`title` is not a title for imported tickets** — phases (a)/(b) stored the class string there
  (`'P9 - Bug Fixes.'`). The human sentence is the first bolded clause of `description`, which is
  what `gist` extracts. Anything that *displays* the queue (briefing "Next up", "Next 3") must
  use `gist`, not `title`, until the stored column is repaired.
- **The `claimed_by` filter is SES-86 phase 1 — claim-on-pick (John, 2026-08-21, live in chat:
  tickets are the coordination point across ALL sessions, manual and scheduled).** A claimed
  ticket is invisible to selection until its claim expires (24h — the same evidence bar as
  step 0b's silent-cycle rule). See the claim step below.
- **`id` is the final tie-break, and `backlog_id` is NOT unique (`SES-86` phase 2, found live by
  its own QA).** The sixth and last `ORDER BY` clause is the primary key. It exists because
  `backlog_id` carries no unique constraint and **`CHI-48` occupies two rows** (queue 152/153;
  filed as `SES-97`). Two rows identical on all five preceding keys make `row_number()`
  **non-deterministic** for that pair, so the renumber could swap them and report work on a board
  where nothing moved — measured: `550 → 0` (which looked like idempotence and was luck), then
  `435 → 2 → 0`. Adding `id` changes no position that was ever well-defined; it only decides ties
  that previously had no defined answer. **Do not drop it**, and do not assume a ticket ID
  identifies one row: `UPDATE … WHERE backlog_id = 'CHI-48'` writes both.
- **`status='partial'` does not mean the phase you are about to build is unbuilt.** It means
  *some* of the ticket shipped — layer 3's current #1, `ADM-1`, shipped v1 on 2026-08-20 and
  stays `partial` only because v1.5 was deferred. Read the ticket and its harvest before
  building; `SES-86`'s lifecycle status is the structural fix.

**That constraint is GONE — `SES-85` landed (`v7.0.128`) and the whole board is pickable.**
Measured live 2026-08-21 at 16:0xZ, after this cycle's first renumber: **550 open tickets, 0
unclassed, all 550 numbered `1..550`** (now 280, next 23, later 247; 10 tickets `done`). The
figure this paragraph used to carry — "456 of 550 unpickable, leaving 94" — was true at the close
of `v7.0.112` and is now false; a cycle quoting it would under-read its own queue by 6×. **Take
your own census rather than quoting this one** — including of the sentence that used to sit here.
`v7.0.130` reported the queue's top as `DAT-003`, `ADM-1`, `AGT-015`, `LOG-126`, `CHI-89` and drew
the conclusion that the runner would now be "building product, not tooling"; John read that on the
briefing and overruled it (directive `f47e5a95`), so since `v7.0.133` the top is the automation
lane and the class sort resumes beneath it. Measured 2026-08-21T16:4xZ: 549 open, 0 unclassed, all
numbered `1..549`, lane at 1–5. **Classify its lane against
§19v: anything gated — or uncertain — becomes a `gated_before_build` `runner_items` row with
your reasoning — then the ticket goes pending and you DROP TO THE NEXT available queued
ticket and continue (register B24: a card is bookkeeping, not a build — never end the cycle
over one; only walls and blockers end a cycle build-less).** Exactly ONE build per cycle,
never more. A gated card's later Accept re-enters that ticket at queue #1 (register B23 —
tap-order stacking, recompute renumbers beneath).

**FILING THE CARD ALSO WRITES THE TICKET'S `design_status` — same act, not a later one
(`SES-114`, `v7.0.165`).** The card is the *ask*; the row is the *state*, and until this ticket
only the ask existed, which is why the next cycle had to rediscover the block from prose. So in
the same breath as the `runner_items` insert, **before-image first** (§19v):

```sql
-- 'needs-john'    = the card asks John to DECIDE something.
-- 'needs-desktop' = the remaining work is on a surface an unattended cycle may not touch.
-- ('john-paced' also exists — John ratifying on-page cards, SES-166 — but it is NEVER yours
--  to write here: no gated card carries it, and assigning it is John's call. Step 5's table.)
UPDATE public.backlog_items
   SET design_status = '<needs-john|needs-desktop>', updated_at = now()
 WHERE backlog_id = '<TICKET-ID>'
RETURNING backlog_id, design_status;
```

Two boundaries. **Never write `removal proposed` here** — that is a `status`, `SES-113` owns it,
and duplicating it into `design_status` gives one fact two homes. And **never clear the flag
yourself**: it is cleared by the thing that unblocks the ticket — John's tap, or the attended
session that makes the edit — exactly as `record_skip()`'s row is cleared by the ticket going
`done` rather than by a cycle deciding it has waited long enough.

**EVERY SKIP YOU MAKE IS A ROW, NEVER A SENTENCE (`SES-127`, `v7.0.162`, migration
`ses127_skip_records`).** Whenever you step past a ticket for a reason **John** has to clear —
a gated card already filed, a `removal proposed` verdict pending, a `needs-john` /
`needs-desktop` `design_status`, a `.claude/` permission gate — record it with one call, before
you drop to the next ticket:

```sql
SELECT public.record_skip('<your cycle id>', '<TICKET-ID>',
       '<gated|removal-proposed|needs-john|needs-desktop|permission-gate|other>',
       '<one sentence in John''s register: why it is skipped and what would unblock it>');
```

**Measured, because this was already failing silently.** Before this shipped, fifteen
`public.runner_*` tables existed and **none stored a skip** — so every skip this platform ever
made lived as prose inside `runner_cycles.notes` (live example: cycle `1df7d9c6`, 19:12Z, *"Step
5: queue #1 `SES-110` skipped per B24 …"*). That sentence is real, correct, and completely
invisible to John, who does not read the ledger. §10 of the briefing is what it feeds.

Four things about the call, each of which prevents a real failure:

- **It is idempotent and you are meant to call it every time.** A repeat skip of the same ticket
  for the same reason bumps `skip_count` and `last_skipped_at` on the existing row rather than
  adding a second one — which is what stops John's standing drain (25 open `now`-tier members,
  eight cycles a day) from showing him the same row 8×/day.
- **Do NOT record a skip you can resolve yourself.** A contested ticket claim (0 rows, a peer
  holds it) expires in 24h with nothing for John to do, and `claimed-by-peer` is deliberately
  absent from the `reason_kind` vocabulary — the section is titled *waiting on **your** input*,
  and filling it with rows he cannot action is how an actionable section stops being read.
- **You do not resolve it afterwards.** §10 derives "still skipped" by joining `backlog_items`
  and filtering `status NOT IN ('done','removed')`, so building the ticket later removes the row
  from the section with no write from you. `resolved_at` is only for a ticket that is still open
  when its blocker goes away.
- **It writes its own before-image**, both paths (§19v), so this one call is the whole of your
  obligation.

**The moment the pick is made, CLAIM the ticket — one atomic write, before any work
(SES-86 phase 1, John-approved 2026-08-21).** The write is the reservation, exactly like the
lease and the counters — never check-then-claim in two statements:

```sql
UPDATE public.backlog_items
   SET claimed_by = '<your cycle id or session name>', claimed_at = now(), updated_at = now()
 WHERE backlog_id = '<TICKET-ID>'
   AND status <> 'done'
   AND (claimed_by IS NULL OR claimed_at < now() - INTERVAL '24 hours')
RETURNING backlog_id;
```

**1 row → the ticket is yours. 0 rows → another session (manual or scheduled) holds it — drop
to the next available queued ticket, exactly as B24 drops past a gated card.** This is what lets
John's manual sessions and scheduled cycles share one board without duplicate builds: manual
sessions run the same claim (session-setup skill step 2c). Directives (selection layer 1) are
already serialized by `in_progress`; this covers layers 2 and 3. **Release the claim AFTER the
push — never in the write that sets the ticket's status (John, question `q-claim-release-order`
answered yes 2026-08-21T22:05Z; `SES-106`, `v7.0.150`).** This paragraph used to say the
opposite, and the opposite could not be obeyed: the claim is the token the push gate re-asserts
(step 0), so a cycle that cleared it in the status write had nothing left to prove one step
later and its own re-assertion returned 0 rows — which the gate defines as *"do NOT push"*. The
order is therefore fixed: status write (before-image first, **claim untouched**) → queue
recompute → re-assert → push → **then** one holder-guarded release. On an abort or a wall-stop
there is no push, so the release happens at the point the cycle stops instead. A
claim you never release expires on the 24h boundary, so a dead session cannot strand a ticket;
QA proved all three arms live on real rows (fresh → 1, contested → 0, 25h-stale → re-claimable).
**The moment the
pick is made, rename this session** to `"<TICKET-ID> — <short name>"` (e.g. "SES-83 (b) —
import NEXT+LATER") so John's runs list shows the work at a glance; on a wall-stop, rename to
`"did not run — <wall>"` back at step 3. No title mechanism available → note it in the cycle
row (register B22).

**6. Full ceremony — no shortcuts, you earn no exemption.** **STEP ONE OF ANY BUILD IS
PICK-TIME PREMISE REVALIDATION (`SES-87` — the revalidation flow, register B7, `v7.0.139`):**
before designing anything, re-verify the ticket's premise against live code/data — does the
gap still exist, or did an intervening ship close it? Premise holds → set
`revalidated_at = now()` and build. Premise dead → set `status = 'removal proposed'`, file a
briefing card carrying the ticket (ID — title) plus the evidence the premise died (commit,
measurement, superseding ticket), run the queue recompute, and **drop to the next queued
ticket per B24** — never build a dead premise and never remove unattended.

**`design_status = 'designed'` MEANS THE DESIGN ALREADY EXISTS — build from `kickoff_link`,
do not re-design it (`SES-114`, `v7.0.165`).** 18 open numbered tickets carry it (census
`23:11Z` 2026-08-22). The row cannot claim it without its artifact — `SES-112` shipped
`CHECK (design_status <> 'designed' OR kickoff_link IS NOT NULL)` — so the link is guaranteed
present, and re-deriving a kickoff for a ticket that has one is the same waste in a different
costume. `auto` or `NULL` runs the full ceremony below exactly as today. **Revalidation is NOT
skipped by this** — a designed ticket's premise can die like any other, and the fast path starts
after the revalidation above, never instead of it.

Then: read the
item's backlog row, the governing `ARCHITECTURE.md` section(s), every `.claude/rules/` file
whose paths you will touch, and the real source files. Inventions additionally pass the R&D gate first (research →
cheapest-variant POC, measured → logged go/no-go; §19d sniff test — traceable reasoning, never
a feature mill). **Re-assert the lease (step 0) before the counter claim** — a version claimed
after you were stolen from is a permanent gap at best — then claim your version atomically
(`dev_version_counter`, SQL in
`docs/runbooks/session-setup.md`). Write the kickoff doc
(`docs/kickoffs/<version>-<ID>-<name>.md`). Implement within the scope caps (one item, ≤3
files, ≤4 tasks). **Model discipline (John, 2026-08-20, register B21):** you are the Opus 5
orchestrator — delegate by task shape via the Agent tool: judgment-dense steps (kickoff design
for P1–P5 work, root-cause diagnosis, invention scoring, P1–P4 classification) to a
**Fable 5** subagent (`model: claude-fable-5`); mechanical steps (doc sweeps, imports,
formatting) to a **Sonnet 5** subagent (`claude-sonnet-5`). State the clone's absolute path in
every subagent prompt. Attempts-per-tier ≤ 1 — a failed attempt re-runs that piece one tier
up or files a gated-before-build item; never grind. If the Agent tool is unavailable in this
environment, note that in the cycle row and continue on Opus 5 — the first cycle to try it is
the verification.

**A subagent that has not returned is not a result (`SES-83` (d) cycle 4, corrected `v7.0.117`).**
A delegated probe that is still `running` at close-out has told you **nothing** — not "blocked",
not "slow", not "failed". Cycle 4 read ~21 minutes of silence from a background probe as evidence
of a block, wrote that reading into the ledger, `CLAUDE-STATE.md`, `docs/SESSIONS.md`, the briefing
and a push notification, and closed. The agent then returned **success**: three tool calls, no
denial, no prompt — 2,090,008 ms of latency, not a block. Delegating the probe was right and is
what made the error recoverable; converting its silence into a finding was not. So: **either wait
for the agent, or report the question as still open** — never a third thing. Two mechanics make
waiting cheap, and a cycle that delegates anything load-bearing should use both: (1) have the
subagent append a one-line `STARTING …` / `RESULT …` breadcrumb to a scratchpad file **outside**
the paths under test after every step, so a hang still leaves evidence of exactly which step hung;
(2) block on the breadcrumb with a bounded background wait rather than guessing from elapsed time.

**7. QA bar, then ship at ONE ship point.**
- `npm install && npm run build` green (a `src/`/`api/`/`lib/` change that fails build never
  ships).
- The regression suite green where it applies (`tests/regression/run-all.js`).
- A **discriminating** self-QA on the new path — state the test, then ask: would it still pass
  if the change did nothing? If yes, it is not QA. Prefer live end-to-end; a seam proof
  (import the repo's own module against real Supabase) is acceptable and **must be labeled a
  seam proof** in the evidence. Every Supabase write your QA makes gets a before-image row
  first and is cleaned up after.
- Exposure rule: surface-visible work ships behind a default-off flag; fixes ship live (§19v).
- Close-out ticket update — **a Supabase write, not a file edit** (`SES-83` (d) cycle 3,
  `v7.0.114`): set the ticket's `backlog_items.status` (and `priority_class` if it changed) with a
  `runner_before_images` row first. **THE STATUS YOU WRITE IS `delivered`, NEVER `done` (`SES-154`,
  `v7.0.205`; spec `docs/design/BRIEFING-COMMENTS-0823-DRAFT.md` decision 1, John "yes"
  2026-08-23).** A ship is the runner saying it finished; `done` is John saying he accepts it, and
  only the step-9 harvest of his Accept writes that. This is the whole of acceptance-gated
  completion, and the bit that makes it more than a rename: **you do not wait.** The card goes on
  his page, the ticket sits `delivered`, and the cycle moves on to other work — a delivered ticket
  is stepped past at step 5 (the blocked-prefix table) and is excluded from drain picks in SQL, so
  it can never be re-picked while it waits. Use `partial` exactly as before for work that genuinely
  stopped half-done; `delivered` means *finished and awaiting his verdict* — **and LEAVE THE CLAIM ALONE here: it is released after the
  push, in its own statement below (`SES-106`, `v7.0.150`).** This bullet used to read *"and
  clear the claim in the same UPDATE (`claimed_by = NULL, claimed_at = NULL`)"*, which
  contradicted the re-assertion gate two bullets down — a cycle cannot treat the claim as a hard
  gate on the push after its own close-out has already dropped it. John settled the order
  himself (`q-claim-release-order`, **yes**, 2026-08-21T22:05Z): release after the push. **Then run
  `SELECT public.recompute_backlog_queue();`** — completed/removed is one of B4's recompute
  events (`SES-86` phase 2, `v7.0.130`). It is idempotent and returns 0 when nothing moved, so
  running it is never wrong. **What it will NOT do any more, and that is deliberate: your ship no
  longer strips the ticket's number (`SES-154`, `v7.0.205`).** This clause used to read *"and a
  ticket that just went `done` must lose its number before John sees the board"* — true of `done`,
  and exactly wrong for `delivered`. A delivered ticket is awaiting his verdict, so it **keeps its
  queue slot**, for the same reason a `removal proposed` one does (`SES-113`): he can still see it
  in the §8 matrix while he decides, and his Accept becomes zero-motion re-entry rather than a
  renumber. So `recompute_backlog_queue()` is **unchanged** by `SES-154` — measured on a fixture
  rather than assumed: a delivered ticket sitting at queue 2 was still at queue 2 after a recompute
  that moved 0 rows. The number is released when the tail's Accept harvest writes `done` and runs
  the recompute there. This line used to read "`FEATURES*.md` row (status + P-class)"
  and was left behind by cycle 2's trim — those files hold no ticket rows to edit, so it
  contradicted this same runbook's step-5 selection query. A cycle that still edits a
  `FEATURES*.md` row is writing to a stub.
- Close-out edits in the same commit set: `CLAUDE-STATE.md` (version line + your one-line bullet,
  keep 3), `docs/SESSIONS.md` entry, version-header comments on touched files.
- **Backlog snapshot (SES-83c, `v7.0.107`) — in the same commit set, every ship:**
  `SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/export-backlog-snapshot.js` (both values
  from `runner_secrets`, exported as env, never written to a file). It regenerates
  `docs/backlog/BACKLOG-SNAPSHOT.md` from `public.backlog_items` — the table's only repo-side
  copy, which is what makes the board restorable and gives its history a git log. The output is
  deterministic (no timestamp in the body; provenance is the ticket count + a payload `sha256`),
  so a cycle that changed no ticket prints `unchanged`, writes nothing, and commits nothing —
  a diff here always means the board actually moved. Exit **2** is "could not run" (missing env,
  PostgREST error), never a pass: treat it like any other failed check — investigate, and if the
  export cannot run, say so in the cycle row rather than shipping a silently stale snapshot.
  `--check` (exit 1 = drift) is the read-only form for a cycle that wants to know whether the
  snapshot is current without writing it. **This step-7 export captures the board through your
  own close-out (the ticket you just set `delivered`, its recompute) but NOT John's harvest — those
  writes land in the step-9 serial tail, AFTER this push — so a step-7-only snapshot is
  systematically one harvest stale (`SES-109`, `v7.0.149`, found live by cycle `ff23297c`). The
  tail re-exports it once the harvest has landed; see the tail's snapshot sub-step below. Do NOT
  try to close the gap by moving the harvest earlier: B42 put those writes in the serial tail on
  purpose, because they race under parallel cycles.**
- **Re-assert the lease, then one batched push.** The re-assertion `SELECT` (step 0) is a **hard
  gate on the push**: run it, and only on 1 row proceed with
  `git fetch origin dev && git rebase origin/dev && git push origin HEAD:dev`. Never
  per-artifact pushes. 0 rows → do not push; follow the stolen-from procedure in step 0. Keep
  the `git fetch` too — it catches a different failure (a successor that shipped without taking
  your lease), and `633fe486` survived on that accident alone.
- **Release the ticket claim — now, once the push has landed, and not one step earlier
  (`SES-106`, `v7.0.150`; John's `q-claim-release-order`).** One statement, holder-guarded so a
  cycle whose claim expired and was re-taken can never clear its successor's:

```sql
UPDATE public.backlog_items
   SET claimed_by = NULL, claimed_at = NULL, updated_at = now()
 WHERE backlog_id = '<your TICKET-ID>' AND claimed_by = '<your cycle id>'
RETURNING backlog_id;   -- 0 rows = already re-claimed by someone else; leave the new holder alone
```

  On an abort or a wall-stop this is still where the release happens, just without a push in
  front of it — release at the point the cycle stops. Nothing here can strand a ticket either
  way: an unreleased claim expires on the 24h boundary.

## Phase 3 — evidence

**8. Blocker sweep #2.** Re-run step 4's probe. If your own ship broke dev: revert-forward
immediately, restore your before-images, set the cycle `outcome='reverted'` — it counts as a
Reverse on the ladder.

**8b. Heal sweep (`SES-89`, `v7.0.108`) — detect, file, never fix.** Run the Heal engine over the
platform's own failure ledger and let anything recurring become a normal queued ticket:

```
SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/heal-engine.js --json
```

Exit **1** means it found recurring failure signatures that are over threshold and not yet filed.
Only then, claim an id block of that size in **one** `feature_id_counter` call (SQL:
`docs/runbooks/session-setup.md` §3b) and re-run with
`--apply --cycle-id=<your cycle id> --backlog-ids=LOO-<n>,…`. Exit **0** is "nothing new" — the
normal, quiet case. Exit **2** is "could not run" (missing env, REST failure, `--apply` without a
cycle id or ids): note it in the cycle row and never treat it as a pass. List any filed `LOO-` ids
in the cycle row's notes and on the briefing.

Four things this step deliberately does:

- **It reads `durable_hops`, not `ai_activity_log`.** The `SES-89` ticket said the latter; verified
  live 2026-08-20, `ai_activity_log` has 34,449 rows and **no status or error column at all**, so
  there is no error rate in it to read. `durable_hops` is the real ledger: 260 `failed` rows, all
  260 carrying classifiable error text. Regression trends and Vercel logs were dropped for the same
  reason — nothing persists them to query.
- **It never mints its own ticket id.** The atomic block claim is an `UPDATE … RETURNING` with
  arithmetic, which PostgREST cannot express and this project has no RPC for. The cycle claims the
  block through the connector and passes it in — that is what keeps CLAUDE.md's atomic-counter rule
  intact instead of quietly hand-counting.
- **The INSERT before-image convention starts here.** Every prior `runner_before_images` row records
  an UPDATE and carries the old row in `row_data`. A heal filing is an INSERT, so there is no prior
  state: it writes `row_data = NULL`, meaning **"this row did not exist — Reverse is a DELETE of
  this pk."** The before-image is written first and its success is what authorises the ticket
  insert (§19v: no before-image, no write).
- **Feature-owns-its-bugs still binds (§19v).** A failure caused by *this* cycle's own ship is
  sweep-#2 and revert territory, never a ticket — filing a bug in the thing you just built is a QA
  failure wearing a ticket's clothes. Only pre-existing signatures are legitimate here.

Heal tickets are `P9 - Bug Fixes` in tier `now`, live in `backlog_items` only (`source_file =
'heal-engine'`), and ride the normal queue — **the fix runs the full ceremony in a later cycle.**
Since `SES-83` (d) (`v7.0.112`) selection reads the table, so a heal ticket is pickable the moment
it is filed — it does **not** need to appear in `FEATURES.md` first, and it never will; the
snapshot export (step 7) is its git-committed copy. **`source_file='heal-engine'` must go on the
ignore-list of any future markdown→DB reconciliation**, or it will delete every heal ticket as an
orphan.

**8c. Background revalidation sweep (`SES-87` — the revalidation flow, register B7) — on spare
capacity, never instead of the build.** Query the sinking tail — age triggers, premise decides:

```sql
SELECT backlog_id, queue, left(title,80) AS title
  FROM public.backlog_items
 WHERE status NOT IN ('done','removed','removal proposed')
   AND (revalidated_at IS NULL OR revalidated_at < now() - INTERVAL '30 days')
   AND updated_at < now() - INTERVAL '30 days'
 ORDER BY queue DESC NULLS LAST
 LIMIT 3;
```

Also sweep, regardless of age, tickets whose text hits retired vocabulary (`Beta-gate`,
`Post-beta`, "FEATURES.md row", the pre-rename class digits) — a retired-vocabulary premise is
the cheapest death to detect. For each (≤3 per cycle): premise still real → `revalidated_at =
now()`, nothing else; premise dead → `status = 'removal proposed'` + briefing card with
evidence + queue recompute. **No unattended removal, ever** — `removed` is written only by
harvesting John's Accept on the card. Card harvest rules (in the step-9 tail): **Accept** →
`status='removed'`, queue recompute (terminal); **Reverse** → prior status restored,
`revalidated_at = now()` (the 30-day quiet); **Rework** → his line rewrites the description,
ticket re-queues.

**Since `SES-113` (`v7.0.158`) a removal-proposed ticket KEEPS its queue number while it waits,
so two of those three harvests changed shape** — the step-5 block carries the rule and John's
reason for it. **Reverse is now zero-motion re-entry:** the ticket already holds its earned slot,
so restoring `status` + `revalidated_at` moves nothing, where it previously had to be re-inserted
from nowhere and landed wherever the renumber happened to put it. **Accept is unchanged and still
terminal** — `removed` leaves the eligible set, so that recompute genuinely does release the
slot. The recompute at filing time still runs: it no longer strips the ticket, but it is what
settles the rest of the board around it.

**9. Write the record, then die.** (Times shown to John — briefing, notifications — are CST
(America/Chicago), labeled CST; ledger timestamps stay UTC. John, 2026-08-20.) `runner_items` row (kind, **`backlog_id` as a BARE ticket id — see the rule immediately below**,
title, value case, before → after, QA evidence with proof-type label, dev link, flag slug if
any, cost split, model, **plus the three plain-language columns `plain_cant` / `plain_after` /
`plain_worth`**).

**`backlog_id` IS A JOIN KEY AND IS NOW ENFORCED AS ONE — the display string goes in
`display_ref` (`SES-116`, `v7.0.174`, migration `ses116_backlog_id_bare_check`).** This line used
to read *"backlog ID + Type + named P-class per the Language block above"*, and **that sentence is
the root cause of the defect `SES-116` fixes**: it told every cycle to compose
`'SES-115 (Tooling · P10 - Tooling)'` and store it in a column that joins to
`backlog_items.backlog_id`, so **every card→ticket join silently returned nothing** — the help-me
ticket, the pending-on-John views, and `SES-112`'s `needs-john` backfill all mis-joined. The
Language block governs what John **reads**; it never governed a key column, and display formatting
belongs at render time only.

- **`backlog_id`** takes the bare id (`SES-116`, `CHI-84`, `AGT-015`) or **`NULL`**. It is now
  guarded by `ck_runner_items_backlog_id_bare`, a **VALID** CHECK —
  `backlog_id IS NULL OR backlog_id ~ '^[A-Z]+-[0-9]+[a-z]?$'`. A display string is **rejected at
  INSERT**, so a cycle that files a card the old way gets an error, not a silent mis-join.
  The pattern was surveyed rather than chosen: it matches **all 603** live
  `backlog_items.backlog_id` values with zero exceptions.
- **`display_ref`** takes the human reference when the card names something that is **not a board
  ticket** — a directive uuid, a governance register, an `ARCHITECTURE.md` clause, an invention
  proposal, `"no ticket yet — your Accept files one"`. Leave it `NULL` when `backlog_id` already
  carries the reference.
- **Render the id chip as `coalesce(backlog_id, display_ref)`**, never `backlog_id` alone — a
  directive card has no ticket and must still show what it is about. Contract:
  `briefing-page.md`'s regeneration step 1.

**Measured before a line changed, and the ticket under-counted it 20×:** `SES-116` says *"3 of 4
open gated cards"*; the live census was **63 of 80** non-NULL rows violating, **7 of them
undecided**. The repair moved every raw string to `display_ref` rather than nulling it (§19v — a
directive uuid was that row's only copy), which is also what let the CHECK ship **VALID** instead
of `NOT VALID`: a `NOT VALID` constraint is still enforced on UPDATE, so the 22 unrepairable
legacy rows would have become **un-updatable** — and the harvest UPDATEs `runner_items` to record
John's taps. That failure lands on a card he has just tapped, which is the one outcome this table
must never produce.

**THE PLAIN-LANGUAGE SUMMARY IS A COLUMN NOW, NOT PROSE YOU WRITE AT RENDER TIME (`v7.0.146`,
directive `dda69acb` and its twin `6b6cdd71`, John 2026-08-21T20:44Z and 20:46Z).** `v7.0.145`
made the More-info panel's three fields required — *what you can't do today* / *what you could do
after* / *why that's worth something* — but required them only **in the HTML**, passed as a
per-card JavaScript object literal written by whichever cycle happened to be rebuilding. The text
therefore had nowhere to live between rebuilds, and **register B18 could not be honoured for it**:
"build the cards FROM the DB's undecided set, never from memory" is unfollowable when the DB has
no place to put the words, so the next cycle to rebuild had to re-invent a card's wording from
scratch — for a card it did not write. Store them on the row when you FILE the card, in John's
register rather than the system's ("you can't X today", never "the affordance is absent"), and the
rebuild reads them back instead of guessing. **`NULL` is not an empty string and must not become
one:** it is what makes the page draw the red defect line, which is the deliberate `v7.0.145`
choice that a missing summary should look missing rather than look fine. Filing a card without
them is now a visible omission in the ledger, catchable before John ever sees the page —
`SELECT id FROM runner_items WHERE decision IS NULL AND plain_cant IS NULL;` should return
nothing. Same shape as `SES-86` phase 3 (John's automation queue: prose → `automation_rank`) and
for the same measured reason — a rule each cycle must remember to apply is a rule that gets
silently forgotten. Close `runner_cycles` with the two cost tracks (John, 2026-08-20):
`api_cost_dev_usd` / `api_cost_qa_usd` (true billable API calls only — trace to
`ai_activity_log` where possible; $0 is the normal value) and `est_tokens_dev` /
`est_tokens_qa` (your own session's thinking, split build-vs-QA steps — **estimated is fine,
labeled estimated; never invented**), plus outcome and push SHA. The briefing's budget cards
show the dev/QA split on both tracks, the runner's token use broken down by model, and John's
latest reading + calibration; the reading-entry card (three percentages + save) must be on
every rebuild. **The page's shape is now the LOCKED SECTION ORDER in `briefing-page.md`
(`SES-124`, `v7.0.159`) — read it there rather than re-deriving it from this paragraph.** Two
requirements this step used to carry are **struck by John's explicit removal**: the **"Next up"
top-five section** and the compact **"Next 3"** line at the page top (registers B25/B26). Their
replacement is **§8's queue matrix and §11's now-tier census, shipping in `SES-126`** — which
means that between `SES-124` and `SES-126` the page carries **no forward view of the queue at
all**. That gap is the spec's own sequencing, it is disclosed on `SES-124`'s card, and a cycle
in between must not quietly reinstate the old sections to paper over it. Still required: the
**exposure-rate line** — cards
that needed John this week vs. last (register B28) — and the **daily "help me" ticket**: the
top pending-on-John ticket by the standard ordering, its specific questions on the card,
inviting a manual session or a Rework line; resolution re-enters it at queue #1 (register B29).
**The page's open QUESTIONS now render as the yes/no question list from `runner_questions`
(`SES-99`), max 5, newest first** — this does not replace B29's ticket, which stays. A question
a cycle wants to ask John is **INSERTed into `runner_questions`** (before-image `row_data = NULL`,
the INSERT convention from step 8b) rather than written into prose on the page. **Register B18 (SES-B17, 2026-08-20): build the briefing cards FROM the database's undecided
`runner_items` set (`WHERE decision IS NULL`), never from this cycle's memory of what it
filed** — in-memory reconstruction drifts silently the moment two sessions overlap or a prior
cycle's card was Reversed after you already forgot it, so the DB is the only trustworthy
source.

**CLOSE THE DIRECTIVE WITH ONE CALL — the status and the outcome are no longer separable
(`SES-129`, `v7.0.164`, migration `ses129_directive_outcome`).** This step used to read *"mark the
directive `done`"*, and that is exactly the shape of rule this platform has now paid for six times
(`SES-86` phase 3, `v7.0.146`, `SES-101`, `SES-111`, `SES-127`, `SES-128`): a second write every
cycle must remember is a write that gets silently skipped. §7's follow-through card needs to tell
John *what became of* his line, so recording it is not optional:

```sql
SELECT * FROM public.close_directive('<your cycle id>', '<directive id>',
       '<shipped|carded|superseded>',
       '<one sentence in John''s register: shipped as SES-125, the decision cards>');
```

The call writes its own before-image (§19v), sets `status='done'` and `acted_cycle`, and **cannot
set the status without an outcome and a non-blank note** — both are raise-on-missing. It is
idempotent in the direction that matters: a directive already closed *with* an outcome comes back
`already_closed = true` and is left untouched, so a re-run can never overwrite a verdict already
on John's card. `closed_unrecorded` is rejected — it is backfill-only for the 24 rows that predate
the column, so a cycle can never label its own work "unrecorded". A `done` row with a NULL outcome
renders **red** on §7, which is what that combination now means: the function was bypassed.

Rebuild the briefing page
per `docs/runbooks/briefing-page.md` (harvest before rebuild; republish to the same URL;
**never shell-process the WebFetch result's saved file — `~/.claude/projects/…/tool-results/`
is a permission-gated path, the same gate as step 0's `.claude/` rule; parse `briefing-state`
in context and rebuild from the template + `runner_` tables — `SES-96`, John's captured
prompt, 2026-08-21**).
*(Supervised run: if republish is unavailable from cloud, log it — the design session rebuilds
manually.)*

**THE SERIAL TAIL (register B42) — the only moment of the cycle that is one-at-a-time.** In
order: **(1)** take the publish lease (step 0's 10-minute-TTL claim; 0 rows → wait ~30s and
retry, never skip); **(2)** re-fetch the live page and re-parse `briefing-state` — the
self-healing step: another cycle may have republished while you built, and publishing from a
pre-lease harvest is exactly the "about to overwrite another session" moment John's ruling
requires you to notice and absorb; **(3)** write the harvested decisions idempotently
(`… AND decision IS NULL`; ladder moves only from rows you actually flipped, `shipped` cards
only), store any reading/directive rows, and store any `asks` (`v7.0.145` — idempotent on
`uniq_card_ask`) **and any `unblocks` (`SES-127`, `v7.0.162`)** **and any `settings` (`SES-143`,
`v7.0.182` — see the block below)**; **(4)** re-export the backlog snapshot now that the harvest writes have
landed — the fix for the one-harvest staleness `SES-109` found (`v7.0.149`). Re-run step 7's
`scripts/export-backlog-snapshot.js`; the script is deterministic and prints `unchanged`,
writing nothing, when John's taps moved no board row — the common case, and then there is
nothing to push, so skip to (5). Only when it produced a diff do you commit
`docs/backlog/BACKLOG-SNAPSHOT.md` and push it (`git fetch origin dev && git rebase origin/dev &&
git push origin HEAD:dev`, the rebase-retry×3 of step 7). **This is the one sanctioned second
push of a cycle** — snapshot-only, inside the serial tail, guarded by the publish lease you
already hold (NOT the ticket claim, which step 7 released in its own statement after the push —
`SES-106`, `v7.0.150`), and it fires
only on cycles that actually changed the board, so the "one push per ship point" spirit holds. A
rebase conflict that survives the retries is not a wall: leave the snapshot one harvest stale
exactly as before this fix — the next cycle's step-7 export captures the same writes — and note
it in the cycle row; **(5)** rebuild cards from the DB's undecided set — **each with its More-info
panel, and each open `runner_card_asks` row answered on its own card** (`v7.0.145`; a card
rendered without those fields carries a visible defect line, by design) — and republish; **(5b)
stamp `briefed_at` on the §10 skip rows you just rendered, and ONLY after the republish returns**
(`SES-127`): `UPDATE public.runner_skips SET briefed_at = now() WHERE briefed_at IS NULL AND
resolved_at IS NULL;` — `briefed_at IS NULL` *is* the NEW chip, so stamping before the publish
lands silently eats the chip on rows John never saw, and stamping after means the worst case is
one extra night marked new; **(6)** close your `runner_cycles` row; **(7)** release the publish lease
(holder-guarded statement in step 1); **(8)** continue the drain **in-session**, if and only if
both gates below pass — otherwise end the session cleanly. The tail should take
seconds to low minutes — everything long-running happened before it, in parallel.

**(8) A DRAINING CYCLE CONTINUES THE DRAIN IN-SESSION — TWO GATES, BOTH REQUIRED (`SES-139`,
`v7.0.176`; actuator replaced by `SES-141` `v7.0.180`, replaced again and FINAL by `SES-140`
`v7.0.195` — the platform refuses session-spawning, so the chain runs inside the session).**
Root-caused 2026-08-23 from John's *"find root cause why automation is stalling"*:
`SES-111` changed what a cycle **picks** and nothing anywhere fired the **next** one. `ARCHITECTURE.md`
§19v's *Operations* paragraph specifies the model (successive one-ticket cycles, 24×7), and John
ordered the working form directly (in chat, 2026-08-23, `successional-review` session, replacing
his `SES-141` ruling): **one ticket per CYCLE ROW stays the law; a session runs successive cycles
while a drain stands.** Run this **after (6) and (7)** — never before your row is
closed and the lease released:

| Gate | Test | Fail |
|---|---|---|
| **A — you actually ran a cycle** | your own `outcome` ∈ `shipped` / `gated_before_build` / `reverted` | fire nothing |
| **B — a standing drain still has claimable work** | `SELECT * FROM public.drain_epic_next('<your cycle id>')` → `outcome = 'pick'` | fire nothing |

Both pass → **do not end the session. Open your continuation cycle and re-enter the runbook:**

1. **INSERT a new `runner_cycles` row** — your same stamp echoed, `trigger` =
   `chained (drain continuation)`, fresh id. That row IS the chain: its existence is the evidence
   `SES-140` waited 94 spawn-era cycles to observe.
2. Note `CONTINUED IN-SESSION AS CYCLE <new id>` in the row you just closed at (6).
3. **Re-enter at step 1** with the new cycle id and run every step exactly as a fresh cycle
   would — step 1b (`chained (drain continuation)` is exempt from pacing, by spec), **step 3's
   walls re-checked in full** (this is what bounds the loop — a wall-stop closes the continuation
   cycle `did_not_run` and, per Gate A, ends the chain), selection at step 5 (the drain pick,
   the atomic claim, all of it), build, QA, ship, and this tail again. One ticket per cycle row,
   full ceremony per cycle — the second iteration earns no shortcut.
4. **The chain ends where a fresh cycle would end:** Gate A fails (wall-stop, `failed`,
   `gated_before_build`), Gate B fails (drain retired, or every remaining named member is
   flagged or claimed), or the platform ends the session itself — and nothing is lost on that
   last one: an open claim expires in 24h and the next scheduled fire resumes the drain. A
   continuation that fails to open is a **note, never a wall**: the cron remains the fallback
   engine.

**THE SESSION-SPAWNING ACTUATORS ARE RETIRED, AND THE EVIDENCE IS WHY — do not rebuild them.**
Three actuators tried to launch the next *session* from inside a cycle; all three are dead ends,
measured live on 2026-08-23, not reasoned: **`fire_trigger`** — refused, *"this routine was
created via http_api, not by an agent"* (`SES-140`'s original finding). **`create_session`** —
refused **three times across two parents**, identical message (*"the parent session's permission
mode is not yet available"*), including once with `permission_mode` passed explicitly, 25 minutes
into the parent (cycles `72561db3` ×2, `03c19332`). **One-shot `create_trigger`** (the `v7.0.190`
rung 2) — actually fired at `15:11:36Z` (`trig_015wHzkN7kiEBTdChhYaFVua`) and the launched
session came up without the git source or a usable tool list (`create_trigger` exposes no
`sources` / `allowed_tools` parameters) and **never wrote a row** — a silent dead spawn, worse
than the loud refusal. Anthropic's Claude Code documentation (read 2026-08-23, attended session
`successional-review`) confirms session-spawning is not a supported pattern; the supported
pattern for *"work a queue until it is empty"* is one session that keeps working inside itself,
restarted by the schedule. Which is exactly this step.

**GATE A IS THE ENTIRE SAFETY OF THIS STEP. Do not drop it.** The
ticket's bound reads *"one successor per cycle, only from a cycle that ran its tail"* — and a
wall-stop **does** run its tail (step 3, verbatim: *"A wall-stop still runs the step-9 serial tail
(its record must be written), then ends"*). Implemented exactly as filed, a cycle that stops at the
token wall opens a continuation cycle, which stops at the same wall, which opens another: an
unbounded loop of `did_not_run` rows, with nothing to break it but John noticing. **That
converts the budget wall from a brake into a metronome** — the precise inversion of what a wall is
for. Measured at this ship rather than reasoned: 03:14Z the America/Chicago day stood at
**20,851,000 estimated tokens across 27 cycles** against John's `budget_override` `43a9d4ae`
(`max_tokens` 25,000,000), **expiring 05:00Z**, after which the allowance reverts to a 10M cap the
day had already passed — so the first fire after 05:00Z wall-stops. Gate A is what makes that stop
the **end** of the chain instead of the start of the loop.

**Gate B's call is NOT a preview, and that is correct.** Read from `pg_get_functiondef` rather than
assumed: when the epic's `now` tier is empty, `drain_epic_next` **writes a `runner_before_images`
row and closes the directive** before returning `retired`. Leave it that way — the last cycle of a
drain closes the drain and fires nothing, in the place the emptiness is first observed. Do not add a
dry-run form to dodge the write.

**Pass YOUR CYCLE ID: the parameter is a stamp, not a selector.** The function ignores its argument
when choosing the drain (it reads the single oldest queued `drain-epic` row regardless) and uses it
**only** to stamp that retirement before-image — so a wrong uuid succeeds silently and is correct on
every path *except* retirement, where it attributes the before-image to a cycle that never existed.
Recorded because this cycle did it: step 5's call was made with the **epic** id, returned a correct
`pick`, and wrote nothing. This step adds a second call site on the one path where that mistake
costs something.

**What does NOT self-terminate — read this before quoting the ticket's bound (3) to John. REWRITTEN
`SES-142`, `v7.0.179`, because half of it has been fixed and the other half has not.** The claim
*"the chain self-terminates; the drain retires at `open_now = 0`"* was false for two independent
reasons. **The first is now fixed:** `open_now` was computed over the epic's **live** `now` tier,
which the runner's own filings extended faster than it drained, so the target receded — that is
`SES-142`, and `open_now` is now the count of John's **named** members still open, a set no cycle
can add to. `SES-110`, named in the previous version of this paragraph, is `status = 'done'` as of
this cycle's live read and is no longer a blocker either. **The second is unchanged and still
holds:** `drain_epic_next`'s pick predicate reads `queue` and claims, **never `design_status`** — so
a `needs-desktop`, `needs-john` or `john-paced` member still comes back as a `pick`, gets skipped
procedurally at step 5 (`SES-114`; `john-paced` records no skip row — `SES-166`), and the cycle
falls through to the board and builds normally. So the chain terminates on the named list in
principle, keeps running on real board work in practice, and is bounded by **Gate A plus the token
wall**. Said plainly for John: when every remaining named member is flagged `needs-john` /
`needs-desktop` / `john-paced`, the drain's finish line is on his briefing page, not in any
cycle's hands — no cadence mechanism changes that.

**Untouched, and not negotiable:** drain **creation** stays John-only (`drain_epic_next` property 5 —
*"Nothing creates a drain row but John… The runner may read one; it may never write one"*). This step
continues a drain he wrote; it can never start one. Fleet size stays stable rather than exponential —
at most one continuation cycle at a time per session means N concurrent sessions stay N, and the
cron adds workers on John's clock grid without multiplying them.

## Standing prohibitions (§19v — no step overrides these)

Never: touch the gated lane (terminology, LOCKED sections, schema-destructive migrations,
§19e-owned writes, active-agent Skill/Capability edits, the four harness files, dev→main);
write Supabase without a before-image; report a number that doesn't trace to a row or log;
retry the same tier twice; push more than once per ship point (the step-9 tail's snapshot-only
re-export push, `SES-109`/`v7.0.149`, is the single sanctioned exception — conditional on the
harvest having moved the board, guarded by the publish lease); proceed past a failed wall;
build a ticket without holding its claim (register B42 — the per-resource successor to B31's
retired cycle lease); enter the serial tail without the publish lease, republish from a
pre-lease harvest, or end a cycle without running the tail — and **never push or claim a
counter without re-asserting the ticket claim first** (`v7.0.123`'s lesson, directive
`c4d95dc7`, retargeted by B42: the coordination token must be re-proven before every
irreversible act, whatever the token is); **continue the drain from a cycle that did not run one**
(`SES-139` tail step (8), Gate A — a wall-stop, an abort or a `failed` close continues **nothing**,
or the budget wall becomes a metronome), **open more than one continuation cycle at a time**,
**spawn or attempt to spawn another session** (`SES-140`, `v7.0.195` — every session-spawning
actuator is platform-refused or boots dead; the chain runs in-session only), or **create a drain row** (only John
does that — `drain_epic_next` property 5); **skip the step-1b settings gate, or carry on past a
non-`run` verdict** (`SES-143` — the panel is John's switch on his own runner, and a cycle that
runs anyway has taken it back).
