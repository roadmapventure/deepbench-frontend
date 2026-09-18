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
## Live board state — generated, do not hand-edit — *as of 2026-09-18 10:47Z (Sep 18, 5:47 AM CST)*

> Rendered from the tables by `scripts/render-standing-brief.js` at every ship. **Every number below is derived; nothing here is maintained by hand.** The judgment prose beneath this block is the opposite — hand-maintained, deliberately, and this script never writes outside these markers. Where the two disagree about a number, this block is right and the sentence below is stale: say so rather than reconciling them by hand.

**Board census** — *as of 2026-09-18 10:47Z (Sep 18, 5:47 AM CST).* **657 open tickets**, 648 numbered, **9 open-but-unnumbered**, 932 rows total.

| `status` | rows | share of board |
|---|---:|---:|
| `open` | 559 | 60% |
| `done` | 263 | 28.2% |
| `partial` | 48 | 5.2% |
| `removal proposed` | 27 | 2.9% |
| `delivered` | 23 | 2.5% |
| `removed` | 12 | 1.3% |

**`design_status` among OPEN tickets** — *as of 2026-09-18 10:47Z (Sep 18, 5:47 AM CST).* Reads for selection (`SES-114`); `NULL` is *not* `auto`, it is not-yet-triaged and no cycle may backfill it.

| `design_status` | open rows | selection effect |
|---|---:|---|
| `NULL` | 574 | full ceremony — not yet triaged |
| `needs-decision` | 44 | — |
| `designed` | 31 | **not a skip** — build from `kickoff_link` (step 6 fast path) |
| `needs-desktop` | 7 | skipped, `record_skip()` — needs a session John attends (B39) |
| `auto` | 1 | full ceremony |

**Scheduler and automation settings** — *as of 2026-09-18 10:47Z (Sep 18, 5:47 AM CST).* §2b of the briefing, John's own switches, binding via `scheduler_gate()` at step 1b:

- Scheduler: **on**, every **1 hour** on John's clock grid (America/Chicago hours divisible by the interval — `SES-151`, DST-proof).
- Cron minute **40**, manual-fire tolerance **±10 min** (a start outside it is treated as a manual fire and is never paced).
- Standing daily max: **196M tokens**. This is rung 3 of five, **below** the 48h stale floor: a standing number must not defeat the staleness brake.

**Standing epic drain** — *as of 2026-09-18 10:47Z (Sep 18, 5:47 AM CST).* Created only by John; the runner may read one, never write one (`drain_epic_next()` property 5). The finish line is drawn from the members he **named** (`runner_drain_scope`), never the live `now` tier (`SES-142`) — and within that list it is the members a milestone **gate ruled required** (`milestone_required`, `SES-310`) whenever the list carries such a ruling, every named member otherwise.

- **No drain standing.** Selection is the class-sorted board exactly as it is with no drain declared.

