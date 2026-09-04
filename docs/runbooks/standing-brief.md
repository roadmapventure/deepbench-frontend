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
## Live board state — generated, do not hand-edit — *as of 2026-09-04 15:22Z (Sep 4, 10:22 AM CST)*

> Rendered from the tables by `scripts/render-standing-brief.js` at every ship. **Every number below is derived; nothing here is maintained by hand.** The judgment prose beneath this block is the opposite — hand-maintained, deliberately, and this script never writes outside these markers. Where the two disagree about a number, this block is right and the sentence below is stale: say so rather than reconciling them by hand.

**Board census** — *as of 2026-09-04 15:22Z (Sep 4, 10:22 AM CST).* **588 open tickets**, 581 numbered, **7 open-but-unnumbered**, 812 rows total.

| `status` | rows | share of board |
|---|---:|---:|
| `open` | 514 | 63.3% |
| `done` | 214 | 26.4% |
| `partial` | 44 | 5.4% |
| `removal proposed` | 27 | 3.3% |
| `removed` | 10 | 1.2% |
| `delivered` | 3 | 0.4% |

**`design_status` among OPEN tickets** — *as of 2026-09-04 15:22Z (Sep 4, 10:22 AM CST).* Reads for selection (`SES-114`); `NULL` is *not* `auto`, it is not-yet-triaged and no cycle may backfill it.

| `design_status` | open rows | selection effect |
|---|---:|---|
| `NULL` | 538 | full ceremony — not yet triaged |
| `needs-decision` | 33 | — |
| `designed` | 13 | **not a skip** — build from `kickoff_link` (step 6 fast path) |
| `needs-desktop` | 3 | skipped, `record_skip()` — needs a session John attends (B39) |
| `auto` | 1 | full ceremony |

**Scheduler and automation settings** — *as of 2026-09-04 15:22Z (Sep 4, 10:22 AM CST).* §2b of the briefing, John's own switches, binding via `scheduler_gate()` at step 1b:

- Scheduler: **on**, every **1 hour** on John's clock grid (America/Chicago hours divisible by the interval — `SES-151`, DST-proof).
- Cron minute **40**, manual-fire tolerance **±10 min** (a start outside it is treated as a manual fire and is never paced).
- Standing daily max: **196M tokens**. This is rung 3 of five, **below** the 48h stale floor: a standing number must not defeat the staleness brake.

**Standing epic drain** — *as of 2026-09-04 15:22Z (Sep 4, 10:22 AM CST).* Created only by John; the runner may read one, never write one (`drain_epic_next()` property 5). The finish line is drawn from the members he **named** (`runner_drain_scope`), never the live `now` tier (`SES-142`) — and within that list it is the members a milestone **gate ruled required** (`milestone_required`, `SES-310`) whenever the list carries such a ruling, every named member otherwise.

- **No drain standing.** Selection is the class-sorted board exactly as it is with no drain declared.

**Open decisions** — *as of 2026-09-04 15:22Z (Sep 4, 10:22 AM CST).* Decisions made under `M6-02` that are still inside their reversal window (`runner_settings.reversal_window_hours` = 72h). Silence finalises them; to reverse one, run the line beside it (`docs/runbooks/session-setup.md` § Reversing a decision).

