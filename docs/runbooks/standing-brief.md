<!-- DeepBench v7.0.236 | runbooks/standing-brief.md | SES-177 (b) — THE DERIVABLE HALF OF THIS FILE IS
     NOW A GENERATED BLOCK, and the judgment paragraph below it is untouched. Part (a) (v7.0.228, the
     stamp beneath this one) named this remainder and REFUSED it, correctly: extracting the census /
     drain state / scheduler settings back OUT of that paragraph is a surgical edit on prose that
     interleaves them with judgment. That refusal stands. This ship does not extract anything — it
     renders the live facts into a marked block ABOVE the paragraph.
     WHY IT COULD NOT WAIT, measured live 2026-08-24T23:2xZ rather than argued: every derivable number
     in the paragraph had drifted — open 561 -> 581, numbered 561 -> 591, rows 611 -> 670, designed
     16 -> 15, needs-desktop 0 -> 2, needs-john 1 -> 9, NULL 546 -> 549, drain 11-of-18 -> 3-of-10 —
     and ONE of them was not merely stale but operationally wrong: the paragraph says the scheduler
     runs every 3 hours (12/3/6/9 on John's clock) and runner_settings.interval_hours had been 1 since
     22:03Z that day. Every session reads that sentence at start, so a quiet night read from it is read
     from a false premise. A hand-maintained second home for a table's fact is the exact defect class
     SES-177 was filed against, reproduced inside the file part (a) created.
     THE GUARANTEE AN EDITOR MUST NOT WEAKEN: scripts/render-standing-brief.js may only change bytes
     BETWEEN the two markers, and it asserts that rather than intending it — it splices, then compares
     head and tail byte-for-byte with what it read and exits 2 writing nothing on any difference. It
     also refuses before any network call if the "**Next session:**" sentinel is gone. The v7.0.197
     briefing wipe (a rebuild from a source not covering the whole file, publishing a skeleton over
     real content) is therefore unreachable here, not merely guarded against.
     NO TIMESTAMP IN THE BLOCK, following export-backlog-snapshot.js rather than inventing a second
     convention: provenance is a payload sha256, so a ship that moved no board fact rewrites nothing
     and --check stays meaningful. Guarded by tests/regression/SES-177b-standing-brief-block.js. -->
<!-- DeepBench v7.0.228 | runbooks/standing-brief.md | SES-177 — THE STANDING BRIEF, split out of
     CLAUDE-STATE.md on John's decision (gated card 37b22393, Accept, 2026-08-24): "derivable facts are
     generated from tables; the standing 'Next session' JUDGMENT PROSE moves VERBATIM to the new
     docs/runbooks/standing-brief.md, and the generated CLAUDE-STATE.md links to it. Nothing is dropped
     and nothing is hand-copied."
     WHY THIS FILE EXISTS RATHER THAN A RENDERER SECTION, and it is the whole reason the ticket was gated
     before it was built: this prose was 7,715 of CLAUDE-STATE.md's 14,489 chars — 53% of the file — and
     NO TABLE HOLDS IT. A renderer built to the ticket's original letter would have regenerated from
     sources covering 43% and destroyed the rest, which is the v7.0.197 briefing failure exactly (a
     rebuild from an incomplete source published the skeleton and wiped what was not in it).
     THE BLOCK BELOW WAS MOVED BYTE-FOR-BYTE. It is not a summary, not a rewrite, and must not be
     "tidied" into one. Its sha256 at the move is recorded in docs/SESSIONS.md under this version, and
     tests/regression/SES-177-claude-state-renderer.js fails if CLAUDE-STATE.md ever loses its link to
     this file — the fail-closed condition John asked for in the same sentence. -->

# DeepBench — Standing Brief

> Read this at session start, alongside `CLAUDE-STATE.md`. That file now carries only what is derived
> from tables (current version, prior version, the last three sessions). Everything below is standing
> judgment context — board census, drain state, automation-lane rules, scheduler settings and the
> standing filing rules — and is maintained by hand, deliberately.

<!-- BEGIN GENERATED — scripts/render-standing-brief.js — do not hand-edit inside this block -->
## Live board state — generated, do not hand-edit — *as of 2026-09-15 23:10Z (Sep 15, 6:10 PM CST)*

> Rendered from the tables by `scripts/render-standing-brief.js` at every ship. **Every number below is derived; nothing here is maintained by hand.** The judgment prose beneath this block is the opposite — hand-maintained, deliberately, and this script never writes outside these markers. Where the two disagree about a number, this block is right and the sentence below is stale: say so rather than reconciling them by hand.

**Board census** — *as of 2026-09-15 23:10Z (Sep 15, 6:10 PM CST).* **640 open tickets**, 631 numbered, **9 open-but-unnumbered**, 914 rows total.

| `status` | rows | share of board |
|---|---:|---:|
| `open` | 552 | 60.4% |
| `done` | 262 | 28.7% |
| `partial` | 48 | 5.3% |
| `removal proposed` | 27 | 3% |
| `delivered` | 13 | 1.4% |
| `removed` | 12 | 1.3% |

**`design_status` among OPEN tickets** — *as of 2026-09-15 23:10Z (Sep 15, 6:10 PM CST).* Reads for selection (`SES-114`); `NULL` is *not* `auto`, it is not-yet-triaged and no cycle may backfill it.

| `design_status` | open rows | selection effect |
|---|---:|---|
| `NULL` | 564 | full ceremony — not yet triaged |
| `needs-decision` | 44 | — |
| `designed` | 24 | **not a skip** — build from `kickoff_link` (step 6 fast path) |
| `needs-desktop` | 7 | skipped, `record_skip()` — needs a session John attends (B39) |
| `auto` | 1 | full ceremony |

**Scheduler and automation settings** — *as of 2026-09-15 23:10Z (Sep 15, 6:10 PM CST).* §2b of the briefing, John's own switches, binding via `scheduler_gate()` at step 1b:

- Scheduler: **on**, every **1 hour** on John's clock grid (America/Chicago hours divisible by the interval — `SES-151`, DST-proof).
- Cron minute **40**, manual-fire tolerance **±10 min** (a start outside it is treated as a manual fire and is never paced).
- Standing daily max: **196M tokens**. This is rung 3 of five, **below** the 48h stale floor: a standing number must not defeat the staleness brake.

**Standing epic drain** — *as of 2026-09-15 23:10Z (Sep 15, 6:10 PM CST).* Created only by John; the runner may read one, never write one (`drain_epic_next()` property 5). The finish line is drawn from the members he **named** (`runner_drain_scope`), never the live `now` tier (`SES-142`) — and within that list it is the members a milestone **gate ruled required** (`milestone_required`, `SES-310`) whenever the list carries such a ruling, every named member otherwise.

- **No drain standing.** Selection is the class-sorted board exactly as it is with no drain declared.

**Open decisions** — *as of 2026-09-15 23:10Z (Sep 15, 6:10 PM CST).* Decisions made under `M6-02` that are still inside their reversal window (`runner_settings.reversal_window_hours` = 72h). Silence finalises them; to reverse one, run the line beside it (`docs/runbooks/session-setup.md` § Reversing a decision).

- `736f6bfc` · ship · `AGT-70` · AGT-70 shipped at v7.0.467 (c236e7829160dedbdfa6963d09f5412a3c8f624c) on verdict 015bf5d7-81b8-4afc-954c-94172d2804ba · finalises Sep 15, 5:55 PM CST · `select public.reverse_decision('736f6bfc-1c5a-4b6c-bd4b-8ec64d680fed','John','<why>');`
- `f8e2c5db` · rollback · — · Auto-rollback held: ci-red on f330acc was not reverted (card-only) · finalises Sep 15, 6:08 PM CST · `select public.reverse_decision('f8e2c5db-c719-4a90-84f0-e65172743228','John','<why>');`
- `96804178` · ticket-status · `SES-381` · Filed SES-381: dev CI is red because CLAUDE-STATE.md cannot satisfy both halves of its own guard at once — stale fails… · finalises Sep 15, 6:10 PM CST · `select public.reverse_decision('96804178-a3ca-435b-b2ce-33183011c876','John','<why>');`
- `87805ede` · ticket-scope · `SES-381` · Picked SES-381 ahead of the queue's first row (SES-344) under step 4's blocker rule: dev CI is red on a clause that mak… · finalises Sep 15, 6:16 PM CST · `select public.reverse_decision('87805ede-6752-4562-a42d-0a53336f9940','John','<why>');`
- `257714bd` · ship · `SES-381` · SES-381 shipped at v7.0.470 (24d6ae1a89b14e822c655634ee419ff50af76865) on verdict 20d4803f-81ac-4613-b325-9fef23c008ac · finalises Sep 15, 6:53 PM CST · `select public.reverse_decision('257714bd-6ddc-4362-93d5-8dd4d78479a5','John','<why>');`
- `bb559085` · ticket-status · `SES-382` · Filed SES-382: the regression suite shares one live database across parallel cycles, so a fixture-row control premise f… · finalises Sep 15, 7:02 PM CST · `select public.reverse_decision('bb559085-9ed0-4c9e-9c55-0cd7e9a5ff8b','John','<why>');`
- `769dcfd5` · ship · `AGT-70` · AGT-70 shipped at v7.0.469 (a66cf335dbbe50f7d0dfc94061119cdab15f8101) on verdict 8862f53f-7d31-4209-83fb-2ec17a73a95c · finalises Sep 15, 7:05 PM CST · `select public.reverse_decision('769dcfd5-e39e-4e2e-b029-17abc98f143a','John','<why>');`
- `98bf412f` · ticket-status · `AGT-70` · AGT-70 — The Auditor: defer the partial remainder; all four build slices have shipped and every remaining item is John'… · finalises Sep 15, 7:47 PM CST · `select public.reverse_decision('98bf412f-216c-4cee-883e-d12d24ab98be','John','<why>');`
- `e228c7ee` · rollback · — · Auto-rollback held: ci-red on 8d8a23a was not reverted (card-only) · finalises Sep 15, 7:54 PM CST · `select public.reverse_decision('e228c7ee-9c8b-410d-bf8f-f72a88e5a006','John','<why>');`
- `4aa5d63f` · ticket-status · `SES-383` · Filed SES-383: agent-log.js prices SUBSCRIPTION tokens as API dollars, so today's audit reads $58.06 where the real bil… · finalises Sep 15, 8:31 PM CST · `select public.reverse_decision('4aa5d63f-94b1-47e1-99e7-af85aaeb3d14','John','<why>');`
- `27224cba` · rollback · — · Auto-rollback held: ci-red on 05f1655 was not reverted (card-only) · finalises Sep 15, 8:31 PM CST · `select public.reverse_decision('27224cba-e603-433c-a9da-2b7110357d44','John','<why>');`
- `13466c51` · classification · `AGT-79` · AGT-79 classed P10 - Tooling, serves P1 - Improves John's Skills · finalises Sep 15, 8:40 PM CST · `select public.reverse_decision('13466c51-bec7-4c47-89e9-b0488084195f','John','<why>');`
- `49da79ad` · ticket-scope · `SES-383` · Corrected SES-383 in place: the $2.27 of script-source spend was this cycle's own proof run, not a peer's, so the "near… · finalises Sep 15, 8:41 PM CST · `select public.reverse_decision('49da79ad-d021-4300-aadf-30fcd39e0ec6','John','<why>');`
- `1dc648dd` · directive · `SES-384` · File SES-384: every new public table is born readable by anon, which contradicts the rule file that says default privil… · finalises Sep 15, 9:30 PM CST · `select public.reverse_decision('1dc648dd-bf0c-46f3-a6df-4f905716bdc3','John','<why>');`
- `875a4da0` · rollback · — · Auto-rollback held: ci-red on b70ebad was not reverted (card-only) · finalises Sep 15, 9:37 PM CST · `select public.reverse_decision('875a4da0-a9dc-4c93-97f1-85137fc493e1','John','<why>');`
- `b8204c1d` · ticket-scope · `AGT-79` · Clear AGT-79 design_status: its kickoff is spent, so the fast path would send a builder at a design that is already bui… · finalises Sep 15, 9:42 PM CST · `select public.reverse_decision('b8204c1d-ae88-428d-ac5f-9b964d39c53f','John','<why>');`
- `77afdcbc` · hygiene · `AGT-79` · Ticket Owner: 40 derivable cell fix(es) on 40 row(s) — cost 37 · claim 1 · type 2 · finalises Sep 15, 10:31 PM CST · `select public.reverse_decision('77afdcbc-32dc-4505-bfda-724acc1f8b07','John','<why>');`
- `adfe1b4a` · directive · `SES-386` · File SES-386: three regression guards grade LIVE BOARD state, so every verdict the runner produced tonight was a block… · finalises Sep 15, 10:49 PM CST · `select public.reverse_decision('adfe1b4a-302b-4496-8dd1-bd8c1606c5a0','John','<why>');`
- `ffac0e54` · rollback · — · Auto-rollback held: ci-red on 80d28c8 was not reverted (card-only) · finalises Sep 15, 10:51 PM CST · `select public.reverse_decision('ffac0e54-fa05-45d9-87f1-dfec1fa6cd0d','John','<why>');`
- `75935390` · ticket-scope · `AGT-79` · Clear AGT-79 design_status again: the slice-2 kickoff is spent, so the fast path would hand a Builder a contract with n… · finalises Sep 15, 10:54 PM CST · `select public.reverse_decision('75935390-9eeb-45b2-8fbf-75383b722e7f','John','<why>');`
- `de5ca607` · gate · `SES-344` · SES-344 slice 3 is built and green on its own evidence but was NOT pushed to dev: the regression suite is red on failur… · finalises Sep 15, 11:35 PM CST · `select public.reverse_decision('de5ca607-c0c5-4f36-9e47-27b436e29dcf','John','<why>');`
- `439e1e1d` · rollback · — · Auto-rollback held: ci-red on b9d5a05 was not reverted (card-only) · finalises Sep 15, 11:43 PM CST · `select public.reverse_decision('439e1e1d-6d38-449e-9fcc-b676cba57084','John','<why>');`
- `a0029f68` · hygiene · `SES-344` · Clear SES-344 design_status: the v7.0.476 kickoff is spent — every one of its six tasks landed on dev at 948dced4. · finalises Sep 16, 12:02 AM CST · `select public.reverse_decision('a0029f68-0100-4494-8198-50df70944f38','John','<why>');`
- `26cf84f8` · rollback · — · Auto-rollback held: ci-red on 948dced was not reverted (card-only) · finalises Sep 16, 12:04 AM CST · `select public.reverse_decision('26cf84f8-713d-48bd-bc2b-41ba2c8542a0','John','<why>');`
- `084e8f52` · learning · `SES-159` · class-loop learning claims for P3 - Investor Value · finalises Sep 16, 12:09 AM CST · `select public.reverse_decision('084e8f52-c1bc-4d34-bd4e-38a7492b19c0','John','<why>');`
- `bf3b98e7` · classification · — · board ordered: 2 ticket(s) given an automation_rank · finalises Sep 16, 12:11 AM CST · `select public.reverse_decision('bf3b98e7-aa16-41db-bb77-a74ed7b80e86','John','<why>');`
- `33e81841` · hygiene · `AGT-79` · Clear AGT-79 design_status: the v7.0.477 kickoff is spent — all nine of its files and eight tasks shipped at b9d5a050. · finalises Sep 16, 12:12 AM CST · `select public.reverse_decision('33e81841-084b-419f-8b4d-182085c46d31','John','<why>');`
- `20d03633` · gate · `AGT-79` · AGT-79 gated before build: the remainder's live run needs a roster row only John may create, and this cycle declines to… · finalises Sep 16, 12:12 AM CST · `select public.reverse_decision('20d03633-f9e4-48e6-a89e-c8baa79e706f','John','<why>');`
- `aa0eb223` · filing · `SES-387` · File SES-387: class_understanding_due() keys its once-a-day gate on the cycle's START day, so a chain that crosses midn… · finalises Sep 16, 12:17 AM CST · `select public.reverse_decision('aa0eb223-2ad4-46f5-aca5-5e5454f6b3c2','John','<why>');`
- `fdd25904` · ticket-scope · `AGT-79` · AGT-79 is designed for v7.0.480 as the CODE half of the Ticket Owner judgment pass only; kickoff_link and design_status… · finalises Sep 16, 2:06 AM CST · `select public.reverse_decision('fdd25904-e694-450d-8124-dab05a5bcaed','John','<why>');`
- `9bcfe35e` · rule · `AGT-79` · ai_activity_log 43696 tokens corrected from my pre-result estimate (195,000) to the harness-measured total for the Desi… · finalises Sep 16, 2:10 AM CST · `select public.reverse_decision('9bcfe35e-2dcf-4a95-8160-891104c99f86','John','<why>');`
- `e100d5a4` · rollback · — · Auto-rollback held: ci-red on b11ead3 was not reverted (card-only) · finalises Sep 16, 2:53 AM CST · `select public.reverse_decision('e100d5a4-ef6c-4323-af00-d670a9ae3ab5','John','<why>');`
- `f98ebb28` · ticket-status · `AGT-79` · AGT-79 stays partial and re-pickable; design_status cleared to NULL now that the v7.0.480 kickoff is spent, kickoff_lin… · finalises Sep 16, 2:54 AM CST · `select public.reverse_decision('f98ebb28-79cd-4fbc-bb0b-6e3df39a2fbf','John','<why>');`
- `8c167ca5` · gate · `AGT-79` · AGT-79 — The Ticket Owner agent is flagged needs-desktop: its whole remainder is the seed only John may apply. · finalises Sep 16, 4:46 AM CST · `select public.reverse_decision('8c167ca5-84be-416a-9759-91219298aad0','John','<why>');`
- `b69ec7db` · rollback · — · Auto-rollback held: ci-red on a315f84 was not reverted (card-only) · finalises Sep 16, 5:46 AM CST · `select public.reverse_decision('b69ec7db-90b6-46c6-9f2a-2c2f1c83f9ef','John','<why>');`
- `0e90173d` · directive · `AGT-70` · Two duplicate AGT-70 gated cards (bd54b947, 5c2dc87b) retired as repeats of card 3a0cf412; the ask itself (apply docs/d… · finalises Sep 16, 11:17 AM CST · `select public.reverse_decision('0e90173d-a017-478d-847a-903066df8717','John','<why>');`
- `0694dad6` · directive · — · Five defects filed from the first chained night (2026-09-12 13:40 CT fire to 2026-09-13 05:50 CT, 21 ships v7.0.461-481… · finalises Sep 16, 11:18 AM CST · `select public.reverse_decision('0694dad6-2297-4405-8769-7caff7de2e4f','John','<why>');`
- `d68a4d22` · directive · `SES-388` · SES-388 filed needs-decision on John's word ("the meter relies on my computer being on. we need to be able to update th… · finalises Sep 16, 11:36 AM CST · `select public.reverse_decision('d68a4d22-f44a-49a6-a7f5-4dc803bce391','John','<why>');`
- `06bfe989` · classification · — · board ordered: 6 ticket(s) given an automation_rank · finalises Sep 17, 1:46 AM CST · `select public.reverse_decision('06bfe989-7e57-4205-927c-7c12c00672b5','John','<why>');`
- `408f67ba` · rollback · — · Auto-rollback held: ci-red on 54ce2e1 was not reverted (card-only) · finalises Sep 17, 2:33 AM CST · `select public.reverse_decision('408f67ba-b02f-46c8-9e9f-528bf6a94b94','John','<why>');`
- `59446328` · learning · `SES-159` · class-loop learning claims for P2 - Inventive · finalises Sep 17, 2:40 AM CST · `select public.reverse_decision('59446328-187b-4ccd-9b85-83416acd7d8e','John','<why>');`
- `3e4d269e` · synthesis · `SES-159` · class synthesis for P2 - Inventive · finalises Sep 17, 2:41 AM CST · `select public.reverse_decision('3e4d269e-3a25-4c03-8c79-e2161f8f75b3','John','<why>');`
- `06c30f38` · directive · `SES-378` · JOHN'S REQUIREMENT 2026-09-14, verbatim: "i need the dev manager to do this work, not me in the future" — the unwinding… · finalises Sep 17, 10:12 AM CST · `select public.reverse_decision('06c30f38-e068-4642-b881-c8ce75fbd520','John','<why>');`
- `c79287b9` · directive · `SES-390` · SES-390 pinned to queue position 1: Fable reads 89% of its weekly cap at 10:03 CT 2026-09-14 and the gate cannot see it… · finalises Sep 17, 10:12 AM CST · `select public.reverse_decision('c79287b9-ad6d-4484-8d46-36f74c1661e3','John','<why>');`
- `7b6542d3` · directive · `SES-388` · SES-388 attended build on John's word ("build it", 2026-09-14): the meter is read from the rate-limit headers of two on… · finalises Sep 17, 10:56 AM CST · `select public.reverse_decision('7b6542d3-460b-4196-953e-9735f9c71be1','John','<why>');`
- `20a06cf3` · directive · — · JOHN'S RULING 2026-09-14, verbatim: "If we agree on an agent ticket ahead of the build, go ahead and create without my… · finalises Sep 17, 11:04 AM CST · `select public.reverse_decision('20a06cf3-6e0f-4ea0-9fd3-956bd7942fba','John','<why>');`
- `a5e709ea` · directive · `AGT-70` · AGT-70 The Auditor created: docs/design/agt-70-auditor-seed.sql applied verbatim (1 agents row GV-07 The Auditor, 2 cap… · finalises Sep 17, 11:06 AM CST · `select public.reverse_decision('a5e709ea-163a-41fb-8991-457ec02117f8','John','<why>');`
- `708b93e2` · directive · `SES-395` · JOHN'S RULING 2026-09-14, verbatim: "The self governance meter should also see if Fable is past its daily limit, drop d… · finalises Sep 17, 11:07 AM CST · `select public.reverse_decision('708b93e2-3125-4837-9d4d-6e69797cb0d0','John','<why>');`
- `3016b78a` · directive · `AGT-79` · AGT-79 The Ticket Owner created: docs/design/agt-79-ticket-owner-seed.sql applied verbatim (1 agents row GV-08 The Tick… · finalises Sep 17, 11:08 AM CST · `select public.reverse_decision('3016b78a-1b6a-4e96-96e3-79eb777830fb','John','<why>');`
- `6c5237c1` · directive · `AGT-70` · Gated cards 3a0cf412 (AGT-70) and 1f248380 (AGT-79) retired: the asks they carried (apply the two seeds) were performed… · finalises Sep 17, 11:08 AM CST · `select public.reverse_decision('6c5237c1-29a4-4279-ab00-095d6381bdad','John','<why>');`
- `03010ea2` · directive · — · The runner's six discovered filings get their scope rationale and served class (SES-379, SES-382, SES-383 admitted; SES… · finalises Sep 17, 11:08 AM CST · `select public.reverse_decision('03010ea2-3a5f-4327-bd30-3be138339560','John','<why>');`
- `62e3eaeb` · directive · — · JOHN'S ACCEPT 2026-09-14 ("yes to all"): every delivered ticket in project Moat Support is accepted — status done, its… · finalises Sep 17, 11:13 AM CST · `select public.reverse_decision('62e3eaeb-62f6-453e-95ee-3170658c2788','John','<why>');`
- `00c4a22f` · directive · — · JOHN 2026-09-14: SES-361, SES-369 and LOG-150 deferred — not required to complete project Moat Support · finalises Sep 17, 11:23 AM CST · `select public.reverse_decision('00c4a22f-fb67-4ef6-99a9-013791e448e6','John','<why>');`
- `63dddd80` · directive · — · JOHN 2026-09-14 ("I agree to your list, and move SES-383 back over"): the Moat Support completion set is SES-378, AGT-7… · finalises Sep 17, 11:32 AM CST · `select public.reverse_decision('63dddd80-2683-4d72-ac00-494522f24bf7','John','<why>');`
- `9bb1d581` · directive · — · JOHN 2026-09-14 ("file them and include in the current list of must complete's for moat support"): SES-396 environment-… · finalises Sep 17, 11:49 AM CST · `select public.reverse_decision('9bb1d581-3045-4aa3-b9c4-623582204939','John','<why>');`
- `373c63ec` · directive · `SES-344` · SES-344 spend-override ask (card 482802e9) PARKED by John 2026-09-14 ("let's save this for later review"): the three op… · finalises Sep 17, 11:50 AM CST · `select public.reverse_decision('373c63ec-2def-4aca-b70f-a7b51ee68056','John','<why>');`
- `f865fe1d` · directive · `SES-386` · JOHN 2026-09-14 ("home it"): SES-386 joins project Moat Support (epic Moat Support - Governance to Build the Moat) and… · finalises Sep 17, 11:55 AM CST · `select public.reverse_decision('f865fe1d-1032-44a3-afbe-67048498c332','John','<why>');`
- `fd39d118` · hygiene · `AGT-79` · Ticket Owner: 3 derivable cell fix(es) on 3 row(s) — cost 3 · claim 0 · type 0 · finalises Sep 18, 4:44 AM CST · `select public.reverse_decision('fd39d118-f6ff-4249-b234-cbf312dfca14','John','<why>');`
- `638393b5` · classification · — · board ordered: 7 ticket(s) given an automation_rank · finalises Sep 18, 4:45 AM CST · `select public.reverse_decision('638393b5-d120-4798-b0f7-536f6ec29ab5','John','<why>');`
- `64ad2720` · ship · `SES-386` · SES-386 shipped at v7.0.487 (27f4f72cbff882730fa28bf273085ea242d00ed4) on verdict c25d3681-42cc-4047-b122-f7b65fce2b7e · finalises Sep 18, 5:46 AM CST · `select public.reverse_decision('64ad2720-4ff8-40e5-af88-2cceddc8f361','John','<why>');`
- `f5e81a21` · rollback · — · Auto-rollback held: ci-red on 27f4f72 was not reverted (card-only) · finalises Sep 18, 5:47 AM CST · `select public.reverse_decision('f5e81a21-c6d5-48eb-8f48-414040e2d362','John','<why>');`
- `47cfb4c7` · learning · `SES-159` · class-loop learning claims for P3 - Investor Value · finalises Sep 18, 5:53 AM CST · `select public.reverse_decision('47cfb4c7-a8e8-4536-95de-dff7d36dd9e5','John','<why>');`
- `20bdfa0d` · directive · `SES-378` · JOHN 2026-09-15, verbatim: "ses-378 is good to go." SES-378 (the Development Manager takes the pick) is cleared to buil… · finalises Sep 18, 10:38 AM CST · `select public.reverse_decision('20bdfa0d-c805-4861-9e13-a03feab9cafc','John','<why>');`
- `38a1c566` · directive · `SES-394` · JOHN 2026-09-15, verbatim: "you don't need my permission for tickets to change guardrails if we have already discussed.… · finalises Sep 18, 10:38 AM CST · `select public.reverse_decision('38a1c566-b207-46ab-bfb2-94c7301e098d','John','<why>');`
- `9880a183` · rollback · — · Auto-rollback held: ci-red on 6b8c9a7 was not reverted (card-only) · finalises Sep 18, 11:41 AM CST · `select public.reverse_decision('9880a183-d870-400e-9a8b-8d57e1ea6599','John','<why>');`
- `5e421ee1` · ship · `SES-393` · SES-393 shipped at v7.0.490 (5ec563af7352820ee839742be74d01ca2c0ea22f) on verdict d70dc7f6-1be7-44d0-929a-90ab3a8510a7 · finalises Sep 18, 12:16 PM CST · `select public.reverse_decision('5e421ee1-01ce-4c8b-9a8e-11c6b6a32957','John','<why>');`
- `0641efc0` · rollback · — · Auto-rollback held: ci-red on 5ec563a was not reverted (card-only) · finalises Sep 18, 12:17 PM CST · `select public.reverse_decision('0641efc0-d55e-4c96-a912-ec2e41ef7117','John','<why>');`
- `c331e768` · removal · `SES-383` · Backfill: null out cost_usd on every call_source='session' row in ai_activity_log (79 rows, $339.768380 of phantom API… · finalises Sep 18, 1:06 PM CST · `select public.reverse_decision('c331e768-8e0e-424f-95b1-05a8271a76a4','John','<why>');`
- `55d5b729` · directive · `SES-394` · Filed governance rule AGENT-ROW-AGREED-TICKET: an agreed ticket's agent-row write is build work with a before-image, no… · finalises Sep 18, 1:59 PM CST · `select public.reverse_decision('55d5b729-a5bf-4a12-ae0a-f819519ccac7','John','<why>');`
- `f2618153` · directive · `AGT-80` · JOHN 2026-09-15, verbatim: "move the product team feature of Bench into production". Released as PR #10 (merge commit 0… · finalises Sep 18, 4:10 PM CST · `select public.reverse_decision('f2618153-30de-4afc-9b57-b655c8de7f20','John','<why>');`
- `eb56ce0e` · ticket-scope · `SES-401` · JOHN 2026-09-15, verbatim: "this is good, i want to go forward" (item 1 of the status walkthrough). Filed SES-401 (five… · finalises Sep 18, 4:10 PM CST · `select public.reverse_decision('eb56ce0e-1111-48a2-8f31-e2bbe98051a2','John','<why>');`
- `07c1ef4b` · ticket-scope · `SES-402` · JOHN 2026-09-15, verbatim: "this is also where the dev manager should have been notified of work to fix during the buil… · finalises Sep 18, 4:42 PM CST · `select public.reverse_decision('07c1ef4b-1248-48a4-9fbc-4c2e9af6e566','John','<why>');`
- `e53e3863` · ticket-scope · `SES-364` · JOHN 2026-09-15, verbatim: "this is good, i want to go forward" (item 2 of the status walkthrough). Moved SES-364 from… · finalises Sep 18, 4:42 PM CST · `select public.reverse_decision('e53e3863-dccf-436d-86d8-453a84f91145','John','<why>');`
- `eb58818a` · ticket-scope · `SES-402` · JOHN 2026-09-15, verbatim: "this is also where the dev manager should have been notified of work to fix during the buil… · finalises Sep 18, 4:55 PM CST · `select public.reverse_decision('eb58818a-401e-40b6-97c4-f3bf76fd1ff8','John','<why>');`
- `e47e2c18` · ticket-status · `SES-378` · JOHN 2026-09-15, verbatim: "go, but also note, the dev manager should have approved this without my interference. Make… · finalises Sep 18, 5:15 PM CST · `select public.reverse_decision('e47e2c18-10ea-4618-8000-ec941b246685','John','<why>');`
- `6f33ec28` · directive · `SES-378` · JOHN 2026-09-15, verbatim: "the dev manager should have approved this without my interference. Make that happen too." S… · finalises Sep 18, 5:15 PM CST · `select public.reverse_decision('6f33ec28-3810-44b4-8825-38ea57c8aac4','John','<why>');`
- `48b0a2d5` · ticket-scope · `SES-287` · Item 5 of the status walkthrough, decided under John's standing ruling of 2026-09-15 (directive 6f33ec28: "the dev mana… · finalises Sep 18, 5:16 PM CST · `select public.reverse_decision('48b0a2d5-58ea-4158-aa48-28df7fa00acd','John','<why>');`
- `9cab0073` · ticket-scope · `SES-403` · Filed SES-403 (a ship blocked for a cause outside itself is re-graded once that cause is fixed) into Moat Support, pinn… · finalises Sep 18, 5:32 PM CST · `select public.reverse_decision('9cab0073-9419-4323-a610-bffe20d76d04','John','<why>');`
- `6e01f7b5` · rollback · — · Auto-rollback held: ci-red on 3eb6855 was not reverted (card-only) · finalises Sep 18, 5:34 PM CST · `select public.reverse_decision('6e01f7b5-158c-4397-a6b6-f36600661e91','John','<why>');`
- `18468b27` · ship · `MOB-22` · MOB-22 ships to dev as delivered (verdict block on pre-existing reds) and goes to production as its own release branch,… · finalises Sep 18, 6:10 PM CST · `select public.reverse_decision('18468b27-6506-470e-9fdf-63896b589ff0','John','<why>');`

**664 final this week, 0 reversed this week** — *this week* is a **rolling 7 days** back from the stamp, not a calendar week and not a Friday-07:00Z reset: no such weekly-reset helper exists in this file or anywhere in `scripts/`, so a rolling window is what is used and is labelled as one. A reversal is the strongest negative signal the ladder takes (`M6-07`), so the second number is the one to read first.

**Judgment classes** — *as of 2026-09-15 23:10Z (Sep 15, 6:10 PM CST).* What the corpus currently holds per pull test, live from `public.judgment_class_census` (`SES-84`; the same view `SES-159` reads). Ratification is a standing metric (John, 2026-08-23: a class is never finished being learned), never a finish line.

| class | ratified | proposed | rejected | total |
|---|---:|---:|---:|---:|
| `P1 - Improves John's Skills` | 7 | 31 | 6 | 44 |
| `P2 - Inventive` | 0 | 58 | 6 | 64 |
| `P3 - Investor Value` | 0 | 58 | 7 | 65 |
| `P4 - New Customers` | 1 | 37 | 3 | 41 |
| `neutral` | 0 | 84 | 29 | 113 |

- Newest proposed root claim for P1: *no proposed root claim*.
- Newest proposed root claim for P2: `VC-SYN-002` — Inventive features are the least-tested product goal because the bar John set — something competitors cannot easily copy — he has never applied to a real featu…
- Newest proposed root claim for P3: `VC-SYN-001` — Investor value is the least-defined product goal because nobody has yet said what an investor would check. The drafts agree on one reading: the buyer is a skep…
- Newest proposed root claim for P4: `VC-ROOT-004` — New features that win new customers. The bar is buy-pull — functionality that makes a customer say "I have to buy this." Administrative capability (accounts, b…

**John-model** — *as of 2026-09-15 23:10Z (Sep 15, 6:10 PM CST).* How often a decision that leaned on a standing pattern of John's stood unreversed through its window, live from `public.john_model_signal` (`SES-004`; the criteria are `public.decision_patterns`, exported from `docs/JOHN-DECISION-PATTERNS.md`). A rate binds only from 30 finalised-or-reversed decisions (M7 gate, ruling iii).

- **99.3% agreement** over 152 finalised-or-reversed decisions (151 finalised unreversed, 1 reversed; 35 still open, 187 citing in total). A reversal is the strongest negative signal the ladder takes, so the second number is the one to read first.

| criterion | citing | final unreversed | reversed | open | rate |
|---|---:|---:|---:|---:|---:|
| `pattern:137` P1–P4 are pull tests, not category labels — administrative expectations never q… | 76 | 73 | 0 | 3 | 100% |
| `pattern:0` No standing pattern applied -- new judgment. | 51 | 25 | 0 | 26 | — |
| `pattern:85` Don't gate small, reversible calls on his approval — decide and flag. | 44 | 42 | 1 | 1 | 97.7% |
| `pattern:96` When a gap surfaces outside the session's scope, log it with its own ID rather… | 11 | 5 | 0 | 6 | — |
| `pattern:86` Process, tooling, and hygiene mechanics are fully delegated — decide and execut… | 9 | 8 | 0 | 1 | — |

- A per-pattern `—` is not a zero: that criterion has not reached 30 finalised-or-reversed citations of its own, so it carries counts and no rate.

**Invention in use** — *as of 2026-09-15 23:10Z (Sep 15, 6:10 PM CST).* Criterion 7 (`docs/SELFBUILD-CHARTER.md`): at least one platform-originated feature — the Bench Report Card judge (`LOG-143`) — is measurably used by real visitors, live from `public.report_card_usage`. Counts only, never a rate.

- **7d:** 0 judge runs, 0 by real visitors (0 distinct).
- **30d:** 3 judge runs, 0 by real visitors (0 distinct).
- **all:** 3 judge runs, 0 by real visitors (0 distinct).

- *no real-visitor use yet.*

**Board by served class** — *as of 2026-09-15 23:10Z (Sep 15, 6:10 PM CST).* Which class each open ticket SERVES under the served-class test (`VC-MISSION-033`), ruled by The Prioritizer's `classify-ticket` and stored on `backlog_items.supports_class` — a ticket's own class is a different question and is not restated here.

| serves | open tickets |
|---|---:|
| `P1 - Improves John's Skills` | 83 |
| `P2 - Inventive` | 22 |
| `P3 - Investor Value` | 6 |
| `P4 - New Customers` | 2 |
| `P7 - Agent Creation` | 1 |
| *serves none* | 486 |

- *Negative ranks are John's own automation queue, seeded to sort ahead of anything assigned later (`SES-86`). The nightly re-rank writes 1..N and therefore sits below them — intended precedence, not a re-rank that failed.*

- **Top 5 by `automation_rank`:**
  -35. `SES-288` — A schema-range red can never be auto-reverted: one refused down-migration disables rollba… *(serves none)*
  -34. `SES-287` — The auto-rollback engine picks a stale green anchor and blames the last pusher for four c… *(serves P2 - Inventive)*
  1. `AGT-79` — The Ticket Owner agent: a nightly pass over the board that checks every ticket's token qu… *(serves P1 - Improves John's Skills)*
  1. `SES-378` — The Development Manager takes the pick: step 5 asks GV-01 for the assignment (ticket, cap… *(serves P2 - Inventive)*
  4. `SES-391` — A continuation re-picks the ticket the chain just gated: AGT-70 was classified gated thre… *(serves P2 - Inventive)*

- Last scheduled re-rank: Sep 15, 4:44 AM CST.

**Governance agents, last 7 days** — *as of 2026-09-15 23:10Z (Sep 15, 6:10 PM CST).* Whether the platform's own agents (`agents.lane = 'governance'`) are doing the development work, live from `public.governance_agent_usage` and `public.ship_handoff_census` (`SES-360`). A **rolling 7 days** back from render time, like the decision counts above. Counts and token sums only, never a rate.

| role | source | calls | input tokens | output tokens |
|---|---|---:|---:|---:|
| Governance — Development Manager | `session` | 4 | 229473 | 12884 |
| Governance — Researcher | `session` | 9 | 1971842 | 196132 |
| Governance — Prioritizer | `mcp` | 1 | 1964 | 1240 |
| Governance — Prioritizer | `session` | 582 | 2208036 | 92173 |
| Governance — Prioritizer | *unlabelled* | 1018 (1014 untokened) | 20121 | 4652 |
| Governance — Designer | `session` | 38 | 86790175 | 618636 |
| Governance — Builder | `session` | 25 | 68919776 | 370258 |
| Governance — Verifier | `mcp` | 3 | 28992 | 18874 |
| Governance — Verifier | `script` | 11 | 175325 | 79690 |
| Governance — Verifier | `session` | 5 | 5352037 | 0 |
| Governance — Verifier | *unlabelled* | 1 | 1276 | 3568 |
| Governance — Auditor | `session` | 24 | 2130338 | 195403 |
| Governance — Ticket Owner | *no calls in the window* | 0 | — | — |

- **Ships with all four handoff rows: 12 of 56** ships in the window (`SES-345`'s four: `automation_rank`, `kickoff_link`, a per-ticket push sha, a verdict row). Missing per leg: kickoff_link 24, per-ticket sha 42, automation_rank 6, verdict 0.
- *unlabelled* is a NULL `call_source` — the pre-attribution unknown, never read as automation (`LOG-128`); `untokened` rows carry no token counts at all (deterministic handler rows), so a large call count beside a small token sum is that, not a cheap model.

**Auditor's ledger** — *as of 2026-09-15 23:10Z (Sep 15, 6:10 PM CST).* What `public.audit_findings` (`AGT-70`) holds and what has left it for the board. Counts only, never a rate. Latest week 2026-W37: **6 findings (4 open · 2 resolved · 0 not a defect)** — **0 ruled** open findings (a ruled, open, `high` row is what `tripwire-to-backlog.js --from-ledger` files, at most 3 per ISO week); **0 filed** to the board from the ledger so far (`source_file = 'audit-ledger'`).

| fingerprint | kind | confidence | fact | ruled |
|---|---|---|---|---|
| `4637961d21e1076a` | contradiction | high | the order of the board's ranking keys | — |
| `4ef228c361f9a904` | stale-or-irrelevant | high | temperature stored for a model whose API rejects temperature | — |
| `b057c6f102845074` | stale-or-irrelevant | high | whether the Selfbuild has started executing | — |
| `e141f20a37d1fbe9` | contradiction | high | the runner's scheduling interval in hours | — |

- *A finding leaves this table only by John's ruling — `resolved`, `not-a-defect`, or ruled and left `open` to file. Candidates a run found but nobody ingested live in `docs/audits/<week>-candidates.json`, not here.*

**Ticket hygiene, last night** — *as of 2026-09-15 23:10Z (Sep 15, 6:10 PM CST).* What the Ticket Owner (`AGT-79`) left on the board: `public.ticket_owner_findings` open rows by check, the newest `hygiene` decision and the newest nightly cycle row. Counts only, never a rate. **179 open findings** across 8 check(s).

| check | open | oldest | nights open |
|---|---:|---|---:|
| `actual-unknown` | 67 | Sep 12, 10:31 PM CST | 2 |
| `verdict-missing` | 41 | Sep 12, 10:31 PM CST | 2 |
| `designed-closed` | 35 | Sep 12, 10:31 PM CST | 2 |
| `size-missing` | 16 | Sep 12, 10:31 PM CST | 2 |
| `type-off-taxonomy` | 13 | Sep 12, 10:31 PM CST | 2 |
| `quote-missing` | 3 | Sep 12, 10:31 PM CST | 2 |
| `cycles-over-quote` | 2 | Sep 12, 10:31 PM CST | 2 |
| `delivered-unaccepted` | 2 | Sep 12, 10:31 PM CST | 2 |

- Last run: `7dffdf5f` · shipped · Sep 15, 4:44 AM CST · 867 rows · 182 findings (3 derivable · 179 judgment) · behind the fences: quote 526 · size 494 · cost 45 · verdict 97 · unrevalidated>30d 427 · attended-actual null 267 · fixed 3 · findings +9 ~170 −6 · decision fd39d118-f6ff-4249-b234-cbf312dfca14 — reversible until 2026-09-18T09:44:04.630689+00:00
- Decision `fd39d118` · open · Ticket Owner: 3 derivable cell fix(es) on 3 row(s) — cost 3 · claim 0 · type 0 · finalises Sep 18, 4:44 AM CST · `select public.reverse_decision('fd39d118-f6ff-4249-b234-cbf312dfca14','John','<why>');`

**Human gates** — *as of 2026-09-15 23:10Z (Sep 15, 6:10 PM CST).* The two reads that say whether anything is waiting on a human: open `backlog_items` carrying `design_status = 'needs-john'`, and `gated_before_build` `runner_items` left with `decision IS NULL` (`M6-01`). Board state, written by no code in this repo — which is why it is REPORTED here and not asserted as a gate by the regression suite. **0 open `needs-john` ticket(s)**, **0 undecided `gated_before_build` card(s)**.

- **Nothing blocks on a human** — a measured zero: both reads ran and both came back empty, so `M6-01` holds on the board it governs.

*Provenance: 914 board rows, payload `sha256:468503548c3f0b9d`, as of 2026-09-15 23:10Z (Sep 15, 6:10 PM CST). The stamp says when this was last read; the sha says whether it still matches the tables. `--check` compares the sha, never the stamp — a refreshed stamp over identical facts is not drift.*
<!-- END GENERATED — scripts/render-standing-brief.js -->

**Next session:** none required — the runner is live and works **John's automation queue** (canonical: `docs/RUNNER-GOV-0820-REQUIREMENTS.md`): the queue is the board's leading sort key, not a list to read (`automation_rank`, v7.0.133) — `ORDER BY queue` already honours it. Classes are always written named, **`P1 - Improves John's Skills` → `P10 - Tooling`**; outcomes as plain words (“did not run”, “gated before build”); budget is two-track (API dollars + token governor). John judges from the briefing page. Runner pause: disable `deepbench-runner` at claude.ai/code/routines. **Board census measured 2026-08-23T12:5xZ by runner cycle `363b5138`, taken from the board after its own close-out recompute rather than carried forward:** **561 open tickets, 561 numbered, 0 open-but-unnumbered**, 611 rows total, **the standing Automation drain now has a FIXED finish line** — from `v7.0.179` (`SES-142`) it works the **18 members John named** on directive `b74009ea`, stored as `runner_drain_scope` FK rows, and a ticket filed into the epic *after* that naming **never joins it**: it queues normally and waits for him. The live `now` tier had already drifted to 19 against his 18. `drain_epic_next()` retires when those 18 are `done`/`removed`, and returns the new outcome **`unscoped`** — never a live-tier fallback — for any future drain declared without a list. Queue/drain state as of **v7.0.196** (2026-08-23 ~17:00Z, `successional-review` close-out, 561 rows renumbered): `SES-140` — *the successor fire is refused by the platform* and `SES-151` — *the scheduler runs on John's clock grid* are both **`done`**; the drain's nearest open member `SES-84` — *the vision corpus* (`needs-john`) waits on John's briefing decisions, so cycles step past it (`SES-114`) and work the board (`SES-121` — *shrink the `.claude/`-mutable surface* went `done` at v7.0.198; procedure text now lives in `docs/runbooks/`, cycle-writable). **The board's `title` column is trustworthy for display for the first time** (`SES-91`, v7.0.177): 98 rows that held a bare priority-class string now carry a real authored title, and the only `^P[0-9]+ - ` title left is `ADM-1`, whose title is a real sentence behind a stale class prefix and is deliberately left for `SES-117` to **accommodate** rather than repair. `SES-119` is now `done` (v7.0.184 + v7.0.185): the briefing renders `public.backlog_display_title(title, description)` rather than the read-time `gist` workaround, and **`runner-cycle.md`'s Language block now requires a ticket's title wherever John reads its ID**. Step 5's `gist` expression deliberately stays — it is still correct for any future row filed the old way, and 50 of 562 open numbered tickets still fall back to it. **From v7.0.195 the chain runs IN-SESSION (`SES-140` FINAL)** — a cycle that actually ran one (`shipped`/`gated_before_build`/`reverted`) and whose drain still returns `pick` opens its next `runner_cycles` row (trigger `chained (drain continuation)`) **in the same session** and re-enters the runbook at step 1; session-spawning is retired as platform-unsupported (`runner-cycle.md` tail step (8) carries the evidence). A **wall-stopped cycle continues nothing**, which keeps the budget wall a brake rather than a metronome. Proven live 2026-08-23: cycles `1fcd687e` → `a11c94d2`, the first chained row in the runner's life. **The briefing-redesign epic is finished** — `SES-129`, its last member, shipped in cycle `ed1a5eb3`. **A new filing rule binds from this version:** `runner_items.backlog_id` takes a **bare** ticket id or NULL and is enforced by `ck_runner_items_backlog_id_bare`; the display string belongs in `display_ref`, and the briefing's id chip reads `coalesce(backlog_id, display_ref)` (`SES-116`, v7.0.174 — `runner-cycle.md` step 9). **`design_status` reads for selection (`SES-114`, v7.0.165); among OPEN tickets measured at the v7.0.198 close-out:** 16 `designed` (incl. `SES-101`, flipped from `needs-desktop` — its one remaining edit now lives in `docs/runbooks/session-setup.md` step 3c, cycle-writable), **0 `needs-desktop`**, **1 `needs-john`** (`SES-84`), 546 `NULL` = not yet triaged, deliberately not guessed to `auto`. Measured at the v7.0.198 close-out: **11 of John's 18 named members remain open** (`SES-121` retired from the list by going `done` this session); the only `needs-john` member is `SES-84` — the rest are buildable, the drain reaches them and can retire on them. **`CHI-89`** still holds its queue slot with its removal card undecided — visible to John and skipped by cycles, exactly as `SES-113` intended. **`SES-133` is still open at `partial`** — the other half of John's 2026-08-23 emergencies directive; it sits at queue 251 rather than at the top, because the drain reads the Automation epic's `now` tier in queue order and `SES-133` is not in that epic. **From v7.0.182 John's own switches govern the cadence** (`SES-143`): the briefing's **§2b Automation panel** carries a scheduler checkbox + an every-N-hours box (live values: **on, 3 hours** — John's order 2026-08-23: the runner runs at **12/3/6/9 on his clock**, `SES-151`) and a drain checkbox, and `runner-cycle.md`'s **new step 1b** calls `public.scheduler_gate()` before anything else — a scheduled cycle arriving early closes `did_not_run` with *"paced by your scheduler setting"*, and with the scheduler off it closes *"scheduler off"*. **The cron stays hourly permanently by design** — a cycle cannot edit its own routine — and **from v7.0.196 (`SES-151`) the gate paces by John's clock grid**: a scheduled fire runs iff its row's `started_at` falls in an America/Chicago hour divisible by `interval_hours` (3 → **12/3/6/9 AM/PM his clock**, DST-proof; the mixed-clock elapsed test that wrongly paced 3 of 9 hourly fires is dead, `q-hourly-interval-boundary` answered by ship). Two consequences worth knowing before reading a quiet night as a stall: the gate **fails open** on every unknown, and it governs **scheduled** fires only, so a standing drain's chained continuation cycles run regardless — while the Automation drain stands, **the chain and not the interval is what actually sets the pace**. A manual fire (off the cron grid) is never paced; whether that is what John wants is the one thing the spec leaves open, asked as `q-manual-fire-pacing`. **From v7.0.188 that gate actually fires** (`SES-146`): until then `scheduler_gate()` matched the trigger by exact equality against the bare word `scheduled`, so a cycle passing the verbatim line step 1b asks for — `trigger: scheduled` — fell through to *"not a scheduled cycle"* and skipped **both** the pacing branch and the `scheduler_on = false` branch, and the grid test compared `now()`-at-step-1b rather than the fire time against a hardcoded ±2. Both failed open, so the panel looked live and bound nothing. The trigger is now normalised, the grid is anchored to the cycle row's own `started_at`, and the tolerance is the column `runner_settings.grid_tolerance_min` (10). **Silence is not a “no”** on any open question. **From v7.0.183 the board's open status is `open`, never `missing`** (`SES-118`): `backlog_items_status_check` now allows exactly `('open','partial','done','removal proposed','removed')` and the retired value raises `23514` — 510 rows renamed, `updated_at` deliberately untouched so step 8c's 30-day revalidation sweep still sees the sinking tail. **That consequence closed at v7.0.189** (attended session `ses118-gated`, 2026-08-23): step 3c's INSERT now writes `'open'`, zero `'missing'` literals remain under `.claude/`, and `SES-118` is `done` — its gated card `76564dde` awaits John's decision on the briefing page.