**Open decisions** — *as of 2026-09-18 10:47Z (Sep 18, 5:47 AM CST).* Decisions made under `M6-02` that are still inside their reversal window (`runner_settings.reversal_window_hours` = 72h). Silence finalises them; to reverse one, run the line beside it (`docs/runbooks/session-setup.md` § Reversing a decision).

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
- `81ddac6a` · rollback · — · Auto-rollback held: ci-red on 1540d50 was not reverted (card-only) · finalises Sep 18, 6:28 PM CST · `select public.reverse_decision('81ddac6a-b508-456f-a4f7-0cf74e08cea2','John','<why>');`
- `a369b3aa` · ticket-scope · `SES-404` · Filed SES-404: agt-70-auditor.test.mjs asserts on the LIVE corpus, so it is red on every commit and is now the only thi… · finalises Sep 18, 6:30 PM CST · `select public.reverse_decision('a369b3aa-cb82-4590-b5b5-2a44112473b8','John','<why>');`
- `2a3fee6a` · ship · `MOB-22` · On John's word, PR #11 merged to main: the MOB-22 locked app frame is live on deepbench.roadmapventure.com. · finalises Sep 18, 6:49 PM CST · `select public.reverse_decision('2a3fee6a-6820-4d9b-b188-1c8cabc45027','John','<why>');`
- `3eb61e71` · ticket-status · `SES-403` · SES-403 designed: kickoff v7.0.499 written and pushed, design_status -> designed · finalises Sep 18, 8:13 PM CST · `select public.reverse_decision('3eb61e71-3ace-4118-bbde-c095a5e7a4ad','John','<why>');`
- `34ebcf23` · filing · — · Filed SES-405 and SES-406 from this cycle's CI-red root-cause (one atomic ID block of 2) · finalises Sep 18, 8:16 PM CST · `select public.reverse_decision('34ebcf23-0e65-495a-b1c6-da0b774fa20c','John','<why>');`
- `461bb2de` · ticket-status · `SES-403` · SES-403 built and pushed at v7.0.500; verdict block for an outside cause, so the ticket goes delivered · finalises Sep 18, 9:13 PM CST · `select public.reverse_decision('461bb2de-965b-4ef8-b4a4-469c757f982f','John','<why>');`
- `456bbb40` · ticket-status · `SES-364` · SES-364 designed and built at v7.0.501 (685d36da); verdict block for the same outside cause, ticket delivered · finalises Sep 18, 10:14 PM CST · `select public.reverse_decision('456bbb40-add5-4ee7-8cc0-685f793b1784','John','<why>');`
- `6c41c311` · rollback · — · Auto-rollback held: ci-red on 685d36d was not reverted (card-only) · finalises Sep 18, 10:44 PM CST · `select public.reverse_decision('6c41c311-92f2-4406-9b41-2805148b3bde','John','<why>');`
- `74ed56bd` · repair · — · Repair: 5 before-images THIS SESSION wrote keyed by backlog_id text instead of the uuid PK, making its own reversal pro… · finalises Sep 18, 10:51 PM CST · `select public.reverse_decision('74ed56bd-d843-460e-9941-83cd83e96d78','John','<why>');`
- `91e75dd4` · filing · `SES-407` · Filed SES-407: 418 backlog_items before-images are keyed by backlog_id text, so reverse_decision() cannot address them · finalises Sep 18, 10:51 PM CST · `select public.reverse_decision('91e75dd4-1b42-4f65-96b7-f9fa3d3dadba','John','<why>');`
- `bafbfa71` · ticket-status · `SES-399` · SES-399 designed and built at v7.0.502 (b743d24c); verdict block for the same outside cause, ticket delivered · finalises Sep 18, 10:57 PM CST · `select public.reverse_decision('bafbfa71-e589-4d2e-897f-355561d88225','John','<why>');`
- `762c0f29` · agent-row · `SES-396` · SES-396 slice 2: the Designer gains ds-knowledge-environment (linked to design-kickoff at display_order 5) and ds-kicko… · finalises Sep 18, 11:22 PM CST · `select public.reverse_decision('762c0f29-5c76-496e-9da4-a9f15391502e','John','<why>');`
- `1c155d2c` · filing · `SES-408` · Filed SES-408: the staff watch appends an environment-facts register line for every filing it classifies as an environm… · finalises Sep 18, 11:36 PM CST · `select public.reverse_decision('1c155d2c-20ea-47c6-a554-c46e007b04cd','John','<why>');`
- `c888ab3b` · ticket-status · `SES-378` · SES-378 slice 2 was designed, built and verified, and is gated before build rather than shipped: the Verifier returned… · finalises Sep 18, 11:39 PM CST · `select public.reverse_decision('c888ab3b-b8ad-418b-a369-09238ced962a','John','<why>');`
- `c273dc52` · rollback · — · Auto-rollback held: ci-red on b743d24 was not reverted (card-only) · finalises Sep 18, 11:44 PM CST · `select public.reverse_decision('c273dc52-e273-4160-beac-ce6d086d4bad','John','<why>');`
- `db295b92` · ticket-status · `SES-396` · SES-396 slice 2 built and pushed at v7.0.504 (58accfcd); verdict block for the same outside cause, ticket delivered · finalises Sep 19, 12:08 AM CST · `select public.reverse_decision('db295b92-e89a-4dba-8788-92e87fedc733','John','<why>');`
- `82cf6bbc` · ticket-scope · `SES-391` · Appended a second live sighting to SES-391: the chain re-picked SES-378 twenty-nine minutes after a peer gated it · finalises Sep 19, 12:12 AM CST · `select public.reverse_decision('82cf6bbc-6f10-4f38-bad8-ef4a8cf2c0d3','John','<why>');`
- `6471c68f` · rollback · — · Auto-rollback held: ci-red on 58accfc was not reverted (card-only) · finalises Sep 19, 1:44 AM CST · `select public.reverse_decision('6471c68f-7ed7-4de5-a640-2eb08380e098','John','<why>');`
- `4a04764a` · classification · — · board ordered: 5 ticket(s) given an automation_rank · finalises Sep 19, 1:46 AM CST · `select public.reverse_decision('4a04764a-a5d8-459b-9d05-c02719ba37d7','John','<why>');`
- `13000992` · hygiene · `AGT-79` · Ticket Owner: 3 derivable cell fix(es) on 3 row(s) — cost 2 · claim 0 · type 1 · finalises Sep 19, 1:47 AM CST · `select public.reverse_decision('13000992-f57c-4564-a100-d25e8b5b70cf','John','<why>');`
- `195c52b6` · rollback · — · Auto-rollback held: ci-red on 05e9f95 was not reverted (card-only) · finalises Sep 19, 2:31 AM CST · `select public.reverse_decision('195c52b6-2726-4d89-a823-161722b05016','John','<why>');`
- `c9855388` · learning · `SES-159` · class-loop learning claims for P2 - Inventive · finalises Sep 19, 2:35 AM CST · `select public.reverse_decision('c9855388-725a-4d28-ac00-e9fed50ff426','John','<why>');`
- `33143012` · ticket-status · `SES-385` · SES-385 stays partial with design_status cleared and kickoff_link kept — the ship applying its own new rule to itself. · finalises Sep 19, 3:11 AM CST · `select public.reverse_decision('33143012-9c26-46f6-951f-566e05404729','John','<why>');`
- `94853781` · rollback · — · Auto-rollback held: ci-red on f102492 was not reverted (card-only) · finalises Sep 19, 3:12 AM CST · `select public.reverse_decision('94853781-22a0-4e54-b56a-96fce962b749','John','<why>');`
- `24e008f5` · design-complete · `SES-287` · SES-287 designed as slice 1 of 2 — the one-cycle revert guard; kickoff v7.0.507 written and lane-gated (exit 0, 7713 B). · finalises Sep 19, 3:33 AM CST · `select public.reverse_decision('24e008f5-e31e-4d76-80c7-795e9556803e','John','<why>');`
- `d2818688` · ticket-status · `SES-287` · SES-287 slice 1 shipped at v7.0.507 / 089c0bbd; verdict BLOCK on the standing agt-70-auditor red, so the ticket is writ… · finalises Sep 19, 4:00 AM CST · `select public.reverse_decision('d2818688-f9c1-494d-9b3e-8cc6155966df','John','<why>');`
- `49017b9e` · rollback · — · Auto-rollback held: ci-red on 089c0bb was not reverted (card-only) · finalises Sep 19, 4:04 AM CST · `select public.reverse_decision('49017b9e-35d4-41f4-af0a-fd028780bb9a','John','<why>');`
- `e712e1c6` · ticket-status · `AGT-79` · AGT-79 stops advertising a design that is already built: design_status cleared, status stays partial, kickoff_link kept. · finalises Sep 19, 4:14 AM CST · `select public.reverse_decision('e712e1c6-ad23-4e4c-9a8b-2b44d881aead','John','<why>');`
- `0535dca2` · rollback · — · Auto-rollback held: ci-red on 5791273 was not reverted (card-only) · finalises Sep 19, 7:44 AM CST · `select public.reverse_decision('0535dca2-535c-4a67-89a5-08b4a33ff919','John','<why>');`
- `341fe342` · ship · `SES-378` · SES-378 shipped at v7.0.503 (e18f7ee2cc4cff7ec258de7c56bc395853a9503b) on verdict 9ac16a26-f3a9-40a0-8a5f-56a960565830 · finalises Sep 19, 8:24 AM CST · `select public.reverse_decision('341fe342-9fdb-4ffc-a0f7-43b359a7efe4','John','<why>');`
- `78acfaae` · ship · `SES-378` · SES-378 shipped at v7.0.508 (78b9e4e424c0a8f144d21f4840436e2c51a33137) on verdict d245f36a-2f3b-450a-b592-b1db44ddd9c7 · finalises Sep 19, 9:20 AM CST · `select public.reverse_decision('78acfaae-95a8-4dfa-be6c-13b2d5e122fe','John','<why>');`
- `f43264be` · agent-row · `SES-378` · SES-378 slice 4: the Development Manager gains the step-9 chain rule as a 6th must on dm-guardrails, and dm-knowledge-c… · finalises Sep 19, 10:01 AM CST · `select public.reverse_decision('f43264be-023d-4262-8a56-69f2f03c25ae','John','<why>');`
- `04b196cd` · ship · `SES-378` · SES-378 shipped at v7.0.509 (ba9f6f9e88847ad7b4bf688fa50fa2913a49bec1) on verdict 9106185c-8591-4bf5-b540-86ca2120bbf4 · finalises Sep 19, 10:29 AM CST · `select public.reverse_decision('04b196cd-5764-413b-8136-af3fb4c94e4d','John','<why>');`
- `09c3f465` · directive · `SES-410` · JOHN 2026-09-16, verbatim: "i never said remove the stop." The weekly_pace boot refusal (SES-368, M5-16) remains his st… · finalises Sep 19, 10:34 AM CST · `select public.reverse_decision('09c3f465-5ac0-46d1-8a36-7941bd131409','John','<why>');`
- `5145c324` · ship · `SES-378` · SES-378 shipped at v7.0.511 (58048893fc6aea416821200e5f0048d9501ecfaa) on verdict 31ae9322-1b9b-4f6e-bae9-9b6b93e73a66 · finalises Sep 19, 11:03 AM CST · `select public.reverse_decision('5145c324-c148-429b-bade-15433397091c','John','<why>');`
- `d651465e` · agent-row · `SES-410` · SES-410 includes refreshing The Development Manager's (GV-01) Knowledge row dm-knowledge-cycle-card to the re-rendered… · finalises Sep 19, 11:37 AM CST · `select public.reverse_decision('d651465e-e10d-41d2-9837-dd853999393a','John','<why>');`
- `4dbbdbea` · ship · `AGT-79` · AGT-79 shipped at v7.0.512 (9515291bb25c668f8d855785bb3cc23e138fab1e) on verdict 96357adc-6c7d-4c85-9ee6-2ba08c383ca9 · finalises Sep 19, 11:38 AM CST · `select public.reverse_decision('4dbbdbea-a82b-45e8-98ad-3469424cbfc9','John','<why>');`
- `04f50c06` · directive · `SES-402` · JOHN 2026-09-16, verbatim: "the dev manager and the designer agent should have caught this. how do we make sure they ge… · finalises Sep 19, 11:58 AM CST · `select public.reverse_decision('04f50c06-6ca2-40ad-86d7-67de029f0f68','John','<why>');`
- `28c40f88` · re-scope · `SES-402` · Under John's 2026-09-16 directive 04f50c06 ("how do we make sure they get to make these decisions and i am not needed?"… · finalises Sep 19, 11:59 AM CST · `select public.reverse_decision('28c40f88-b038-4a5b-94de-b33b05d73ea8','John','<why>');`
- `5602bc5e` · re-scope · `SES-404` · Scope rationale written for five runner-found Moat Support tickets (SES-404, SES-405, SES-406, SES-407, SES-409) so the… · finalises Sep 19, 12:00 PM CST · `select public.reverse_decision('5602bc5e-e589-43d1-a378-70638979242e','John','<why>');`
- `d496fb07` · directive · `SES-413` · JOHN 2026-09-16, verbatim, answering "Should I make that the rule?": "of course! it should have been designed by you 3… · finalises Sep 19, 12:13 PM CST · `select public.reverse_decision('d496fb07-978f-4c0e-9f77-71f3c0a93f7c','John','<why>');`
- `6f14756d` · re-scope · `SES-413` · SES-413 (the Development Manager decides by default) pinned to queue position 1, ahead of SES-378: its first slice (the… · finalises Sep 19, 12:14 PM CST · `select public.reverse_decision('6f14756d-abe8-40d9-8180-5bdf56f27ef5','John','<why>');`
- `9a637386` · directive · `SES-414` · JOHN 2026-09-16, verbatim: "Also need to put in the stop meter - if its 24 hours before the reset, the sytem stops at 9… · finalises Sep 19, 12:18 PM CST · `select public.reverse_decision('9a637386-7002-4c90-baed-3f1e03a7a27e','John','<why>');`
- `bcb4a0c1` · agent-row · `SES-414` · SES-414: the Development Manager's cycle-card Knowledge row (skill_profiles dm-knowledge-cycle-card) now carries the v7… · finalises Sep 19, 1:25 PM CST · `select public.reverse_decision('bcb4a0c1-e989-47f9-81a3-5e6a86c71092','John','<why>');`
- `289464d6` · directive · `SES-415` · JOHN 2026-09-16, verbatim: "can you use the reasoning from new tickets that grew from an original and new tickets not f… · finalises Sep 19, 2:20 PM CST · `select public.reverse_decision('289464d6-b696-4fec-8463-c1942a61a150','John','<why>');`
- `3476edb1` · re-scope · `SES-415` · Queue order for the reasoning work: SES-415 pinned second (after SES-413, before SES-378), SES-416 pinned right after S… · finalises Sep 19, 2:20 PM CST · `select public.reverse_decision('3476edb1-b1b1-4966-b956-584500f237a6','John','<why>');`
- `e8365139` · classification · — · board ordered: 13 ticket(s) given an automation_rank · finalises Sep 21, 1:46 AM CST · `select public.reverse_decision('e8365139-bc85-457e-b88b-379fc3558b1d','John','<why>');`
- `1545e15c` · hygiene · `AGT-79` · Ticket Owner: 2 derivable cell fix(es) on 2 row(s) — cost 2 · claim 0 · type 0 · finalises Sep 21, 1:48 AM CST · `select public.reverse_decision('1545e15c-b745-484f-945c-87003c329d9d','John','<why>');`
- `b383cb00` · rule · `SES-413` · Filed governance rule MANAGER-DECIDES-BY-DEFAULT: anything that would come to John goes to The Development Manager (GV-… · finalises Sep 21, 2:18 AM CST · `select public.reverse_decision('b383cb00-c97c-4c0d-bfa4-9b93ffcaf5a1','John','<why>');`
- `890e2815` · rollback · — · Auto-rollback held: ci-red on 8362551 was not reverted (card-only) · finalises Sep 21, 2:47 AM CST · `select public.reverse_decision('890e2815-6461-4aa6-ba7b-928b95e6ad69','John','<why>');`
- `95477210` · rollback · — · Auto-rollback held: ci-red on 8362551 was not reverted (card-only) · finalises Sep 21, 2:47 AM CST · `select public.reverse_decision('95477210-1116-4497-ae90-b2f9703bfca7','John','<why>');`
- `1dfd7a12` · ticket-status · `SES-413` · SES-413 slice 1 shipped as v7.0.514 (8362551a) and the ticket is delivered, not done: the verifier blocked on two regre… · finalises Sep 21, 2:48 AM CST · `select public.reverse_decision('1dfd7a12-a644-4c34-8fe1-80c4a77b84af','John','<why>');`
- `6e675f95` · ticket-scope · `SES-418` · Filed SES-418: the nightly ticket-hygiene pass has never been able to write a finding, because scripts/ticket-owner.js… · finalises Sep 21, 2:49 AM CST · `select public.reverse_decision('6e675f95-c808-4a98-87ae-c208fb17b2fd','John','<why>');`
- `bd93d04c` · learning · `SES-159` · class-loop learning claims for P3 - Investor Value · finalises Sep 21, 2:54 AM CST · `select public.reverse_decision('bd93d04c-d5ce-4232-9712-81d37228c346','John','<why>');`
- `8fabaaff` · ticket-status · `SES-415` · SES-415 pass 2 shipped as v7.0.515 (b9f31b0f) and the ticket is delivered, not done: ten role-tagged criteria and the a… · finalises Sep 21, 3:39 AM CST · `select public.reverse_decision('8fabaaff-a836-4860-9ebb-9d22f5a6bb1f','John','<why>');`
- `d28d926a` · rollback · — · Auto-rollback held: ci-red on b9f31b0 was not reverted (card-only) · finalises Sep 21, 3:39 AM CST · `select public.reverse_decision('d28d926a-301b-4487-b752-2ea6b35595af','John','<why>');`
- `eb8e5405` · agent-row · `SES-378` · SES-378 slice 6: re-pin dm-knowledge-cycle-card to the re-rendered docs/runbooks/cycle-card.md after the runbook edits… · finalises Sep 21, 4:04 AM CST · `select public.reverse_decision('eb8e5405-737a-41ff-aafd-b02d4b899719','John','<why>');`
- `73b483f4` · ticket-status · `SES-378` · SES-378 slice 6 shipped as v7.0.516 (c5ee9fe1) — the staff watch now has callers in the procedure — and the ticket stay… · finalises Sep 21, 4:25 AM CST · `select public.reverse_decision('73b483f4-1098-4c42-b61c-21afb9b6ce71','John','<why>');`
- `e72a502d` · rollback · — · Auto-rollback held: ci-red on c5ee9fe was not reverted (card-only) · finalises Sep 21, 4:25 AM CST · `select public.reverse_decision('e72a502d-7499-45a8-a1f7-e27283607758','John','<why>');`
- `580a06cf` · agent-row · `SES-378` · re-pin dm-knowledge-cycle-card (slice 7) · finalises Sep 21, 4:54 AM CST · `select public.reverse_decision('580a06cf-bf59-472c-83be-c222929046f8','John','<why>');`
- `d02c4c52` · ticket-status · `SES-378` · SES-378 slice 7 shipped as v7.0.517 (1658eaba) — all four staff-watch finding kinds now have callers — and the ticket s… · finalises Sep 21, 5:14 AM CST · `select public.reverse_decision('d02c4c52-bb18-489e-957a-fc212f65d63a','John','<why>');`
- `04059ba0` · rollback · — · Auto-rollback held: ci-red on 1658eab was not reverted (card-only) · finalises Sep 21, 5:14 AM CST · `select public.reverse_decision('04059ba0-b744-4341-9492-e52740a6db3b','John','<why>');`

**723 final this week, 0 reversed this week** — *this week* is a **rolling 7 days** back from the stamp, not a calendar week and not a Friday-07:00Z reset: no such weekly-reset helper exists in this file or anywhere in `scripts/`, so a rolling window is what is used and is labelled as one. A reversal is the strongest negative signal the ladder takes (`M6-07`), so the second number is the one to read first.

**Judgment classes** — *as of 2026-09-18 10:47Z (Sep 18, 5:47 AM CST).* What the corpus currently holds per pull test, live from `public.judgment_class_census` (`SES-84`; the same view `SES-159` reads). Ratification is a standing metric (John, 2026-08-23: a class is never finished being learned), never a finish line.

| class | ratified | proposed | rejected | total |
|---|---:|---:|---:|---:|
| `P1 - Improves John's Skills` | 7 | 31 | 6 | 44 |
| `P2 - Inventive` | 0 | 95 | 16 | 111 |
| `P3 - Investor Value` | 0 | 61 | 7 | 68 |
| `P4 - New Customers` | 1 | 37 | 3 | 41 |
| `neutral` | 0 | 83 | 30 | 113 |

- Newest proposed root claim for P1: *no proposed root claim*.
- Newest proposed root claim for P2: `VC-SYN-002` — Inventive features are the least-tested product goal because the bar John set — something competitors cannot easily copy — he has never applied to a real featu…
- Newest proposed root claim for P3: `VC-SYN-001` — Investor value is the least-defined product goal because nobody has yet said what an investor would check. The drafts agree on one reading: the buyer is a skep…
- Newest proposed root claim for P4: `VC-ROOT-004` — New features that win new customers. The bar is buy-pull — functionality that makes a customer say "I have to buy this." Administrative capability (accounts, b…

- **FLAG: 4 live claims still `unclassed`** — after `SES-84` this is zero by construction; a non-zero here is drift (a claim inserted without a classing decision) and needs one recorded decision, never a default.

**John-model** — *as of 2026-09-18 10:47Z (Sep 18, 5:47 AM CST).* How often a decision that leaned on a standing pattern of John's stood unreversed through its window, live from `public.john_model_signal` (`SES-004`; the criteria are `public.decision_patterns`, exported from `docs/JOHN-DECISION-PATTERNS.md`). A rate binds only from 30 finalised-or-reversed decisions (M7 gate, ruling iii).

- **99.4% agreement** over 180 finalised-or-reversed decisions (179 finalised unreversed, 1 reversed; 50 still open, 230 citing in total). A reversal is the strongest negative signal the ladder takes, so the second number is the one to read first.

| criterion | citing | final unreversed | reversed | open | rate |
|---|---:|---:|---:|---:|---:|
| `pattern:0` No standing pattern applied -- new judgment. | 89 | 46 | 0 | 43 | 100% |
| `pattern:137` P1–P4 are pull tests, not category labels — administrative expectations never q… | 76 | 76 | 0 | 0 | 100% |
| `pattern:85` Don't gate small, reversible calls on his approval — decide and flag. | 48 | 42 | 1 | 5 | 97.7% |
| `pattern:96` When a gap surfaces outside the session's scope, log it with its own ID rather… | 11 | 11 | 0 | 0 | — |
| `pattern:86` Process, tooling, and hygiene mechanics are fully delegated — decide and execut… | 9 | 8 | 0 | 1 | — |

- A per-pattern `—` is not a zero: that criterion has not reached 30 finalised-or-reversed citations of its own, so it carries counts and no rate.

**Invention in use** — *as of 2026-09-18 10:47Z (Sep 18, 5:47 AM CST).* Criterion 7 (`docs/SELFBUILD-CHARTER.md`): at least one platform-originated feature — the Bench Report Card judge (`LOG-143`) — is measurably used by real visitors, live from `public.report_card_usage`. Counts only, never a rate.

- **7d:** 0 judge runs, 0 by real visitors (0 distinct).
- **30d:** 3 judge runs, 0 by real visitors (0 distinct).
- **all:** 3 judge runs, 0 by real visitors (0 distinct).

- *no real-visitor use yet.*

**Board by served class** — *as of 2026-09-18 10:47Z (Sep 18, 5:47 AM CST).* Which class each open ticket SERVES under the served-class test (`VC-MISSION-033`), ruled by The Prioritizer's `classify-ticket` and stored on `backlog_items.supports_class` — a ticket's own class is a different question and is not restated here.

| serves | open tickets |
|---|---:|
| `P1 - Improves John's Skills` | 82 |
| `P2 - Inventive` | 25 |
| `P3 - Investor Value` | 5 |
| `P4 - New Customers` | 2 |
| `P7 - Agent Creation` | 1 |
| `P10 - Tooling` | 1 |
| *serves none* | 491 |

- *Negative ranks are John's own automation queue, seeded to sort ahead of anything assigned later (`SES-86`). The nightly re-rank writes 1..N and therefore sits below them — intended precedence, not a re-rank that failed.*

- **Top 5 by `automation_rank`:**
  -41. `SES-402` — The Development Manager makes the call on what a build finds: every Builder or Verifier f… *(serves P2 - Inventive)*
  -40. `SES-408` — The staff watch appends an environment fact: every filing the Development Manager classif… *(serves P10 - Tooling)*
  -38. `SES-397` — The Development Manager applies a Designer Knowledge edit itself when the same design mis… *(serves P2 - Inventive)*
  -35. `SES-288` — A schema-range red can never be auto-reverted: one refused down-migration disables rollba… *(serves none)*
  2. `SES-378` — The Development Manager takes the pick: step 5 asks GV-01 for the assignment (ticket, cap… *(serves P2 - Inventive)*

- Last scheduled re-rank: Sep 18, 1:44 AM CST.

**Governance agents, last 7 days** — *as of 2026-09-18 10:47Z (Sep 18, 5:47 AM CST).* Whether the platform's own agents (`agents.lane = 'governance'`) are doing the development work, live from `public.governance_agent_usage` and `public.ship_handoff_census` (`SES-360`). A **rolling 7 days** back from render time, like the decision counts above. Counts and token sums only, never a rate.

| role | source | calls | input tokens | output tokens |
|---|---|---:|---:|---:|
| Governance — Development Manager | `session` | 27 | 5614596 | 57444 |
| Governance — Researcher | `session` | 3 | 656000 | 59513 |
| Governance — Prioritizer | `session` | 11 | 254892 | 10144 |
| Governance — Prioritizer | *unlabelled* | 481 (481 untokened) | 0 | 0 |
| Governance — Designer | `session` | 55 | 154581124 | 860298 |
| Governance — Builder | `session` | 44 | 130097532 | 627096 |
| Governance — Verifier | `mcp` | 3 | 28992 | 18874 |
| Governance — Verifier | `script` | 11 | 175325 | 79690 |
| Governance — Auditor | `session` | 24 | 2130338 | 195403 |
| Governance — Ticket Owner | `session` | 3 | 0 | 0 |

- **Ships with all four handoff rows: 16 of 44** ships in the window (`SES-345`'s four: `automation_rank`, `kickoff_link`, a per-ticket push sha, a verdict row). Missing per leg: kickoff_link 4, per-ticket sha 20, automation_rank 10, verdict 0.
- *unlabelled* is a NULL `call_source` — the pre-attribution unknown, never read as automation (`LOG-128`); `untokened` rows carry no token counts at all (deterministic handler rows), so a large call count beside a small token sum is that, not a cheap model.

**Auditor's ledger** — *as of 2026-09-18 10:47Z (Sep 18, 5:47 AM CST).* What `public.audit_findings` (`AGT-70`) holds and what has left it for the board. Counts only, never a rate. Latest week 2026-W37: **6 findings (4 open · 2 resolved · 0 not a defect)** — **0 ruled** open findings (a ruled, open, `high` row is what `tripwire-to-backlog.js --from-ledger` files, at most 3 per ISO week); **0 filed** to the board from the ledger so far (`source_file = 'audit-ledger'`).

| fingerprint | kind | confidence | fact | ruled |
|---|---|---|---|---|
| `4637961d21e1076a` | contradiction | high | the order of the board's ranking keys | — |
| `4ef228c361f9a904` | stale-or-irrelevant | high | temperature stored for a model whose API rejects temperature | — |
| `b057c6f102845074` | stale-or-irrelevant | high | whether the Selfbuild has started executing | — |
| `e141f20a37d1fbe9` | contradiction | high | the runner's scheduling interval in hours | — |

- *A finding leaves this table only by John's ruling — `resolved`, `not-a-defect`, or ruled and left `open` to file. Candidates a run found but nobody ingested live in `docs/audits/<week>-candidates.json`, not here.*

**Ticket hygiene, last night** — *as of 2026-09-18 10:47Z (Sep 18, 5:47 AM CST).* What the Ticket Owner (`AGT-79`) left on the board: `public.ticket_owner_findings` open rows by check, the newest `hygiene` decision and the newest nightly cycle row. Counts only, never a rate. **318 open findings** across 9 check(s).

| check | open | oldest | nights open |
|---|---:|---|---:|
| `remainder-stranded` | 88 | Sep 18, 5:38 AM CST | 0 |
| `actual-unknown` | 80 | Sep 12, 10:31 PM CST | 5 |
| `designed-closed` | 49 | Sep 12, 10:31 PM CST | 5 |
| `verdict-missing` | 42 | Sep 12, 10:31 PM CST | 5 |
| `size-missing` | 23 | Sep 12, 10:31 PM CST | 5 |
| `delivered-unaccepted` | 15 | Sep 12, 10:31 PM CST | 5 |
| `type-off-taxonomy` | 13 | Sep 12, 10:31 PM CST | 5 |
| `quote-missing` | 6 | Sep 12, 10:31 PM CST | 5 |
| `cycles-over-quote` | 2 | Sep 12, 10:31 PM CST | 5 |

- Last run: `5053ed33` · shipped · Sep 18, 5:42 AM CST · 891 rows · 318 findings (0 derivable · 318 judgment) · behind the fences: quote 525 · size 493 · cost 45 · verdict 97 · unrevalidated>30d 426 · attended-actual null 284 · fixed 0 · findings +109 ~209 −0 · no decision (nothing to fix) · judged 0/0/0 on claude-fable-5-1
- Judgment: **the newest night was judged** — 0 unjudged nights on top, over the newest 6 on record.
- Decision `1545e15c` · open · Ticket Owner: 2 derivable cell fix(es) on 2 row(s) — cost 2 · claim 0 · type 0 · finalises Sep 21, 1:48 AM CST · `select public.reverse_decision('1545e15c-b745-484f-945c-87003c329d9d','John','<why>');`

**Staff watch** — *as of 2026-09-18 10:47Z (Sep 18, 5:47 AM CST).* What the Development Manager (`SES-378`) recorded about the runner's own agents: `public.runner_staff_findings` rows per `agent_id`, with the distinct fingerprints and the distinct CYCLES behind them. Counts only, never a rate. **3 finding(s)** across 2 agent(s).

| agent | findings | distinct fingerprints | distinct cycles | newest |
|---|---:|---:|---:|---|
| `designer` | 2 | 2 | 2 | Sep 18, 5:09 AM CST |
| `devmanager` | 1 | 1 | 1 | Sep 16, 8:50 AM CST |

**Human gates** — *as of 2026-09-18 10:47Z (Sep 18, 5:47 AM CST).* The two reads that say whether anything is waiting on a human: open `backlog_items` carrying `design_status = 'needs-john'`, and `gated_before_build` `runner_items` left with `decision IS NULL` (`M6-01`). Board state, written by no code in this repo — which is why it is REPORTED here and not asserted as a gate by the regression suite. **0 open `needs-john` ticket(s)**, **7 undecided `gated_before_build` card(s)**.

- **Undecided gated cards (7):** `449826c5-7d9e-46ea-80df-ce8785adeaa8`, `ba7390e0-f506-4269-be1b-990e792528a1`, `2d5441c7-5133-4b21-9768-7921dce0c409`, `82f5dfba-f775-413a-9a85-f8b3a435b79d`, `52c9e635-dade-4cc0-8c84-490d8a63b99c` …and 2 more
- *Open is not wrong.* A card nobody has answered yet is a real board state; what it is NOT is a regression, so nothing in the suite goes red for it.

*Provenance: 932 board rows, payload `sha256:a72e98f74a007fa8`, as of 2026-09-18 10:47Z (Sep 18, 5:47 AM CST). The stamp says when this was last read; the sha says whether it still matches the tables. `--check` compares the sha, never the stamp — a refreshed stamp over identical facts is not drift.*
<!-- END GENERATED — scripts/render-standing-brief.js -->

**Next session:** none required — the runner is live and works **John's automation queue** (canonical: `docs/RUNNER-GOV-0820-REQUIREMENTS.md`): the queue is the board's leading sort key, not a list to read (`automation_rank`, v7.0.133) — `ORDER BY queue` already honours it. Classes are always written named, **`P1 - Improves John's Skills` → `P10 - Tooling`**; outcomes as plain words (“did not run”, “gated before build”); budget is two-track (API dollars + token governor). John judges from the briefing page. Runner pause: disable `deepbench-runner` at claude.ai/code/routines. **Board census measured 2026-08-23T12:5xZ by runner cycle `363b5138`, taken from the board after its own close-out recompute rather than carried forward:** **561 open tickets, 561 numbered, 0 open-but-unnumbered**, 611 rows total, **the standing Automation drain now has a FIXED finish line** — from `v7.0.179` (`SES-142`) it works the **18 members John named** on directive `b74009ea`, stored as `runner_drain_scope` FK rows, and a ticket filed into the epic *after* that naming **never joins it**: it queues normally and waits for him. The live `now` tier had already drifted to 19 against his 18. `drain_epic_next()` retires when those 18 are `done`/`removed`, and returns the new outcome **`unscoped`** — never a live-tier fallback — for any future drain declared without a list. Queue/drain state as of **v7.0.196** (2026-08-23 ~17:00Z, `successional-review` close-out, 561 rows renumbered): `SES-140` — *the successor fire is refused by the platform* and `SES-151` — *the scheduler runs on John's clock grid* are both **`done`**; the drain's nearest open member `SES-84` — *the vision corpus* (`needs-john`) waits on John's briefing decisions, so cycles step past it (`SES-114`) and work the board (`SES-121` — *shrink the `.claude/`-mutable surface* went `done` at v7.0.198; procedure text now lives in `docs/runbooks/`, cycle-writable). **The board's `title` column is trustworthy for display for the first time** (`SES-91`, v7.0.177): 98 rows that held a bare priority-class string now carry a real authored title, and the only `^P[0-9]+ - ` title left is `ADM-1`, whose title is a real sentence behind a stale class prefix and is deliberately left for `SES-117` to **accommodate** rather than repair. `SES-119` is now `done` (v7.0.184 + v7.0.185): the briefing renders `public.backlog_display_title(title, description)` rather than the read-time `gist` workaround, and **`runner-cycle.md`'s Language block now requires a ticket's title wherever John reads its ID**. Step 5's `gist` expression deliberately stays — it is still correct for any future row filed the old way, and 50 of 562 open numbered tickets still fall back to it. **From v7.0.195 the chain runs IN-SESSION (`SES-140` FINAL)** — a cycle that actually ran one (`shipped`/`gated_before_build`/`reverted`) and whose drain still returns `pick` opens its next `runner_cycles` row (trigger `chained (drain continuation)`) **in the same session** and re-enters the runbook at step 1; session-spawning is retired as platform-unsupported (`runner-cycle.md` tail step (8) carries the evidence). A **wall-stopped cycle continues nothing**, which keeps the budget wall a brake rather than a metronome. Proven live 2026-08-23: cycles `1fcd687e` → `a11c94d2`, the first chained row in the runner's life. **The briefing-redesign epic is finished** — `SES-129`, its last member, shipped in cycle `ed1a5eb3`. **A new filing rule binds from this version:** `runner_items.backlog_id` takes a **bare** ticket id or NULL and is enforced by `ck_runner_items_backlog_id_bare`; the display string belongs in `display_ref`, and the briefing's id chip reads `coalesce(backlog_id, display_ref)` (`SES-116`, v7.0.174 — `runner-cycle.md` step 9). **`design_status` reads for selection (`SES-114`, v7.0.165); among OPEN tickets measured at the v7.0.198 close-out:** 16 `designed` (incl. `SES-101`, flipped from `needs-desktop` — its one remaining edit now lives in `docs/runbooks/session-setup.md` step 3c, cycle-writable), **0 `needs-desktop`**, **1 `needs-john`** (`SES-84`), 546 `NULL` = not yet triaged, deliberately not guessed to `auto`. Measured at the v7.0.198 close-out: **11 of John's 18 named members remain open** (`SES-121` retired from the list by going `done` this session); the only `needs-john` member is `SES-84` — the rest are buildable, the drain reaches them and can retire on them. **`CHI-89`** still holds its queue slot with its removal card undecided — visible to John and skipped by cycles, exactly as `SES-113` intended. **`SES-133` is still open at `partial`** — the other half of John's 2026-08-23 emergencies directive; it sits at queue 251 rather than at the top, because the drain reads the Automation epic's `now` tier in queue order and `SES-133` is not in that epic. **From v7.0.182 John's own switches govern the cadence** (`SES-143`): the briefing's **§2b Automation panel** carries a scheduler checkbox + an every-N-hours box (live values: **on, 3 hours** — John's order 2026-08-23: the runner runs at **12/3/6/9 on his clock**, `SES-151`) and a drain checkbox, and `runner-cycle.md`'s **new step 1b** calls `public.scheduler_gate()` before anything else — a scheduled cycle arriving early closes `did_not_run` with *"paced by your scheduler setting"*, and with the scheduler off it closes *"scheduler off"*. **The cron stays hourly permanently by design** — a cycle cannot edit its own routine — and **from v7.0.196 (`SES-151`) the gate paces by John's clock grid**: a scheduled fire runs iff its row's `started_at` falls in an America/Chicago hour divisible by `interval_hours` (3 → **12/3/6/9 AM/PM his clock**, DST-proof; the mixed-clock elapsed test that wrongly paced 3 of 9 hourly fires is dead, `q-hourly-interval-boundary` answered by ship). Two consequences worth knowing before reading a quiet night as a stall: the gate **fails open** on every unknown, and it governs **scheduled** fires only, so a standing drain's chained continuation cycles run regardless — while the Automation drain stands, **the chain and not the interval is what actually sets the pace**. A manual fire (off the cron grid) is never paced; whether that is what John wants is the one thing the spec leaves open, asked as `q-manual-fire-pacing`. **From v7.0.188 that gate actually fires** (`SES-146`): until then `scheduler_gate()` matched the trigger by exact equality against the bare word `scheduled`, so a cycle passing the verbatim line step 1b asks for — `trigger: scheduled` — fell through to *"not a scheduled cycle"* and skipped **both** the pacing branch and the `scheduler_on = false` branch, and the grid test compared `now()`-at-step-1b rather than the fire time against a hardcoded ±2. Both failed open, so the panel looked live and bound nothing. The trigger is now normalised, the grid is anchored to the cycle row's own `started_at`, and the tolerance is the column `runner_settings.grid_tolerance_min` (10). **Silence is not a “no”** on any open question. **From v7.0.183 the board's open status is `open`, never `missing`** (`SES-118`): `backlog_items_status_check` now allows exactly `('open','partial','done','removal proposed','removed')` and the retired value raises `23514` — 510 rows renamed, `updated_at` deliberately untouched so step 8c's 30-day revalidation sweep still sees the sinking tail. **That consequence closed at v7.0.189** (attended session `ses118-gated`, 2026-08-23): step 3c's INSERT now writes `'open'`, zero `'missing'` literals remain under `.claude/`, and `SES-118` is `done` — its gated card `76564dde` awaits John's decision on the briefing page.