- `62177395` · directive · — · Directive 0970abad amended under M6-06: "accepted" reads "decided and not reversed", so the standing drain succession n… · finalises Sep 5, 6:03 PM CST · `select public.reverse_decision('62177395-e2ed-4001-91ac-6bd4aed25eaf','John','<why>');`
- `c3e86310` · gate · — · Selfbuild M6 - Autonomy Graduation — milestone gate review: PASS WITH NAMED GAPS; 3 members filed into M6 (SES-315, SES… · finalises Sep 5, 6:33 PM CST · `select public.reverse_decision('c3e86310-340e-42ea-9309-6283d1929681','John','<why>');`
- `b5214a0a` · ship · `SES-315` · SES-315 shipped at v7.0.405 (1ae5b3f8) on verdict 7f33934c-78e3-401a-9643-d6dcb2bbf8dd · finalises Sep 5, 8:26 PM CST · `select public.reverse_decision('b5214a0a-524f-4f24-8f2f-05a1809edcc7','John','<why>');`
- `05cc2722` · gate · `SES-186` · Selfbuild M7 - The Inventor design gate SES-186 decided under M6-01: invention proposals are enhancement-lane rows (EL-… · finalises Sep 5, 9:09 PM CST · `select public.reverse_decision('05cc2722-b6aa-47fc-a557-cd85d44e42f5','John','<why>');`
- `b60c8c8c` · ship · `SES-186` · SES-186 shipped at v7.0.407 (35774158) on verdict 98eabd3b-5d5f-4ecf-8cfe-dcc8fe3e4331 · finalises Sep 5, 9:24 PM CST · `select public.reverse_decision('b60c8c8c-9c12-4502-9129-59f2c6470bcc','John','<why>');`
- `16c8db71` · invention · `LOG-143` · First platform-originated feature ratified: LOG-143 becomes the Bench Report Card proposal row (scope_origin enhancemen… · finalises Sep 5, 9:36 PM CST · `select public.reverse_decision('16c8db71-ae65-4364-a945-6cd7d0098ee7','John','<why>');`
- `8697016c` · invention · `LOG-143` · LOG-143 (Bench Report Card, John's ratified first feature) linked to Selfbuild M7 - The Inventor as a non-required memb… · finalises Sep 5, 9:38 PM CST · `select public.reverse_decision('8697016c-b6d6-4667-88db-06bedd8ff02c','John','<why>');`
- `34ff687c` · directive · `SES-320` · SES-320 (the delivered exit) named into the M7 drain by John and pinned to queue position 1, so it builds before the P1… · finalises Sep 5, 9:49 PM CST · `select public.reverse_decision('34ff687c-83eb-4714-8c19-fe9b1049f988','John','<why>');`
- `50baaef2` · classification · `SES-84` · SES-84 classification pass: all 306 live vision claims classed under the §19v delegation — P1 - Improves John's Skills… · finalises Sep 5, 10:04 PM CST · `select public.reverse_decision('50baaef2-8e8d-42b6-9089-56a5f76db959','John','<why>');`
- `4d9d406d` · ship · `SES-84` · SES-84 shipped at v7.0.409 (c8d0763a) on verdict 8e12555d-3f3b-4b18-8936-4ab3ddaebcd5 · finalises Sep 5, 10:18 PM CST · `select public.reverse_decision('4d9d406d-c329-4152-9301-4d8e07cf2550','John','<why>');`
- `bd8390d8` · ship · `SES-004` · SES-004 shipped at v7.0.411 (c15fb12b) on verdict 90060e57-6cd8-4ca6-a379-2647817e3cdf · finalises Sep 5, 11:01 PM CST · `select public.reverse_decision('bd8390d8-8106-4326-adde-39804d73d802','John','<why>');`
- `cfdbeab2` · ship-backfill · — · 14 legacy delivered tickets closed: LOG-41, LOG-73, LOG-104, LOG-132, LOG-141, LOG-145, SES-76, SES-131, SES-155, SES-1… · finalises Sep 5, 11:10 PM CST · `select public.reverse_decision('cfdbeab2-4e4a-4cbb-8321-e82ba6d24cdc','John','<why>');`
- `4cd37179` · ship · `SES-320` · SES-320 shipped at v7.0.412 (816187bd) on verdict 62b81632-a30c-48f0-af47-93259639bf49 · finalises Sep 6, 9:32 AM CST · `select public.reverse_decision('4cd37179-0c1f-4e38-9d25-a77299a969da','John','<why>');`
- `78e4b243` · ship · `SES-159` · SES-159 shipped at v7.0.413 (fc79f1be) on verdict 970ecd09-6d3e-4d38-9ffa-70285b54ff7d · finalises Sep 6, 10:08 AM CST · `select public.reverse_decision('78e4b243-49f6-4c19-b071-142bdf388ba9','John','<why>');`
- `aad98541` · ship · `SES-160` · SES-160 shipped at v7.0.414 (4736d4de) on verdict bbcc44d5-7efd-4c46-b196-25e6c0482ae9 · finalises Sep 6, 10:43 AM CST · `select public.reverse_decision('aad98541-dbe9-4e03-8f78-059419f15f60','John','<why>');`
- `88d3dbb9` · ship · `LOG-143` · LOG-143 shipped at v7.0.415 (fed9391e) on verdict f87147af-a4a3-428e-bd2f-6bddadfe654f · finalises Sep 6, 11:04 AM CST · `select public.reverse_decision('88d3dbb9-afc0-4191-afdf-56173993eb31','John','<why>');`
- `8f119ea7` · ship · `LOG-143` · LOG-143 shipped at v7.0.417 (7b545d44) on verdict cfb753ea-494f-44aa-ba46-ad2964b8db4d · finalises Sep 6, 11:30 AM CST · `select public.reverse_decision('8f119ea7-551b-4ba6-880e-8f9cc3efb44b','John','<why>');`
- `1a471147` · ship · `LOG-143` · LOG-143 shipped at v7.0.418 (1fd20304) on verdict 9fb7f217-c7dd-4cc8-9196-80b29e8c8a39 · finalises Sep 6, 11:52 AM CST · `select public.reverse_decision('1a471147-0027-46e1-8ad2-26ccab4014c2','John','<why>');`
- `32fa2fea` · directive · `LOG-143` · report-card-intent now instructs the judge to score groundedness 0-5 from Library chunk text fetched by id (include_con… · finalises Sep 6, 11:58 AM CST · `select public.reverse_decision('32fa2fea-89e3-40f6-97b7-a1ec26eac2f7','John','<why>');`
- `8a7c51b9` · ship · `LOG-143` · LOG-143 shipped at v7.0.419 (766ec64c) on verdict f18cfdf1-7862-488a-b79e-8a4780be5391 · finalises Sep 6, 12:12 PM CST · `select public.reverse_decision('8a7c51b9-dee4-4b91-ab69-b5c810d577af','John','<why>');`
- `67ce31ca` · directive · `LOG-143` · The Bench Report Card judge gains a trace_facts knowledge Skill (rc-trace-knowledge) that puts the graded run's own log… · finalises Sep 6, 12:15 PM CST · `select public.reverse_decision('67ce31ca-3a14-4711-9a50-abfd187b542b','John','<why>');`
- `462942fe` · directive · `LOG-143` · Owen Marsh — The Proofreader (owen) granted uber_access so the Bench Report Card's trace_facts section can read the Lib… · finalises Sep 6, 12:23 PM CST · `select public.reverse_decision('462942fe-e043-41b8-9fdc-ea860797249c','John','<why>');`
- `2fe13ea9` · ship · `LOG-143` · LOG-143 shipped at v7.0.419 (827ae448) on verdict fa966385-7f6f-4467-b318-8ee49eb6437f · finalises Sep 6, 12:25 PM CST · `select public.reverse_decision('2fe13ea9-ae3a-4aa0-8fb3-f180e18b5aba','John','<why>');`
- `182655e3` · directive · `SES-321` · M5-01's statement is amended: an EL-01-admitted enhancement now passes the Selfbuild epic fence, in the register and in… · finalises Sep 6, 12:28 PM CST · `select public.reverse_decision('182655e3-f559-4b46-9457-7d3df8bbf998','John','<why>');`
- `dbb077cc` · ship · `SES-321` · SES-321 shipped at v7.0.416 (bd8de880) on verdict 6288cb03-f341-4e8c-b72d-683119a2e51f · finalises Sep 6, 12:43 PM CST · `select public.reverse_decision('dbb077cc-35f6-419a-83d3-fa2088eb0d0d','John','<why>');`
- `677bbcfa` · ship · `LOG-143` · LOG-143 shipped at v7.0.420 (6fd8fdd1) on verdict 310fbbc8-9020-4127-ab4a-0080f931c9f3 · finalises Sep 6, 12:59 PM CST · `select public.reverse_decision('677bbcfa-86d7-4962-beec-b7a2835ae417','John','<why>');`
- `02d8efb4` · gate · — · Selfbuild M7 - The Inventor — milestone gate review: PASS WITH NAMED GAPS (both lenses); 8 successor members filed into… · finalises Sep 6, 1:22 PM CST · `select public.reverse_decision('02d8efb4-4a30-4b02-8206-175a6a090ec2','John','<why>');`
- `aec9f43c` · directive · `SES-319` · SES-319 (the silent cloud runner routine) is linked to Selfbuild M7 - The Inventor so the Selfbuild lane can see it, at… · finalises Sep 7, 10:05 AM CST · `select public.reverse_decision('aec9f43c-c488-4406-b5c5-96b392cbfa93','John','<why>');`
- `2b2c0ed8` · directive · `SES-326` · SES-326 (the exit exam's missing instruments) gains the charter's two M7 measures nothing renders: Inventor acceptance… · finalises Sep 7, 10:05 AM CST · `select public.reverse_decision('2b2c0ed8-98d1-4c18-8e93-ca9f8a2fe262','John','<why>');`
- `1fefea56` · ship · `SES-320` · SES-320 shipped at v7.0.422 (3e181af727a348b7a61a58c3a1d0d5e60a0eab4b) on verdict ba145856-f593-4128-99fd-f6cff70befaa · finalises Sep 7, 10:18 AM CST · `select public.reverse_decision('1fefea56-8213-42e0-9121-2244471bf339','John','<why>');`
- `171afcbb` · ship · `SES-319` · SES-319 shipped at v7.0.423 (2ce345e7accb70c3d1399b2868ca725f89c5561a) on verdict a92bb24e-9619-4f02-8105-87dd1eea84c4 · finalises Sep 7, 10:22 AM CST · `select public.reverse_decision('171afcbb-9236-406d-911e-48f3b192b83b','John','<why>');`

**1 final this week, 1 reversed this week** — *this week* is a **rolling 7 days** back from the stamp, not a calendar week and not a Friday-07:00Z reset: no such weekly-reset helper exists in this file or anywhere in `scripts/`, so a rolling window is what is used and is labelled as one. A reversal is the strongest negative signal the ladder takes (`M6-07`), so the second number is the one to read first.

**Judgment classes** — *as of 2026-09-04 15:22Z (Sep 4, 10:22 AM CST).* What the corpus currently holds per pull test, live from `public.judgment_class_census` (`SES-84`; the same view `SES-159` reads). Ratification is a standing metric (John, 2026-08-23: a class is never finished being learned), never a finish line.

| class | ratified | proposed | rejected | total |
|---|---:|---:|---:|---:|
| `P1 - Improves John's Skills` | 2 | 32 | 6 | 40 |
| `P2 - Inventive` | 0 | 54 | 6 | 60 |
| `P3 - Investor Value` | 0 | 45 | 7 | 52 |
| `P4 - New Customers` | 1 | 37 | 3 | 41 |
| `neutral` | 0 | 84 | 29 | 113 |

- Newest proposed root claim for P1: `VC-ROOT-001` — Features that showcase and grow John's frontier AI / agentic-engineering skill and make him more hireable, especially for FAANG-level AI roles; the platform is…
- Newest proposed root claim for P2: `VC-ROOT-002` — New inventive features: white space and competitive differentiation. The bar is hard-to-replicate uniqueness — a feature competitors can easily copy (an admin…
- Newest proposed root claim for P3: `VC-ROOT-003` — New features that add investor / buyout value.
- Newest proposed root claim for P4: `VC-ROOT-004` — New features that win new customers. The bar is buy-pull — functionality that makes a customer say "I have to buy this." Administrative capability (accounts, b…

**John-model** — *as of 2026-09-04 15:22Z (Sep 4, 10:22 AM CST).* How often a decision that leaned on a standing pattern of John's stood unreversed through its window, live from `public.john_model_signal` (`SES-004`; the criteria are `public.decision_patterns`, exported from `docs/JOHN-DECISION-PATTERNS.md`). A rate binds only from 30 finalised-or-reversed decisions (M7 gate, ruling iii).

- **9 pattern-citing decisions so far** (0 finalised unreversed, 1 reversed, 8 open) — no rate below 30.

**Invention in use** — *as of 2026-09-04 15:22Z (Sep 4, 10:22 AM CST).* Criterion 7 (`docs/SELFBUILD-CHARTER.md`): at least one platform-originated feature — the Bench Report Card judge (`LOG-143`) — is measurably used by real visitors, live from `public.report_card_usage`. Counts only, never a rate.

- **7d:** 3 judge runs, 0 by real visitors (0 distinct).
- **30d:** 3 judge runs, 0 by real visitors (0 distinct).
- **all:** 3 judge runs, 0 by real visitors (0 distinct).

- *no real-visitor use yet.*

*Provenance: 812 board rows, payload `sha256:6a836a28533fbba6`, as of 2026-09-04 15:22Z (Sep 4, 10:22 AM CST). The stamp says when this was last read; the sha says whether it still matches the tables. `--check` compares the sha, never the stamp — a refreshed stamp over identical facts is not drift.*
<!-- END GENERATED — scripts/render-standing-brief.js -->

**Next session:** none required — the runner is live and works **John's automation queue** (canonical: `docs/RUNNER-GOV-0820-REQUIREMENTS.md`): the queue is the board's leading sort key, not a list to read (`automation_rank`, v7.0.133) — `ORDER BY queue` already honours it. Classes are always written named, **`P1 - Improves John's Skills` → `P10 - Tooling`**; outcomes as plain words (“did not run”, “gated before build”); budget is two-track (API dollars + token governor). John judges from the briefing page. Runner pause: disable `deepbench-runner` at claude.ai/code/routines. **Board census measured 2026-08-23T12:5xZ by runner cycle `363b5138`, taken from the board after its own close-out recompute rather than carried forward:** **561 open tickets, 561 numbered, 0 open-but-unnumbered**, 611 rows total, **the standing Automation drain now has a FIXED finish line** — from `v7.0.179` (`SES-142`) it works the **18 members John named** on directive `b74009ea`, stored as `runner_drain_scope` FK rows, and a ticket filed into the epic *after* that naming **never joins it**: it queues normally and waits for him. The live `now` tier had already drifted to 19 against his 18. `drain_epic_next()` retires when those 18 are `done`/`removed`, and returns the new outcome **`unscoped`** — never a live-tier fallback — for any future drain declared without a list. Queue/drain state as of **v7.0.196** (2026-08-23 ~17:00Z, `successional-review` close-out, 561 rows renumbered): `SES-140` — *the successor fire is refused by the platform* and `SES-151` — *the scheduler runs on John's clock grid* are both **`done`**; the drain's nearest open member `SES-84` — *the vision corpus* (`needs-john`) waits on John's briefing decisions, so cycles step past it (`SES-114`) and work the board (`SES-121` — *shrink the `.claude/`-mutable surface* went `done` at v7.0.198; procedure text now lives in `docs/runbooks/`, cycle-writable). **The board's `title` column is trustworthy for display for the first time** (`SES-91`, v7.0.177): 98 rows that held a bare priority-class string now carry a real authored title, and the only `^P[0-9]+ - ` title left is `ADM-1`, whose title is a real sentence behind a stale class prefix and is deliberately left for `SES-117` to **accommodate** rather than repair. `SES-119` is now `done` (v7.0.184 + v7.0.185): the briefing renders `public.backlog_display_title(title, description)` rather than the read-time `gist` workaround, and **`runner-cycle.md`'s Language block now requires a ticket's title wherever John reads its ID**. Step 5's `gist` expression deliberately stays — it is still correct for any future row filed the old way, and 50 of 562 open numbered tickets still fall back to it. **From v7.0.195 the chain runs IN-SESSION (`SES-140` FINAL)** — a cycle that actually ran one (`shipped`/`gated_before_build`/`reverted`) and whose drain still returns `pick` opens its next `runner_cycles` row (trigger `chained (drain continuation)`) **in the same session** and re-enters the runbook at step 1; session-spawning is retired as platform-unsupported (`runner-cycle.md` tail step (8) carries the evidence). A **wall-stopped cycle continues nothing**, which keeps the budget wall a brake rather than a metronome. Proven live 2026-08-23: cycles `1fcd687e` → `a11c94d2`, the first chained row in the runner's life. **The briefing-redesign epic is finished** — `SES-129`, its last member, shipped in cycle `ed1a5eb3`. **A new filing rule binds from this version:** `runner_items.backlog_id` takes a **bare** ticket id or NULL and is enforced by `ck_runner_items_backlog_id_bare`; the display string belongs in `display_ref`, and the briefing's id chip reads `coalesce(backlog_id, display_ref)` (`SES-116`, v7.0.174 — `runner-cycle.md` step 9). **`design_status` reads for selection (`SES-114`, v7.0.165); among OPEN tickets measured at the v7.0.198 close-out:** 16 `designed` (incl. `SES-101`, flipped from `needs-desktop` — its one remaining edit now lives in `docs/runbooks/session-setup.md` step 3c, cycle-writable), **0 `needs-desktop`**, **1 `needs-john`** (`SES-84`), 546 `NULL` = not yet triaged, deliberately not guessed to `auto`. Measured at the v7.0.198 close-out: **11 of John's 18 named members remain open** (`SES-121` retired from the list by going `done` this session); the only `needs-john` member is `SES-84` — the rest are buildable, the drain reaches them and can retire on them. **`CHI-89`** still holds its queue slot with its removal card undecided — visible to John and skipped by cycles, exactly as `SES-113` intended. **`SES-133` is still open at `partial`** — the other half of John's 2026-08-23 emergencies directive; it sits at queue 251 rather than at the top, because the drain reads the Automation epic's `now` tier in queue order and `SES-133` is not in that epic. **From v7.0.182 John's own switches govern the cadence** (`SES-143`): the briefing's **§2b Automation panel** carries a scheduler checkbox + an every-N-hours box (live values: **on, 3 hours** — John's order 2026-08-23: the runner runs at **12/3/6/9 on his clock**, `SES-151`) and a drain checkbox, and `runner-cycle.md`'s **new step 1b** calls `public.scheduler_gate()` before anything else — a scheduled cycle arriving early closes `did_not_run` with *"paced by your scheduler setting"*, and with the scheduler off it closes *"scheduler off"*. **The cron stays hourly permanently by design** — a cycle cannot edit its own routine — and **from v7.0.196 (`SES-151`) the gate paces by John's clock grid**: a scheduled fire runs iff its row's `started_at` falls in an America/Chicago hour divisible by `interval_hours` (3 → **12/3/6/9 AM/PM his clock**, DST-proof; the mixed-clock elapsed test that wrongly paced 3 of 9 hourly fires is dead, `q-hourly-interval-boundary` answered by ship). Two consequences worth knowing before reading a quiet night as a stall: the gate **fails open** on every unknown, and it governs **scheduled** fires only, so a standing drain's chained continuation cycles run regardless — while the Automation drain stands, **the chain and not the interval is what actually sets the pace**. A manual fire (off the cron grid) is never paced; whether that is what John wants is the one thing the spec leaves open, asked as `q-manual-fire-pacing`. **From v7.0.188 that gate actually fires** (`SES-146`): until then `scheduler_gate()` matched the trigger by exact equality against the bare word `scheduled`, so a cycle passing the verbatim line step 1b asks for — `trigger: scheduled` — fell through to *"not a scheduled cycle"* and skipped **both** the pacing branch and the `scheduler_on = false` branch, and the grid test compared `now()`-at-step-1b rather than the fire time against a hardcoded ±2. Both failed open, so the panel looked live and bound nothing. The trigger is now normalised, the grid is anchored to the cycle row's own `started_at`, and the tolerance is the column `runner_settings.grid_tolerance_min` (10). **Silence is not a “no”** on any open question. **From v7.0.183 the board's open status is `open`, never `missing`** (`SES-118`): `backlog_items_status_check` now allows exactly `('open','partial','done','removal proposed','removed')` and the retired value raises `23514` — 510 rows renamed, `updated_at` deliberately untouched so step 8c's 30-day revalidation sweep still sees the sinking tail. **That consequence closed at v7.0.189** (attended session `ses118-gated`, 2026-08-23): step 3c's INSERT now writes `'open'`, zero `'missing'` literals remain under `.claude/`, and `SES-118` is `done` — its gated card `76564dde` awaits John's decision on the briefing page.
