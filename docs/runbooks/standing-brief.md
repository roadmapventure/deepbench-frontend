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
## Live board state — generated, do not hand-edit — *as of 2026-09-29 17:40Z (Sep 29, 12:40 PM CST)*

> Rendered from the tables by `scripts/render-standing-brief.js` at every ship. **Every number below is derived; nothing here is maintained by hand.** The judgment prose beneath this block is the opposite — hand-maintained, deliberately, and this script never writes outside these markers. Where the two disagree about a number, this block is right and the sentence below is stale: say so rather than reconciling them by hand.

**Board census** — *as of 2026-09-29 17:40Z (Sep 29, 12:40 PM CST).* **666 open tickets**, 641 numbered, **25 open-but-unnumbered**, 1000 rows total.

| `status` | rows | share of board |
|---|---:|---:|
| `open` | 489 | 48.9% |
| `done` | 256 | 25.6% |
| `delivered` | 97 | 9.7% |
| `removed` | 78 | 7.8% |
| `partial` | 45 | 4.5% |
| `removal proposed` | 35 | 3.5% |

**`design_status` among OPEN tickets** — *as of 2026-09-29 17:40Z (Sep 29, 12:40 PM CST).* Reads for selection (`SES-114`); `NULL` is *not* `auto`, it is not-yet-triaged and no cycle may backfill it.

| `design_status` | open rows | selection effect |
|---|---:|---|
| `NULL` | 597 | full ceremony — not yet triaged |
| `needs-decision` | 34 | — |
| `designed` | 23 | **not a skip** — build from `kickoff_link` (step 6 fast path) |
| `needs-desktop` | 11 | skipped, `record_skip()` — needs a session John attends (B39) |
| `needs-john` | 1 | skipped, `record_skip()` — John decides on a card |

**Scheduler and automation settings** — *as of 2026-09-29 17:40Z (Sep 29, 12:40 PM CST).* §2b of the briefing, John's own switches, binding via `scheduler_gate()` at step 1b:

- Scheduler: **on**, every **1 hour** on John's clock grid (America/Chicago hours divisible by the interval — `SES-151`, DST-proof).
- Cron minute **40**, manual-fire tolerance **±10 min** (a start outside it is treated as a manual fire and is never paced).
- Standing daily max: **196M tokens**. This is rung 3 of five, **below** the 48h stale floor: a standing number must not defeat the staleness brake.

**Standing epic drain** — *as of 2026-09-29 17:40Z (Sep 29, 12:40 PM CST).* Created only by John; the runner may read one, never write one (`drain_epic_next()` property 5). The finish line is drawn from the members he **named** (`runner_drain_scope`), never the live `now` tier (`SES-142`) — and within that list it is the members a milestone **gate ruled required** (`milestone_required`, `SES-310`) whenever the list carries such a ruling, every named member otherwise.

- **No drain standing.** Selection is the class-sorted board exactly as it is with no drain declared.

**Proposed projects** — *as of 2026-09-29 17:40Z (Sep 29, 12:40 PM CST).* A project whose batch finished proposes the next one (`AGT-240`): The Auditor grades what it built, The Development Manager proposes ONE project with its tickets and why. Its tickets are normal backlog rows the runner does not pick until you say yes. **0 proposed.**

- **None** — a measured none: no finished batch has proposed a project.

**Open decisions** — *as of 2026-09-29 17:40Z (Sep 29, 12:40 PM CST).* Decisions made under `M6-02` that are still inside their reversal window (`runner_settings.reversal_window_hours` = 72h). Silence finalises them; to reverse one, run the line beside it (`docs/runbooks/session-setup.md` § Reversing a decision).

- `03d69f32` · ticket-status · `AGT-145` · Close-out: AGT-145 settles 'delivered' · finalises Sep 29, 2:38 PM CST · `select public.reverse_decision('03d69f32-751e-47f8-a46e-bc9fe7373dcf','John','<why>');`
- `7c1567d8` · filing · — · Audit review 2026-W39: 75 findings → 20 tickets, 2 not-a-defect, 0 carried, 4 escalated · finalises Sep 29, 3:03 PM CST · `select public.reverse_decision('7c1567d8-3727-404b-b0d4-8cba29c85c0b','John','<why>');`
- `2692714e` · ticket-status · `AGT-168` · Close-out: AGT-168 settles 'partial' · finalises Sep 29, 3:41 PM CST · `select public.reverse_decision('2692714e-ffe4-4365-9974-1d8abe26c466','John','<why>');`
- `6d04a37d` · filing · — · Audit review 2026-W39: 6 findings → 3 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 29, 4:02 PM CST · `select public.reverse_decision('6d04a37d-bf66-426e-bf70-4be8e40d3b12','John','<why>');`
- `f3f53648` · ticket-status · `AGT-168` · Close-out: AGT-168 settles 'partial' · finalises Sep 29, 5:18 PM CST · `select public.reverse_decision('f3f53648-e97d-410d-891e-997019711801','John','<why>');`
- `ae46811d` · filing · — · Audit review 2026-W39: 6 findings → 2 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 29, 5:36 PM CST · `select public.reverse_decision('ae46811d-7230-4c3b-9d89-df5cfa6021e6','John','<why>');`
- `6061338e` · ticket-status · `AGT-168` · Close-out: AGT-168 settles 'partial' · finalises Sep 29, 6:15 PM CST · `select public.reverse_decision('6061338e-f433-4d25-82d0-54c58d83c05d','John','<why>');`
- `6cd4e798` · filing · — · Audit review 2026-W39: 3 findings → 0 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 29, 6:30 PM CST · `select public.reverse_decision('6cd4e798-712d-44a3-a196-196c3992f1bb','John','<why>');`
- `440b7633` · ticket-status · `AGT-170` · Close-out: AGT-170 settles 'partial' · finalises Sep 29, 6:38 PM CST · `select public.reverse_decision('440b7633-f9bf-4178-b0d2-635de52f74cb','John','<why>');`
- `bbfab41e` · filing · — · Audit review 2026-W39: 3 findings → 0 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 29, 7:04 PM CST · `select public.reverse_decision('bbfab41e-3bba-4a3c-9326-886c260d9602','John','<why>');`
- `af072c46` · ticket-status · `AGT-168` · Close-out: AGT-168 settles 'partial' · finalises Sep 29, 7:08 PM CST · `select public.reverse_decision('af072c46-1be7-4fdf-8b67-cc063ca5579c','John','<why>');`
- `f87fdd2d` · filing · — · Audit review 2026-W39: 3 findings → 0 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 29, 7:21 PM CST · `select public.reverse_decision('f87fdd2d-b115-4f95-a69c-1f43a950e185','John','<why>');`
- `01b9642c` · ticket-status · `AGT-168` · Close-out: AGT-168 settles 'partial' · finalises Sep 29, 8:02 PM CST · `select public.reverse_decision('01b9642c-a2eb-42d4-849b-e78e6fa5c752','John','<why>');`
- `b22a122c` · filing · — · Audit review 2026-W39: 6 findings → 2 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 29, 8:18 PM CST · `select public.reverse_decision('b22a122c-d21f-4516-ba68-0ca6593cbc1c','John','<why>');`
- `54e72f83` · ticket-status · `AGT-170` · Close-out: AGT-170 settles 'partial' · finalises Sep 29, 8:23 PM CST · `select public.reverse_decision('54e72f83-0d7f-4720-aa1a-36db1be8dc57','John','<why>');`
- `6f32052a` · ticket-status · `AGT-172` · Close-out: AGT-172 settles 'delivered' · finalises Sep 29, 8:48 PM CST · `select public.reverse_decision('6f32052a-52b2-4cf8-a946-58a185b403bf','John','<why>');`
- `2179723b` · ticket-status · `AGT-168` · Close-out: AGT-168 settles 'partial' · finalises Sep 29, 8:57 PM CST · `select public.reverse_decision('2179723b-eed4-47a2-8c93-cf2cda255fc4','John','<why>');`
- `35bf4496` · filing · — · Audit review 2026-W39: 7 findings → 2 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 29, 9:05 PM CST · `select public.reverse_decision('35bf4496-cdaa-4ffe-8737-f907626fa7e3','John','<why>');`
- `e37fa37d` · filing · — · Audit review 2026-W39: 5 findings → 0 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 29, 9:14 PM CST · `select public.reverse_decision('e37fa37d-3384-43f7-83d9-f6d733f893e4','John','<why>');`
- `e5daba52` · ticket-status · `AGT-174` · Close-out: AGT-174 settles 'delivered' · finalises Sep 29, 9:43 PM CST · `select public.reverse_decision('e5daba52-b887-4404-8b4d-8691ed7776ac','John','<why>');`
- `0779bff3` · removal-proposal · `AGT-178` · AGT-178 premise is dead: the constraint it is about does not exist, none of the 27 rows is on a live worklist, and a ru… · finalises Sep 29, 9:47 PM CST · `select public.reverse_decision('0779bff3-1b5f-49b1-b808-47093ec0a1cc','John','<why>');`
- `3b9c5986` · ticket-status · `AGT-176` · Close-out: AGT-176 settles 'partial' · finalises Sep 29, 10:02 PM CST · `select public.reverse_decision('3b9c5986-704d-4cb1-893f-a4a3b6508ef9','John','<why>');`
- `addd8b4e` · ticket-status · `AGT-180` · Close-out: AGT-180 settles 'delivered' · finalises Sep 29, 10:23 PM CST · `select public.reverse_decision('addd8b4e-cff2-43e1-a4c2-0ef87e21f691','John','<why>');`
- `d52b6b85` · agent-row · `AGT-183` · AGT-183: re-pin dm-knowledge-cycle-card ca71a87ec822eb9a → 9894a9f4f1698214 · finalises Sep 29, 10:33 PM CST · `select public.reverse_decision('d52b6b85-c38a-43d7-acec-aac1084637a7','John','<why>');`
- `244aa0d7` · filing · — · Audit review 2026-W39: 15 findings → 6 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 29, 10:40 PM CST · `select public.reverse_decision('244aa0d7-d5f3-4ad6-bbea-7b823086add2','John','<why>');`
- `dfb51134` · ticket-status · `AGT-176` · Close-out: AGT-176 settles 'delivered' · finalises Sep 29, 10:50 PM CST · `select public.reverse_decision('dfb51134-6fd9-4020-a6bc-d9c2d9fe194e','John','<why>');`
- `bb2951d6` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=no-calls · finalises Sep 29, 10:50 PM CST · `select public.reverse_decision('bb2951d6-4120-42d3-8465-053932c6b700','John','<why>');`
- `10b12453` · ticket-scope · `AGT-187` · AGT-187 ships part (a) only — the kickoff-green attestation in scripts/verifier.js — and rules part (b)'s fifth staff-w… · finalises Sep 29, 11:02 PM CST · `select public.reverse_decision('10b12453-90be-453e-9691-031a5306a373','John','<why>');`
- `f15015b7` · ticket-status · `AGT-183` · Close-out: AGT-183 settles 'partial' · finalises Sep 29, 11:11 PM CST · `select public.reverse_decision('f15015b7-08dd-4050-8721-5cb3d31a76b9','John','<why>');`
- `fd672cca` · ticket-status · `AGT-187` · Close-out: AGT-187 settles 'delivered' · finalises Sep 29, 11:44 PM CST · `select public.reverse_decision('fd672cca-0f60-466f-a01a-5e5a147eda59','John','<why>');`
- `9ed5b106` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Sep 29, 11:44 PM CST · `select public.reverse_decision('9ed5b106-e976-45c1-9f6f-772dadd2651a','John','<why>');`
- `412e3205` · ticket-status · `AGT-184` · Close-out: AGT-184 settles 'delivered' · finalises Sep 29, 11:45 PM CST · `select public.reverse_decision('412e3205-6e85-4e57-ab48-330484ab37a2','John','<why>');`
- `fe78eba9` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Sep 29, 11:45 PM CST · `select public.reverse_decision('fe78eba9-d159-4bbd-81b9-db396fa327e0','John','<why>');`
- `f65918c0` · gate · `AGT-191` · Captured, not fixed now: run-project.js refuses its own cycle's claim and blames a peer that does not exist. · finalises Sep 29, 11:54 PM CST · `select public.reverse_decision('f65918c0-5c9a-40a6-abfa-7617441dc1e4','John','<why>');`
- `dcdf9026` · ticket-scope · `AGT-191` · AGT-191 is scoped to three files and four tasks: key the ledger's ship-card map on cycle_id, assert bullet provenance b… · finalises Sep 30, 12:04 AM CST · `select public.reverse_decision('dcdf9026-2506-4981-b567-1919bcb842e5','John','<why>');`
- **46 ticket-status decisions** finalising Sep 30, 12:14 AM CST → Sep 30, 11:59 PM CST · one batch, listed by query rather than one line each: `select id, backlog_id, summary, expires_at from public.runner_decisions where status='open' and kind='ticket-status' order by expires_at;` · reverse any one with `select public.reverse_decision('<id>','John','<why>');`
- **35 resolve decisions** finalising Sep 30, 12:14 AM CST → Sep 30, 11:59 PM CST · one batch, listed by query rather than one line each: `select id, backlog_id, summary, expires_at from public.runner_decisions where status='open' and kind='resolve' order by expires_at;` · reverse any one with `select public.reverse_decision('<id>','John','<why>');`
- `20fdce09` · filing · — · Audit review 2026-W39: 20 findings → 6 tickets, 0 not-a-defect, 0 carried, 1 escalated · finalises Sep 30, 12:23 AM CST · `select public.reverse_decision('20fdce09-e8c3-4fa0-9178-1a5d50d71693','John','<why>');`
- `f91e50d3` · learning · `SES-159` · class-loop learning claims for P3 - Investor Value · finalises Sep 30, 12:43 AM CST · `select public.reverse_decision('f91e50d3-eda6-4b11-9045-2ce31944223f','John','<why>');`
- `94e451d9` · classification · — · board ordered: 40 ticket(s) given an automation_rank · finalises Sep 30, 12:54 AM CST · `select public.reverse_decision('94e451d9-5842-4c64-af66-cfbd96bccb33','John','<why>');`
- `2a648167` · hygiene · `AGT-79` · Ticket Owner: 23 derivable cell fix(es) on 17 row(s) — cost 6 · claim 17 · type 0 · finalises Sep 30, 12:54 AM CST · `select public.reverse_decision('2a648167-8a2d-4761-9cc6-61b458a8a994','John','<why>');`
- `33b26422` · ticket-scope · `AGT-196` · AGT-196 is scoped to the scanner itself — the allowlist reason path, the vercel_bypass capture, a new guard asserting b… · finalises Sep 30, 1:14 AM CST · `select public.reverse_decision('33b26422-8f71-419c-87d2-3410842670f0','John','<why>');`
- `c0834ca4` · learning · `SES-159` · class-loop learning claims for P3 - Investor Value · finalises Sep 30, 1:38 AM CST · `select public.reverse_decision('c0834ca4-578e-4378-a9d3-caf9127902bb','John','<why>');`
- `8354a368` · ticket-scope · `AGT-196` · Corrected the purge counts on the undecided AGT-168 card faca2a75 from measurement: 46 files becomes 42 in three places… · finalises Sep 30, 1:46 AM CST · `select public.reverse_decision('8354a368-2b2f-4db2-a602-b9f9a85e274d','John','<why>');`
- `c6452393` · removal · `AGT-200` · AGT-200 removal proposed: its premise is dead — the missing constraint is a recorded drop by a later migration, not a s… · finalises Sep 30, 1:57 AM CST · `select public.reverse_decision('c6452393-c05b-4ebd-a1ba-1f421663cde8','John','<why>');`
- `fb3a5c02` · filing · — · Audit review 2026-W39: 8 findings → 2 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 30, 2:05 AM CST · `select public.reverse_decision('fb3a5c02-8100-4d82-a08e-bb300c65d07e','John','<why>');`
- `a3222898` · ticket-scope · `AGT-199` · AGT-199 ships half (1) only: a pure shipCardFinding() in the renderer, wired non-gating into the verifier, with a guard… · finalises Sep 30, 2:11 AM CST · `select public.reverse_decision('a3222898-1f68-4360-a4e3-fdaad70b1372','John','<why>');`
- `d7beb8cb` · rollback · — · Auto-rollback held: ci-red on 9cbb621 was not reverted (card-only) · finalises Sep 30, 3:00 AM CST · `select public.reverse_decision('d7beb8cb-e54c-4269-9197-ee0302a16ded','John','<why>');`
- **22 agent-row decisions** finalising Sep 30, 3:17 AM CST → Sep 30, 8:57 PM CST · one batch, listed by query rather than one line each: `select id, backlog_id, summary, expires_at from public.runner_decisions where status='open' and kind='agent-row' order by expires_at;` · reverse any one with `select public.reverse_decision('<id>','John','<why>');`
- `66d006e6` · ticket-scope · `AGT-166` · AGT-166 is scoped as slice 1 of a board burn-down: two migrations, the audit's own pagination bug, three guard files, a… · finalises Sep 30, 3:23 AM CST · `select public.reverse_decision('66d006e6-856a-420c-aeab-646b2dad8e32','John','<why>');`
- `929e4c24` · hygiene · — · AGT-166: 546 homeless open/partial rows homed to Backlog Intake by ID prefix · finalises Sep 30, 3:29 AM CST · `select public.reverse_decision('929e4c24-19d1-4e55-a82c-6397e0f64a97','John','<why>');`
- `8aa6bca4` · rollback · — · Auto-rollback held: ci-red on d0dd792 was not reverted (card-only) · finalises Sep 30, 3:43 AM CST · `select public.reverse_decision('8aa6bca4-4e6b-4189-bbf3-bbc3dae3b133','John','<why>');`
- `8f00db55` · filing · — · Audit review 2026-W39: 18 findings → 7 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 30, 4:07 AM CST · `select public.reverse_decision('8f00db55-8078-4c0c-a70d-d4c2933a7dd9','John','<why>');`
- `675e8812` · gate · `AGT-171` · Withdrew my own gated_before_build card 19acc2ab: the over-cap refusal it recorded was measured against a draft, and th… · finalises Sep 30, 4:54 AM CST · `select public.reverse_decision('675e8812-5b2b-4281-a5ca-b3b407bbb6ab','John','<why>');`
- `772bb3b8` · ticket-scope · `AGT-166` · Slice 2 of 2 is scoped as the Ticket Owner's thirteenth check plus its batch fence and judge-answer write path — four f… · finalises Sep 30, 5:00 AM CST · `select public.reverse_decision('772bb3b8-960f-43e6-ae8f-93c2fb8f9e1c','John','<why>');`
- `4df45c61` · removal · `SES-378` · SES-378 removed: its 8 slices shipped (v7.0.488 -> v7.0.517) and SES-424 succeeds it by name · finalises Sep 30, 5:00 AM CST · `select public.reverse_decision('4df45c61-649b-4a0a-94e1-baa7dcbe4f69','John','<why>');`
- `fe5a84e1` · governance · `AGT-167` · OD-21 amended: chain_max_noship_streak now bounds the per-chain streak AND lane (c)'s per-ticket fence · finalises Sep 30, 5:01 AM CST · `select public.reverse_decision('fe5a84e1-efc6-4ec6-89be-dc304a0c9e01','John','<why>');`
- `4719da74` · rollback · — · Auto-rollback held: ci-red on c79c273 was not reverted (card-only) · finalises Sep 30, 5:57 AM CST · `select public.reverse_decision('4719da74-386c-4706-aba9-c0a8b77e86be','John','<why>');`
- `543117e3` · ticket-scope · `AGT-179` · AGT-179 is scoped to four tasks: record SES-418's disposition on its own row under one decision, declare the lockstep t… · finalises Sep 30, 6:02 AM CST · `select public.reverse_decision('543117e3-0005-4a5f-8d56-bed95e104c46','John','<why>');`
- `346e12d8` · filing · `AGT-223` · AGT-179 task 4: files the work-quality audit's false ship-summary attribution as its own row -- AGT-179's own "replace… · finalises Sep 30, 6:11 AM CST · `select public.reverse_decision('346e12d8-774f-42f0-a03d-2d965d7e4612','John','<why>');`
- `b9fcb131` · filing · — · Audit review 2026-W39: 26 findings → 9 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 30, 6:32 AM CST · `select public.reverse_decision('b9fcb131-8761-4cf4-8055-3d9d29a4a1f7','John','<why>');`
- `78fd1597` · filing · — · Audit review 2026-W39: 7 findings → 2 tickets, 0 not-a-defect, 0 carried, 1 escalated · finalises Sep 30, 6:56 AM CST · `select public.reverse_decision('78fd1597-6165-4854-95f2-d49e6e324606','John','<why>');`
- `0adc9f26` · ticket-scope · `AGT-185` · AGT-185 is scoped to stop the flat 3/4 pair travelling: the numbers never conflicted, so the fix is the runbook's dupli… · finalises Sep 30, 7:06 AM CST · `select public.reverse_decision('0adc9f26-795a-44df-bee9-ba47a020ef8d','John','<why>');`
- `afe09f98` · governance · `AGT-181` · AGT-181: three row corrections under one handle — runner_items 0f29c005 before_after 10,561 -> 10,763 bytes; governance… · finalises Sep 30, 7:14 AM CST · `select public.reverse_decision('afe09f98-cc64-4087-a61f-6a5b1c3221cd','John','<why>');`
- `e0bd5ebe` · filing · — · Audit review 2026-W39: 5 findings → 1 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 30, 7:52 AM CST · `select public.reverse_decision('e0bd5ebe-37ab-4fb5-9965-5d6bd29922fd','John','<why>');`
- `bfd04abf` · gate · — · Gate cards ruled by cycle d12643db-499a-40ab-9075-e59b227bf575: 11 card(s) — {"john": 1, "accept": 3, "rework": 5, "ret… · finalises Sep 30, 8:00 AM CST · `select public.reverse_decision('bfd04abf-9413-4a6d-bb61-bb4c63e84868','John','<why>');`
- `acbeb08b` · design-kickoff · `AGT-173` · AGT-173 — kickoff v7.0.652 pinned and design_status set to designed (R3+R4) · finalises Sep 30, 8:16 AM CST · `select public.reverse_decision('acbeb08b-6f01-4376-a53b-89c428e7fabd','John','<why>');`
- `4ac223d0` · ticket-scope · `AGT-188` · AGT-188 is scoped to the two live halves — a cycle identity on the briefing build and a derived tail last_step — with b… · finalises Sep 30, 8:24 AM CST · `select public.reverse_decision('4ac223d0-18d5-4784-960d-66da936b23f4','John','<why>');`
- `ef59daaa` · ticket-scope · `AGT-116` · Inventoried three more live-world-grading regression instances on AGT-116 (SES-177, SES-261, agt-133 arm D) rather than… · finalises Sep 30, 9:41 AM CST · `select public.reverse_decision('ef59daaa-1e35-4910-b746-cbcc779c0221','John','<why>');`
- `f960b347` · removal · `ZFIX-42435609` · Leaked regression fixture removed from the pickable set: ZFIX-42435609 · finalises Sep 30, 10:58 AM CST · `select public.reverse_decision('f960b347-8710-49d6-bec7-2747fe4b4f74','John','<why>');`
- `151cb154` · ticket-scope · `AGT-112` · Recorded a live recurrence of the cycle-card Knowledge drift on AGT-112: two cycles re-pinned the row six minutes apart… · finalises Sep 30, 11:48 AM CST · `select public.reverse_decision('151cb154-06f3-4a9e-b3c3-8fd487cc191b','John','<why>');`
- `89e91a55` · design-kickoff · `AGT-116` · Kickoff designed for AGT-116 · finalises Sep 30, 12:47 PM CST · `select public.reverse_decision('89e91a55-8c1c-45f0-9790-b56acc76ccf5','John','<why>');`
- `4036456d` · filing · — · Audit review 2026-W39: 8 findings → 4 tickets, 0 not-a-defect, 0 carried, 3 escalated · finalises Sep 30, 1:08 PM CST · `select public.reverse_decision('4036456d-cc91-4c0a-8e08-23114198f209','John','<why>');`
- `312cbadd` · ship · `AGT-116` · AGT-116 delivered: the suite gives the same answer three times · finalises Sep 30, 1:38 PM CST · `select public.reverse_decision('312cbadd-b0ea-473e-a882-eb024c112c47','John','<why>');`
- `0fd4999f` · design-kickoff · `AGT-237` · Kickoff designed for AGT-237 · finalises Sep 30, 1:38 PM CST · `select public.reverse_decision('0fd4999f-05e5-4bfa-9221-c5c67fe4bf50','John','<why>');`
- `24672af4` · john-ruling · `AGT-170` · John approves arming AGT-170 delta grading now · finalises Sep 30, 1:48 PM CST · `select public.reverse_decision('24672af4-e969-407f-8207-40eb2503976a','John','<why>');`
- `919ea390` · ship · `AGT-237` · AGT-237 partial: database health readings and gate live; restart is the remainder · finalises Sep 30, 2:13 PM CST · `select public.reverse_decision('919ea390-7c18-44a5-9dfb-3d4cf3afd4de','John','<why>');`
- `ec290251` · design-kickoff · `AGT-170` · Kickoff designed for AGT-170 (arming) · finalises Sep 30, 2:24 PM CST · `select public.reverse_decision('ec290251-63d2-4898-bc79-73622c8c38af','John','<why>');`
- `26846255` · ship · `AGT-170` · AGT-170 done: the regression gate grades the delta, first approve since 2026-09-16 · finalises Sep 30, 2:42 PM CST · `select public.reverse_decision('26846255-ce11-480a-aae3-a227a66aeb4b','John','<why>');`
- `72987cbb` · design-kickoff · `AGT-238` · Kickoff designed for AGT-238 (slice 1 of 2) · finalises Sep 30, 2:42 PM CST · `select public.reverse_decision('72987cbb-d35d-45b4-a479-4908e6b5d423','John','<why>');`
- `901381b1` · design-kickoff · `AGT-239` · Kickoff designed for AGT-239 · finalises Sep 30, 3:06 PM CST · `select public.reverse_decision('901381b1-5e2d-4a94-999c-a7d86ec73f78','John','<why>');`
- `7c42c2c0` · design-kickoff · `AGT-240` · Kickoff designed for AGT-240 · finalises Sep 30, 3:06 PM CST · `select public.reverse_decision('7c42c2c0-0a94-4eab-af7d-64e482b9a0a1','John','<why>');`
- `9b3d7da9` · ship · `AGT-238` · AGT-238 slice 1 shipped: leverage first, tickets only from findings · finalises Sep 30, 3:20 PM CST · `select public.reverse_decision('9b3d7da9-c25a-4492-b948-939c9c990a11','John','<why>');`
- `796f5a2a` · ship · `AGT-239` · AGT-239 done: the Auditor checks outcomes first · finalises Sep 30, 3:36 PM CST · `select public.reverse_decision('796f5a2a-57ae-4fd3-8400-f0f09dcb54ec','John','<why>');`
- `9347b344` · directive · `AGT-240` · AGT-240 (f): 4 epic(s) of executing projects locked; 40 open Auditor Enhancements ticket(s) filed on or after 2026-09-2… · finalises Sep 30, 3:43 PM CST · `select public.reverse_decision('9347b344-ee7e-41a9-b144-1230386ca33f','John','<why>');`
- `33b801dd` · ship · `AGT-240` · AGT-240 done: projects get a finish line · finalises Sep 30, 4:05 PM CST · `select public.reverse_decision('33b801dd-b937-426c-b012-02ebe4ddb4ee','John','<why>');`
- `7ad14901` · home · `AGT-162` · MCP POC tickets get the scope_rationale the pick path requires · finalises Sep 30, 4:14 PM CST · `select public.reverse_decision('7ad14901-0233-42fd-a6f8-e77172b04012','John','<why>');`
- `fbf2572b` · john-ruling · — · Runner hard stop at 98% weekly usage (start cutoff 97) · finalises Sep 30, 4:16 PM CST · `select public.reverse_decision('fbf2572b-580b-4f95-832b-928d81c3ed2e','John','<why>');`
- `0dcf62f0` · leverage · — · AGT-238 leverage first: AGT-167, AGT-232, AGT-169, AGT-245, AGT-226 marked as leverage -- outranks project order · finalises Sep 30, 4:58 PM CST · `select public.reverse_decision('0dcf62f0-1b3f-4cf7-bcad-5168629458ef','John','<why>');`
- `99e4ea56` · rollback · — · Auto-rollback held: ci-red on de695c1 was not reverted (card-only) · finalises Sep 30, 6:02 PM CST · `select public.reverse_decision('99e4ea56-556c-4590-9086-858a70eff0be','John','<why>');`
- `7570ae1d` · leverage · — · AGT-238 leverage first: AGT-169, AGT-232, AGT-226, AGT-245, AGT-147, AGT-133 marked as leverage -- outranks project ord… · finalises Sep 30, 6:11 PM CST · `select public.reverse_decision('7570ae1d-1744-4b9d-82ae-6fcb9fe80fdb','John','<why>');`
- `060b6300` · hygiene · `AGT-79` · Ticket Owner: 31 derivable cell fix(es) on 31 row(s) — cost 5 · claim 1 · type 0 · revalidation 25 · finalises Sep 30, 6:53 PM CST · `select public.reverse_decision('060b6300-1861-4c83-8b9c-7c0bcf64a467','John','<why>');`
- `362c8d98` · governance · `AGT-169` · AGT-169: the Builder's out-of-kickoff defect is CAPTURED, not fixed now; and the half-applied decision 060b6300 is repo… · finalises Sep 30, 7:08 PM CST · `select public.reverse_decision('362c8d98-8b62-4339-b2f5-0dc72b6fecc1','John','<why>');`
- `57be7b53` · rollback · — · Auto-rollback held: ci-red on ba581e5 was not reverted (card-only) · finalises Sep 30, 7:08 PM CST · `select public.reverse_decision('57be7b53-a0d1-4dae-a24a-173009815245','John','<why>');`
- `30858617` · leverage · — · AGT-238 leverage first: AGT-147, AGT-226, AGT-232, AGT-133, AGT-245 marked as leverage -- outranks project order · finalises Sep 30, 7:15 PM CST · `select public.reverse_decision('30858617-6ffd-474f-a5aa-71dc5b2fa95f','John','<why>');`
- `05402051` · rollback · — · Auto-rollback held: ci-red on 8a727d2 was not reverted (card-only) · finalises Sep 30, 8:00 PM CST · `select public.reverse_decision('05402051-016e-458c-a09c-f27715f4a992','John','<why>');`
- `55db565e` · leverage · — · AGT-238 leverage first: AGT-133, AGT-245, AGT-232, AGT-226, AGT-238 marked as leverage -- outranks project order · finalises Sep 30, 8:07 PM CST · `select public.reverse_decision('55db565e-a0da-4980-807b-ef02189eeb3f','John','<why>');`
- `2451a7ba` · rollback · — · Auto-rollback held: ci-red on 9a51f0c was not reverted (card-only) · finalises Sep 30, 8:46 PM CST · `select public.reverse_decision('2451a7ba-a20d-446e-8280-b8f88a1ab404','John','<why>');`
- `8172e01e` · leverage · — · AGT-238 leverage first: AGT-245, AGT-232, AGT-226 marked as leverage -- outranks project order · finalises Sep 30, 8:52 PM CST · `select public.reverse_decision('8172e01e-c9fa-4698-b807-85fb66c0293b','John','<why>');`
- `a72cb5a5` · ship · `AGT-238` · AGT-238 shipped at v7.0.667 (53cb6e77eca0790f65c3e14c131b2af2e7b9c3f5) on verdict d21bc7dd-f148-4a75-972d-ee975250f467 · finalises Sep 30, 9:27 PM CST · `select public.reverse_decision('a72cb5a5-080a-4265-82f8-9dc0afd1467c','John','<why>');`
- `764eee98` · filing · — · Audit review 2026-W40: 28 findings → 3 tickets, 0 not-a-defect, 8 carried, 2 escalated · finalises Sep 30, 9:54 PM CST · `select public.reverse_decision('764eee98-9372-415a-ac4d-cad7a5275f43','John','<why>');`
- `ed2b93d0` · rollback · — · Auto-rollback held: ci-red on d365543 was not reverted (card-only) · finalises Sep 30, 9:59 PM CST · `select public.reverse_decision('ed2b93d0-1ebb-40fd-8936-43a910f15377','John','<why>');`
- `c11b24e4` · leverage · — · AGT-238 leverage first: AGT-226, AGT-166, AGT-237, AGT-150 marked as leverage -- outranks project order · finalises Sep 30, 10:08 PM CST · `select public.reverse_decision('c11b24e4-8928-4ff5-bc3e-27a52bd78de2','John','<why>');`
- `00b93277` · concurrency · — · AGT-238 concurrency from the corpus: 4 project(s) executing in the order auditor-enhancements, dev-manager-capabilities… · finalises Sep 30, 10:08 PM CST · `select public.reverse_decision('00b93277-eecd-4c30-bc13-3b4d39cf9947','John','<why>');`
- `521fe3e3` · leverage · — · AGT-238 leverage first: AGT-232, AGT-237, AGT-149, AGT-160 marked as leverage -- outranks project order · finalises Sep 30, 10:58 PM CST · `select public.reverse_decision('521fe3e3-fb27-416e-b351-523aa14c7efc','John','<why>');`
- `a3350adb` · concurrency · — · AGT-238 concurrency from the corpus: 4 project(s) executing in the order auditor-enhancements, dev-manager-capabilities… · finalises Sep 30, 10:58 PM CST · `select public.reverse_decision('a3350adb-7795-438d-89f0-29886bcff349','John','<why>');`
- `e3aea23a` · rollback · — · Auto-rollback held: ci-red on 837a8a5 was not reverted (card-only) · finalises Sep 30, 11:02 PM CST · `select public.reverse_decision('e3aea23a-288e-4cfb-bf45-a3934d106741','John','<why>');`
- `18e4f399` · filing · — · Audit review 2026-W40: 15 findings → 1 tickets, 0 not-a-defect, 5 carried, 0 escalated · finalises Sep 30, 11:10 PM CST · `select public.reverse_decision('18e4f399-236b-467b-8c2e-23e5f5ae4f4a','John','<why>');`
- `7fbfea6e` · leverage · — · AGT-238 leverage first: AGT-149, AGT-232, AGT-237, AGT-160 marked as leverage -- outranks project order · finalises Sep 30, 11:11 PM CST · `select public.reverse_decision('7fbfea6e-32b6-4783-bb84-82be722beb19','John','<why>');`
- `e00392fc` · concurrency · — · AGT-238 concurrency from the corpus: 3 project(s) executing in the order dev-manager-capabilities, auditor-enhancements… · finalises Sep 30, 11:11 PM CST · `select public.reverse_decision('e00392fc-6726-4c1f-86b4-b481d6480cc5','John','<why>');`
- `c339454a` · leverage · — · AGT-238 leverage first: AGT-160, AGT-237, AGT-157 marked as leverage -- outranks project order · finalises Sep 30, 11:17 PM CST · `select public.reverse_decision('c339454a-3c64-4820-a4fa-e43b52a6dcb3','John','<why>');`
- `19d199b9` · concurrency · — · AGT-238 concurrency from the corpus: 3 project(s) executing in the order dev-manager-capabilities, auditor-enhancements… · finalises Sep 30, 11:17 PM CST · `select public.reverse_decision('19d199b9-4d2e-43b6-b663-2d5a98a2dad7','John','<why>');`
- `3302bacd` · john-ruling · — · Routines run until John says stop: all automatic usage stops off · finalises Sep 30, 11:24 PM CST · `select public.reverse_decision('3302bacd-3ad3-42a0-93f0-92eefb53eaca','John','<why>');`
- `4d01d623` · john-ruling · — · MCP POC back to executing and pinned (John) · finalises Sep 30, 11:28 PM CST · `select public.reverse_decision('4d01d623-f6b6-40a2-924e-048a51ff6047','John','<why>');`
- `c0f010e2` · john-ruling · — · Trainer-Authored Agents set up as design-only: epic, 3 tickets held from the runner, project executing + pinned · finalises Sep 30, 11:33 PM CST · `select public.reverse_decision('c0f010e2-f651-452f-b1c6-3e67dd31704a','John','<why>');`
- `fb41fcd3` · classification · — · board ordered: 15 ticket(s) given an automation_rank · finalises Oct 1, 12:07 AM CST · `select public.reverse_decision('fb41fcd3-9407-420c-9b74-a7078ddb0ead','John','<why>');`
- `2fdf49dc` · hygiene · `AGT-79` · Ticket Owner: 14 derivable cell fix(es) on 12 row(s) — cost 3 · claim 3 · type 0 · revalidation 8 · finalises Oct 1, 12:16 AM CST · `select public.reverse_decision('2fdf49dc-311a-4bb3-b577-baa60b50c863','John','<why>');`
- `e09e4332` · mid-build-defect · `AGT-160` · Mid-build defect on AGT-160: fix-now, both limbs of the test held · finalises Oct 1, 12:20 AM CST · `select public.reverse_decision('e09e4332-9657-4e61-8fee-b549e5ec7c73','John','<why>');`
- **21 leverage decisions** finalising Oct 1, 12:22 AM CST → Oct 1, 10:59 PM CST · one batch, listed by query rather than one line each: `select id, backlog_id, summary, expires_at from public.runner_decisions where status='open' and kind='leverage' order by expires_at;` · reverse any one with `select public.reverse_decision('<id>','John','<why>');`
- **23 concurrency decisions** finalising Oct 1, 12:22 AM CST → Oct 1, 10:59 PM CST · one batch, listed by query rather than one line each: `select id, backlog_id, summary, expires_at from public.runner_decisions where status='open' and kind='concurrency' order by expires_at;` · reverse any one with `select public.reverse_decision('<id>','John','<why>');`
- **32 ticket-status decisions** finalising Oct 1, 12:30 AM CST → Oct 1, 10:54 PM CST · one batch, listed by query rather than one line each: `select id, backlog_id, summary, expires_at from public.runner_decisions where status='open' and kind='ticket-status' order by expires_at;` · reverse any one with `select public.reverse_decision('<id>','John','<why>');`
- **28 resolve decisions** finalising Oct 1, 12:30 AM CST → Oct 1, 10:54 PM CST · one batch, listed by query rather than one line each: `select id, backlog_id, summary, expires_at from public.runner_decisions where status='open' and kind='resolve' order by expires_at;` · reverse any one with `select public.reverse_decision('<id>','John','<why>');`
- `400e4e07` · learning · `SES-159` · class-loop learning claims for P3 - Investor Value · finalises Oct 1, 12:37 AM CST · `select public.reverse_decision('400e4e07-62f4-4bfe-a278-85b109c27ab6','John','<why>');`
- `87eb668e` · rollback · — · Auto-rollback held: ci-red on 0c7bc86 was not reverted (card-only) · finalises Oct 1, 12:44 AM CST · `select public.reverse_decision('87eb668e-ca91-4e5f-92d2-b16deee36c61','John','<why>');`
- `f187a23a` · filing · — · Audit review 2026-W40: 15 findings → 0 tickets, 2 not-a-defect, 6 carried, 1 escalated · finalises Oct 1, 12:52 AM CST · `select public.reverse_decision('f187a23a-3f09-4560-9094-4c195045944f','John','<why>');`
- `33d52dba` · learning · `SES-159` · class-loop learning claims for P3 - Investor Value · finalises Oct 1, 12:53 AM CST · `select public.reverse_decision('33d52dba-a55f-4e36-bdfa-010a9ccff10f','John','<why>');`
- `4fb7083a` · hygiene · `AGT-79` · Ticket Owner: 13 derivable cell fix(es) on 13 row(s) — cost 0 · claim 0 · type 0 · revalidation 13 · finalises Oct 1, 1:02 AM CST · `select public.reverse_decision('4fb7083a-750b-4411-8285-750b4e251849','John','<why>');`
- `e6ef36c6` · hygiene · `AGT-79` · Ticket Owner: 25 derivable cell fix(es) on 25 row(s) — cost 0 · claim 0 · type 0 · revalidation 25 · finalises Oct 1, 1:02 AM CST · `select public.reverse_decision('e6ef36c6-248e-4288-a8b7-cee6ea526c7e','John','<why>');`
- `ea89655a` · hygiene · `AGT-79` · Ticket Owner: 13 derivable cell fix(es) on 13 row(s) — cost 0 · claim 0 · type 0 · revalidation 13 · finalises Oct 1, 1:19 AM CST · `select public.reverse_decision('ea89655a-f6a8-4732-9d04-f1e061f87ea1','John','<why>');`
- `43313e6f` · hygiene · `AGT-156` · AGT-156 blocked_by AGT-155: the routine cannot be registered before the leads step it invokes exists · finalises Oct 1, 2:35 AM CST · `select public.reverse_decision('43313e6f-b25e-4d81-bd98-3298bb5cd879','John','<why>');`
- `d377fcfc` · ticket-scope · `AGT-161` · AGT-161 is designed: kickoff v7.0.681 attested within cap, premise alive, and the skill-edit rule scopes one done-when… · finalises Oct 1, 2:43 AM CST · `select public.reverse_decision('d377fcfc-4532-46dc-8fe2-7a6d5327dafb','John','<why>');`
- `e5c44598` · rollback · — · Auto-rollback held: ci-red on 0ee8d6b was not reverted (card-only) · finalises Oct 1, 2:56 AM CST · `select public.reverse_decision('e5c44598-e441-4e86-b842-c55d4289165c','John','<why>');`
- `eb81f6f7` · filing · — · Audit review 2026-W40: 12 findings → 3 tickets, 1 not-a-defect, 6 carried, 0 escalated · finalises Oct 1, 2:56 AM CST · `select public.reverse_decision('eb81f6f7-9afb-4009-81a9-fa54b2ef14bc','John','<why>');`
- **29 agent-row decisions** finalising Oct 1, 3:10 AM CST → Oct 1, 9:35 PM CST · one batch, listed by query rather than one line each: `select id, backlog_id, summary, expires_at from public.runner_decisions where status='open' and kind='agent-row' order by expires_at;` · reverse any one with `select public.reverse_decision('<id>','John','<why>');`
- `68d57c49` · filing · — · Audit review 2026-W40: 15 findings → 2 tickets, 0 not-a-defect, 5 carried, 1 escalated · finalises Oct 1, 3:17 AM CST · `select public.reverse_decision('68d57c49-8cd7-48f7-bf15-40b9c02a974e','John','<why>');`
- `eeaec181` · ticket-scope · `AGT-161` · The build touched two test files the kickoff did not name, because its own migration made them red by name; I am record… · finalises Oct 1, 3:29 AM CST · `select public.reverse_decision('eeaec181-2876-4c50-8fb7-9d8bb5761207','John','<why>');`
- `df76b268` · rollback · — · Auto-rollback held: ci-red on b82dec6 was not reverted (card-only) · finalises Oct 1, 3:42 AM CST · `select public.reverse_decision('df76b268-9151-470c-982a-7c65b45a8469','John','<why>');`
- `c30cbc88` · filing · — · Audit review 2026-W40: 9 findings → 0 tickets, 1 not-a-defect, 5 carried, 0 escalated · finalises Oct 1, 4:05 AM CST · `select public.reverse_decision('c30cbc88-9db9-478e-a83b-a84b05841a7a','John','<why>');`
- `f75ac363` · filing · `AGT-163` · Filed one runner_questions card asking John for the credential half of AGT-163 -- the tester key, the known_callers lab… · finalises Oct 1, 4:20 AM CST · `select public.reverse_decision('f75ac363-32a3-409c-847b-373564e582b6','John','<why>');`
- `411c02ce` · hygiene · `AGT-165` · AGT-165 blocked_by AGT-164: an onboarding page for an agent that does not exist · finalises Oct 1, 4:47 AM CST · `select public.reverse_decision('411c02ce-d0e1-4afc-972c-a0cb32a2cb6e','John','<why>');`
- `9f1b407a` · rollback · — · Auto-rollback held: ci-red on 853be5d was not reverted (card-only) · finalises Oct 1, 4:49 AM CST · `select public.reverse_decision('9f1b407a-7be5-4eb9-8664-57fe84a6259e','John','<why>');`
- `87a4d7e7` · filing · — · Audit review 2026-W40: 15 findings → 3 tickets, 0 not-a-defect, 5 carried, 0 escalated · finalises Oct 1, 5:03 AM CST · `select public.reverse_decision('87a4d7e7-cadf-4f69-aeca-141fbfbdd26c','John','<why>');`
- `d39c27e3` · filing · — · Audit review 2026-W40: 101 findings → 1 tickets, 1 not-a-defect, 0 carried, 5 escalated · finalises Oct 1, 5:49 AM CST · `select public.reverse_decision('d39c27e3-0ab9-43a4-ac3b-93db722b0907','John','<why>');`
- `1fe98158` · audit-report · — · WAITING ON JOHN (money): Claude Opus 5.5 shipped 22 September at $4/$20 per MTok against Opus 5's $5/$25, about 40% les… · finalises Oct 1, 5:54 AM CST · `select public.reverse_decision('1fe98158-ebf6-46cb-a3ee-54417d645316','John','<why>');`
- `d7a49a3d` · directive · — · Auditor-born tickets leave the five projects' finish lines (John) · finalises Oct 1, 10:35 AM CST · `select public.reverse_decision('d7a49a3d-fb3e-4ac3-9c75-ad3842129d5e','John','<why>');`
- `83aacc88` · directive · — · Non-Auditor added tickets leave the finish lines unless John explicitly asked for them · finalises Oct 1, 10:39 AM CST · `select public.reverse_decision('83aacc88-8f04-4e8b-b130-62b9ae944bdd','John','<why>');`
- `c4ad627c` · filing · — · Audit review 2026-W40: 5 findings → 0 tickets, 0 not-a-defect, 1 carried, 0 escalated · finalises Oct 1, 11:07 AM CST · `select public.reverse_decision('c4ad627c-8770-443d-9730-5dffbd244fe4','John','<why>');`
- `c4059b32` · design-kickoff · `AGT-265` · Kickoff designed for AGT-265 · finalises Oct 1, 11:11 AM CST · `select public.reverse_decision('c4059b32-ab12-4f1d-b095-f844425110db','John','<why>');`
- `4a2aef64` · directive · `AGT-173` · Release claims left by finished cycles; AGT-173 leaves Auditor Enhancements after its ship · finalises Oct 1, 11:19 AM CST · `select public.reverse_decision('4a2aef64-3a5b-439a-a308-0f9d2f70720a','John','<why>');`
- `86b38506` · john-ruling · — · Dev Manager Capabilities pinned to executing (John) · finalises Oct 1, 11:24 AM CST · `select public.reverse_decision('86b38506-a848-41ff-9694-a8a8b7330b40','John','<why>');`
- `43c1e964` · routine-lanes · `AGT-265` · Three runner lanes created and enabled: trig_018W86qqGPV7a4qpngXFrUFm (lane-2, 50 */3), trig_01AAMaJbdt2ye6hMMpCDy5Yd (… · finalises Oct 1, 11:43 AM CST · `select public.reverse_decision('43c1e964-7baa-421d-8002-4879a1e5efa7','John','<why>');`
- `56aaf5b5` · ship · `AGT-265` · AGT-265 done: four runner lanes, one test line gated on a green database · finalises Oct 1, 12:11 PM CST · `select public.reverse_decision('56aaf5b5-f95b-47a2-9fce-51304a7c88b5','John','<why>');`
- `9b992af3` · ticket-scope · `AGT-155` · AGT-155 remainder is designed: the review instruction moves onto the nl-competitors-intent Skill row so the Wednesday r… · finalises Oct 1, 12:46 PM CST · `select public.reverse_decision('9b992af3-33ab-4273-bf16-638cf8ee6576','John','<why>');`
- `b8586129` · gate · — · Gate cards ruled by cycle aded348d-a54f-4bab-8fb6-167b6ab8b221: 7 card(s) — {"john": 0, "accept": 1, "rework": 6, "reti… · finalises Oct 1, 1:08 PM CST · `select public.reverse_decision('b8586129-2593-4894-9168-e9ea42a38fa9','John','<why>');`
- `a10ea683` · filing · — · Audit review 2026-W40: 2 findings → 0 tickets, 0 not-a-defect, 2 carried, 0 escalated · finalises Oct 1, 1:48 PM CST · `select public.reverse_decision('a10ea683-5444-4f84-b1e1-fc2568c5aaca','John','<why>');`
- `552934f6` · ship · `AGT-155` · AGT-155 shipped at v7.0.691 (63241a5cac47d4a192825661b2e8e43b790eae9f) on verdict 228be707-fcd5-4543-acfe-5da2a7d2e95c · finalises Oct 1, 2:08 PM CST · `select public.reverse_decision('552934f6-9e22-49f1-b2ec-94f9a67abec7','John','<why>');`
- `c991f6b3` · design-ruling · `AGT-133` · AGT-133 slice 3: the three runner alarms land as john_alerts rows, never a push · finalises Oct 1, 2:26 PM CST · `select public.reverse_decision('c991f6b3-626c-4edc-9d81-48baf8fdbc21','John','<why>');`
- `931600c4` · finding-routing · `AGT-138` · Both defects the build found outside its own two files were captured as findings, not fixed in this ship. · finalises Oct 1, 3:45 PM CST · `select public.reverse_decision('931600c4-de54-4baf-a7cc-7ae44dc84f16','John','<why>');`
- `e822abdb` · rollback · — · Auto-rollback held: ci-red on fe93029 was not reverted (card-only) · finalises Oct 1, 4:40 PM CST · `select public.reverse_decision('e822abdb-871d-4853-b5fd-990faf693e63','John','<why>');`
- `06af3f62` · ticket-scope · `AGT-159` · AGT-159's premise is alive, so its kickoff is designed and the ticket is marked designed against docs/kickoffs/v7.0.699… · finalises Oct 1, 5:24 PM CST · `select public.reverse_decision('06af3f62-60d9-4e8f-97a6-961428d79745','John','<why>');`
- `87ffb8b4` · mid-build · `AGT-136` · AGT-136 slice 2: three mid-build defects — two fixed now inside scope, one new-file fix, one captured as a finding · finalises Oct 1, 5:29 PM CST · `select public.reverse_decision('87ffb8b4-8360-4e58-abb7-6f4948e10b5c','John','<why>');`
- `9863a33e` · design-ruling · `AGT-159` · AGT-159: backlog-review findings; the ruling lands on the ticket · finalises Oct 1, 5:49 PM CST · `select public.reverse_decision('9863a33e-8f55-4346-9af0-07eb2ebaea2f','John','<why>');`
- `c9bc7f1d` · rollback · — · Auto-rollback held: ci-red on 60be647 was not reverted (card-only) · finalises Oct 1, 7:07 PM CST · `select public.reverse_decision('c9bc7f1d-39e7-469a-b705-42c54a702d5e','John','<why>');`
- `6eb12371` · finding-routing · `AGT-245` · Both defects this slice met outside its own three files were captured as findings, not fixed in the ship. · finalises Oct 1, 7:19 PM CST · `select public.reverse_decision('6eb12371-a37b-464d-809a-54255259a036','John','<why>');`
- `ed94cb03` · rollback · — · Auto-rollback held: ci-red on e5c4447 was not reverted (card-only) · finalises Oct 1, 7:20 PM CST · `select public.reverse_decision('ed94cb03-ea9b-448a-8b1a-da9a55492d6f','John','<why>');`
- `89fc06dd` · filing · — · Audit review 2026-W40: 15 findings → 10 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Oct 1, 7:29 PM CST · `select public.reverse_decision('89fc06dd-60d1-4c35-b1a7-b6faecbeaf43','John','<why>');`
- `b9a64879` · design-ruling · `AGT-136` · Open questions ruled by cycle 68dcf0b1-44df-4754-b663-49a1cc896c8a: 25 question(s) — {"no": 9, "yes": 10, "john": 1, "w… · finalises Oct 1, 7:32 PM CST · `select public.reverse_decision('b9a64879-f6b4-4199-be3c-af4b2ed974d4','John','<why>');`
- `7de62e90` · ticket-scope · `AGT-267` · AGT-267's premise is alive, so its kickoff is designed and the ticket is marked designed against docs/kickoffs/v7.0.702… · finalises Oct 1, 7:46 PM CST · `select public.reverse_decision('7de62e90-53bd-4a2f-96b2-28c74ac7a7e6','John','<why>');`
- `ac17cf78` · classification · `AGT-266` · AGT-266 classed P9 - Bug Fixes, serves none · finalises Oct 1, 8:05 PM CST · `select public.reverse_decision('ac17cf78-3e6f-4594-9ccd-e174138acd5c','John','<why>');`
- `22cd3209` · ticket-scope · `AGT-268` · AGT-268 premise revalidated alive and designed: the kickoff splits capability write-backs from fetched postings at the… · finalises Oct 1, 8:11 PM CST · `select public.reverse_decision('22cd3209-1a5c-4bde-99a4-2f92949b93ed','John','<why>');`
- `d9706341` · ticket-scope · `AGT-268` · AGT-268: the newly red agt-84 KINDS-count test was CAPTURED as a finding, not fixed now — so this cycle is gated before… · finalises Oct 1, 8:50 PM CST · `select public.reverse_decision('d9706341-f192-4a9b-bfd7-a697e74c7744','John','<why>');`
- `017f8951` · design-ruling · `AGT-136` · Open questions ruled by cycle 5e9bd9c8-df6f-4c20-83a4-1357800a3267: 4 question(s) — {"no": 3, "yes": 1, "john": 0, "wit… · finalises Oct 1, 9:04 PM CST · `select public.reverse_decision('017f8951-4238-45a4-a6da-0ae6d107a919','John','<why>');`
- `00a8030e` · finding-routing · `AGT-245` · The one newly-red test was captured as a finding, not fixed: it is the third live-board ordering assertion this session… · finalises Oct 1, 9:05 PM CST · `select public.reverse_decision('00a8030e-4f61-435d-9d8a-9683ac65959c','John','<why>');`
- `bcc41f4d` · rollback · — · Auto-rollback held: ci-red on 3d2b6fa was not reverted (card-only) · finalises Oct 1, 9:06 PM CST · `select public.reverse_decision('bcc41f4d-67b2-4fca-84bd-7d7469d1526b','John','<why>');`
- `45ae9b82` · design-ruling · `AGT-136` · Open questions ruled by cycle 4d2c3c4e-e719-4f45-9ed3-f16a655afb07: 3 question(s) — {"no": 3, "yes": 0, "john": 0, "wit… · finalises Oct 1, 9:34 PM CST · `select public.reverse_decision('45ae9b82-b775-402c-84c3-8b2048c55fd6','John','<why>');`
- `26011378` · directive · `AGT-245` · AGT-245: the 15 cohort rows the freeze refused leave the delta re-grade lane permanently — AGT-103, AGT-116, AGT-128, A… · finalises Oct 1, 9:35 PM CST · `select public.reverse_decision('26011378-1fd7-4303-82b6-0d0181a6a32f','John','<why>');`
- `066ce87d` · ship · `AGT-100` · AGT-100 shipped at v7.0.562 (7bddd2260f082743c2aab0d497b31bd4b0988878) on verdict 58d01cc9-6d14-4ff6-b9f4-b8ed171fed48 · finalises Oct 1, 9:44 PM CST · `select public.reverse_decision('066ce87d-6c29-403e-b98b-ab9b923a9660','John','<why>');`
- `2df0b7fa` · gate · — · Gate cards ruled by cycle 6ebbb269-a26f-497c-bf85-dd1e7a495009: 4 card(s) — {"john": 2, "accept": 1, "rework": 1, "reti… · finalises Oct 1, 9:57 PM CST · `select public.reverse_decision('2df0b7fa-675e-4f48-99e1-0d0fa3c3d68e','John','<why>');`
- `9545054b` · ship · `AGT-245` · AGT-245 shipped at v7.0.705 (36efb7c180cc82398c15b79023551d0002f151fa) on verdict 53a38ba2-1e88-4284-8ab3-5ef70954543c · finalises Oct 1, 10:05 PM CST · `select public.reverse_decision('9545054b-1b74-4fad-a305-467c82e2589a','John','<why>');`
- `0e68d907` · ship · `AGT-268` · AGT-268 shipped at v7.0.706 (7c6cc7f0c9230a7cf7cb79e5879ddcd8fa4681df) on verdict 1ef132da-b5ce-4fa0-a4fc-4a9dd678e6e4 · finalises Oct 1, 10:54 PM CST · `select public.reverse_decision('0e68d907-2888-4a65-b312-51d4fd22e963','John','<why>');`
- `b4a92a62` · gate · — · Gate cards ruled by cycle 0fd8d811-d61e-4da8-b8eb-330c2fc7e36f: 1 card(s) — {"john": 0, "accept": 1, "rework": 0, "reti… · finalises Oct 1, 10:55 PM CST · `select public.reverse_decision('b4a92a62-55c2-454b-baa1-1653b74d5754','John','<why>');`
- `28bd613d` · learning · `SES-159` · class-loop learning claims for P3 - Investor Value · finalises Oct 2, 12:17 AM CST · `select public.reverse_decision('28bd613d-aac8-402f-9f50-7f4ae989dbd1','John','<why>');`
- `1b2563c0` · design-ruling · `AGT-136` · Open questions ruled by cycle 2ecb62b3-76fa-4b70-97ee-beb0b8ded250: 5 question(s) — {"no": 4, "yes": 0, "john": 0, "wit… · finalises Oct 2, 12:23 AM CST · `select public.reverse_decision('1b2563c0-9325-417d-b245-3b903e2e1875','John','<why>');`
- `58c1ab9f` · classification · — · board ordered: 5 ticket(s) given an automation_rank · finalises Oct 2, 12:40 AM CST · `select public.reverse_decision('58c1ab9f-119b-41b7-a257-afac45d1c173','John','<why>');`
- `ce4db35d` · hygiene · `AGT-79` · Ticket Owner: 33 derivable cell fix(es) on 33 row(s) — cost 8 · claim 2 · type 0 · revalidation 23 · finalises Oct 2, 12:41 AM CST · `select public.reverse_decision('ce4db35d-15b4-4157-907e-55c48230091b','John','<why>');`
- `96ff9822` · removal-proposal · `AG-11` · AG-11 removal proposed: api/train.js appears in no commit of this repo's 3,359, and the trainer's role_prompt 'Base Tra… · finalises Oct 2, 12:41 AM CST · `select public.reverse_decision('96ff9822-fa24-40d6-b58f-91caa84e07c2','John','<why>');`
- `ca322fcf` · removal-proposal · `AI-12` · AI-12 removal proposed: Premise names /work/[taskId]/audit; no such route in main.jsx:43-59, and the AI Audit ships pla… · finalises Oct 2, 12:41 AM CST · `select public.reverse_decision('ca322fcf-6f85-4458-90ba-0f0ee70791d5','John','<why>');`
- `ca94c1f7` · removal-proposal · `AI-19` · AI-19 removal proposed: latency_ms is populated on the two row sets this premise calls a dash: the trainer's calls (19,… · finalises Oct 2, 12:41 AM CST · `select public.reverse_decision('ca94c1f7-9685-4fce-aab9-c42641deb7fe','John','<why>');`
- `d74ff32a` · removal-proposal · `AW-13` · AW-13 removal proposed: Duplicate of TI-07, which is built: TaskInstructionsScreen.jsx:842 renders the chat_origin tran… · finalises Oct 2, 12:41 AM CST · `select public.reverse_decision('d74ff32a-b0cc-4c93-8971-38109cecc95c','John','<why>');`
- `a7b9a2f4` · removal-proposal · `AW-17` · AW-17 removal proposed: Built: TaskInstructionsScreen.jsx:527-532 Michelle planner assigns each step an agent; per-step… · finalises Oct 2, 12:41 AM CST · `select public.reverse_decision('a7b9a2f4-40a1-45fd-b2fb-b385b843eb72','John','<why>');`
- `536dea02` · removal-proposal · `AZ-03` · AZ-03 removal proposed: Built: AnalyzerContext.jsx:302 writes tasks.mapping; AnalyzerScreen.jsx:74-88 reads it back on… · finalises Oct 2, 12:41 AM CST · `select public.reverse_decision('536dea02-f3dc-4374-8ca2-d7c675503801','John','<why>');`
- `984d4947` · removal-proposal · `AZ-04` · AZ-04 removal proposed: Built: api/extract.js:143-177 uploads the CSV to Storage bucket task-data and sets tasks.csv_pa… · finalises Oct 2, 12:41 AM CST · `select public.reverse_decision('984d4947-4e2c-496f-9aa2-d0d51872fa79','John','<why>');`
- `48a44387` · removal-proposal · `AZ-05` · AZ-05 removal proposed: Built: AnalyzerScreen.jsx:73-88 signs tasks.csv_path from Storage and reloads the CSV on return. · finalises Oct 2, 12:41 AM CST · `select public.reverse_decision('48a44387-be70-49b3-9a62-4b7bb80fbb47','John','<why>');`
- `672f054b` · removal-proposal · `FT-05` · FT-05 removal proposed: Built: FetchScreen.jsx:92-131 saves the fetched CSV to Storage via upload-csv (FEATURE: SH-07). · finalises Oct 2, 12:41 AM CST · `select public.reverse_decision('672f054b-7b3b-429f-ac0d-32d5a383d2c1','John','<why>');`
- `b8485416` · removal-proposal · `SH-06` · SH-06 removal proposed: Built: TaskInstructionsScreen.jsx:302 reads and :716 updates public.tasks (29 rows live); 7 mor… · finalises Oct 2, 12:41 AM CST · `select public.reverse_decision('b8485416-106f-4617-8c47-44243e39b1ee','John','<why>');`
- `4bf0831d` · removal-proposal · `SH-07` · SH-07 removal proposed: Built: FetchScreen.jsx:92 carries FEATURE: SH-07 — Save fetched CSV to Supabase Storage; api/ex… · finalises Oct 2, 12:41 AM CST · `select public.reverse_decision('4bf0831d-cdff-4b0d-94d1-dd741edc387e','John','<why>');`
- `6aebec6f` · removal-proposal · `TI-03` · TI-03 removal proposed: Built: TaskInstructionsScreen.jsx:302-346 loads tasks.steps JSONB via initializeStepsFromSupaba… · finalises Oct 2, 12:41 AM CST · `select public.reverse_decision('6aebec6f-3606-4490-8146-6d59505c81ae','John','<why>');`
- `a10d8229` · removal-proposal · `TI-07` · TI-07 removal proposed: Built: TaskInstructionsScreen.jsx:842 renders the chat transcript section tagged FEATURE: TI-07… · finalises Oct 2, 12:41 AM CST · `select public.reverse_decision('a10d8229-4106-42ac-b53b-4b69b1aea856','John','<why>');`
- `bb54f3d9` · removal-proposal · `TI-17` · TI-17 removal proposed: Built: FetchContext.jsx:102 usePat and FetchScreen.jsx:13/77 (FEATURE: FT-06) run Pat through t… · finalises Oct 2, 12:41 AM CST · `select public.reverse_decision('bb54f3d9-36e4-40e7-8817-64dad6c00af5','John','<why>');`
- `a1bbf32b` · agent-row · `AGT-155` · Name the two lead facts, competitor_why and what_they_sell, in the jm-linkedin-alerts-intent Skill row -- in the method… · finalises Oct 2, 1:05 AM CST · `select public.reverse_decision('a1bbf32b-68dd-4931-bd6f-c135d7c476d8','John','<why>');`
- `0714a304` · deviation-call · `AGT-155` · Builder deviation on AGT-155 captured as a finding, not fixed now — the file limb failed (the defect is outside the kic… · finalises Oct 2, 1:26 AM CST · `select public.reverse_decision('0714a304-3789-4f03-b45a-3d51dfa17d33','John','<why>');`
- `5454eb10` · ticket-status · `AGT-149` · Close-out: AGT-149 settles 'delivered' · finalises Oct 2, 1:39 AM CST · `select public.reverse_decision('5454eb10-b42b-45b9-9738-a4bbee165bdf','John','<why>');`
- `cbe21191` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 2, 1:39 AM CST · `select public.reverse_decision('cbe21191-1af4-4aeb-a24d-901d5657b9fa','John','<why>');`
- `ce12fac0` · learning · `SES-159` · class-loop learning claims for P3 - Investor Value · finalises Oct 2, 2:11 AM CST · `select public.reverse_decision('ce12fac0-06f1-4ac0-8961-3ea929820559','John','<why>');`
- `e5d207cb` · learning · `SES-159` · class-loop learning claims for P3 - Investor Value · finalises Oct 2, 2:15 AM CST · `select public.reverse_decision('e5d207cb-44b5-474a-8130-ee433ca2c6be','John','<why>');`
- `b877b2eb` · design-ruling · `AGT-136` · Open questions ruled by cycle 57c73a47-5e89-41fa-8ce9-6cd86c91b10d: 3 question(s) — {"no": 3, "yes": 0, "john": 0, "wit… · finalises Oct 2, 2:17 AM CST · `select public.reverse_decision('b877b2eb-02a1-4383-b09f-baf0851ddb7a','John','<why>');`
- `8e2af91f` · filing · — · Audit review 2026-W40: 152 findings → 1 tickets, 3 not-a-defect, 0 carried, 0 escalated · finalises Oct 2, 2:21 AM CST · `select public.reverse_decision('8e2af91f-b81b-4894-be11-6cc0acc06422','John','<why>');`
- `10a74ffd` · leverage · — · AGT-238 leverage first: CHI-83, SCA-3, SCA-4, HAR-13, AGT-005, AGT-020 marked as leverage -- outranks project order · finalises Oct 2, 2:26 AM CST · `select public.reverse_decision('10a74ffd-243d-4461-87cb-0d4e5acc5d8a','John','<why>');`
- `60d2c610` · concurrency · — · AGT-238 concurrency from the corpus: 4 project(s) executing in the order agent-training, dev-manager-capabilities, mcp-… · finalises Oct 2, 2:26 AM CST · `select public.reverse_decision('60d2c610-c22a-450b-b77c-8e8d77200a77','John','<why>');`
- `327924e2` · leverage · — · AGT-238 leverage first: SCA-3, HAR-13, AGT-005, CHI-83, SCA-4 marked as leverage -- outranks project order · finalises Oct 2, 2:29 AM CST · `select public.reverse_decision('327924e2-efef-49f5-9557-0fb8ecb37815','John','<why>');`
- `23be93e6` · concurrency · — · AGT-238 concurrency from the corpus: 4 project(s) executing in the order agent-training, dev-manager-capabilities, trai… · finalises Oct 2, 2:29 AM CST · `select public.reverse_decision('23be93e6-df0b-466f-bfe2-330b4471950d','John','<why>');`
- `eeadcafe` · removal · `HAR-13` · HAR-13 premise is dead — removal proposed: after 68 days of HAR-9 truncation labels, nothing at max_tokens 1500 has eve… · finalises Oct 2, 2:57 AM CST · `select public.reverse_decision('eeadcafe-c9b0-4603-8830-05ead2091d21','John','<why>');`
- `2dea60cf` · removal · `SCA-3` · SCA-3 premise is dead — removal proposed: the five failures were truncation after all, and the cap raise on 2026-07-28… · finalises Oct 2, 3:06 AM CST · `select public.reverse_decision('2dea60cf-fc60-476f-a1b0-ba34c3500da6','John','<why>');`
- `91fc1937` · design-ruling · `AGT-136` · Open questions ruled by cycle 00729a9d-7e22-459c-bc98-794286f16d0f: 3 question(s) — {"no": 3, "yes": 0, "john": 0, "wit… · finalises Oct 2, 3:22 AM CST · `select public.reverse_decision('91fc1937-4b61-4515-ba9c-a653d4b4d60b','John','<why>');`
- `71e86af5` · ticket-status · `AGT-164` · Close-out: AGT-164 settles 'delivered' · finalises Oct 2, 3:28 AM CST · `select public.reverse_decision('71e86af5-7376-47a6-8c1e-e44ec54e375d','John','<why>');`
- `3c831adf` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 2, 3:28 AM CST · `select public.reverse_decision('3c831adf-83e5-450e-a77c-0e0fa3ceb08b','John','<why>');`
- `63d49d00` · ticket-status · `AGT-164` · Close-out: AGT-164 settles 'delivered' · finalises Oct 2, 3:38 AM CST · `select public.reverse_decision('63d49d00-fdd8-446b-8ae4-5a1b28aa954d','John','<why>');`
- `86c0822b` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 2, 3:38 AM CST · `select public.reverse_decision('86c0822b-59b0-4ef9-b2de-1f0f1678e87c','John','<why>');`
- `9ba1aea1` · agent-row · `CHI-83` · CHI-83: one guardrails Skill, chi-vocabulary-guardrail, on channel-intelligence and hypothesis-evaluation, allowlisted… · finalises Oct 2, 3:46 AM CST · `select public.reverse_decision('9ba1aea1-89b1-4016-b881-9e25be466b0d','John','<why>');`
- `70f36672` · filing · — · Audit review 2026-W40: 20 findings → 1 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Oct 2, 3:50 AM CST · `select public.reverse_decision('70f36672-02ce-44cd-94a1-c03f1d1b5a5b','John','<why>');`
- `f5f20cb3` · leverage · — · AGT-238 leverage first: SCA-4, AGT-005, AGT-020, AGT-006, PRO-3, AGT-159 marked as leverage -- outranks project order · finalises Oct 2, 3:50 AM CST · `select public.reverse_decision('f5f20cb3-e7d8-4f14-a2b5-078767b4456a','John','<why>');`
- `f5978a23` · concurrency · — · AGT-238 concurrency from the corpus: 2 project(s) executing in the order agent-training, dev-manager-capabilities · finalises Oct 2, 3:51 AM CST · `select public.reverse_decision('f5978a23-854f-47ae-a915-ad72f64510ab','John','<why>');`
- `536937af` · leverage · — · AGT-238 leverage first: AGT-005, AGT-020, AGT-006, PRO-3, AGR-01, AGT-017, AGT-159 marked as leverage -- outranks proje… · finalises Oct 2, 3:55 AM CST · `select public.reverse_decision('536937af-0d86-4280-9e6a-7b4b4fabddc1','John','<why>');`
- `549cd53a` · concurrency · — · AGT-238 concurrency from the corpus: 3 project(s) executing in the order agent-training, dev-manager-capabilities, trai… · finalises Oct 2, 3:55 AM CST · `select public.reverse_decision('549cd53a-d840-47e7-bf94-845c166af031','John','<why>');`
- `23ce3ad1` · agent-row · `SCA-4` · Drop the citations output field from the library-catalog-intent Skill row; the inline [id: ...] values its method alrea… · finalises Oct 2, 3:56 AM CST · `select public.reverse_decision('23ce3ad1-def1-4a1a-9b78-f99103f5c033','John','<why>');`
- `d653b3d3` · scope · `SCA-4` · Captured the library-catalog-intent retrieval gap as a finding instead of fixing it in SCA-4. · finalises Oct 2, 4:45 AM CST · `select public.reverse_decision('d653b3d3-0ce8-4735-8e2d-0068e93d15ec','John','<why>');`
- `fc66c2ad` · leverage · — · AGT-238 leverage first: AGR-01, AGT-020, AGT-017, PRO-3, AGT-006, AGT-159 marked as leverage -- outranks project order · finalises Oct 2, 4:48 AM CST · `select public.reverse_decision('fc66c2ad-65ef-47d3-a8d4-7f060ea772d6','John','<why>');`
- `7549f10c` · concurrency · — · AGT-238 concurrency from the corpus: 2 project(s) executing in the order agent-training, dev-manager-capabilities · finalises Oct 2, 4:48 AM CST · `select public.reverse_decision('7549f10c-4842-4ec2-96b4-e916070b01ff','John','<why>');`
- `1caed24e` · ticket-status · `CHI-83` · Close-out: CHI-83 settles 'delivered' · finalises Oct 2, 4:58 AM CST · `select public.reverse_decision('1caed24e-ce31-4518-818e-6c616e18e69e','John','<why>');`
- `afbfcdb0` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 2, 4:58 AM CST · `select public.reverse_decision('afbfcdb0-9440-4d97-9d02-6c3cfd093a11','John','<why>');`
- `756b15e4` · design-ruling · `AGT-136` · Open questions ruled by cycle e71c1a40-6b99-4113-bef4-01a75132469a: 3 question(s) — {"no": 3, "yes": 0, "john": 0, "wit… · finalises Oct 2, 5:05 AM CST · `select public.reverse_decision('756b15e4-5437-4dc1-8087-58f99ec31124','John','<why>');`
- `52bc25d5` · filing · — · Audit review 2026-W40: 16 findings → 1 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Oct 2, 5:09 AM CST · `select public.reverse_decision('52bc25d5-c652-41fa-b44e-b4ee308129fb','John','<why>');`
- `bb9cdc08` · leverage · — · AGT-238 leverage first: AGT-020, AGT-279, AGT-006, AGT-017, PRO-3, AGT-159 marked as leverage -- outranks project order · finalises Oct 2, 5:20 AM CST · `select public.reverse_decision('bb9cdc08-a20d-472f-965a-95e33395b616','John','<why>');`
- `64f51963` · concurrency · — · AGT-238 concurrency from the corpus: 2 project(s) executing in the order agent-training, dev-manager-capabilities · finalises Oct 2, 5:20 AM CST · `select public.reverse_decision('64f51963-3601-4684-afa3-0395dbbc85f3','John','<why>');`
- `1a53c305` · design · `AGT-020` · AGT-020 is designed: kickoff docs/kickoffs/v7.0.720-AGT-020-level-execution-depth.md, slice 1 of 2. · finalises Oct 2, 5:34 AM CST · `select public.reverse_decision('1a53c305-0a47-4361-a4f5-f5e569a0f6d4','John','<why>');`
- `57ab2fdc` · leverage · — · AGT-238 leverage first: AGT-020, AGT-279, PRO-3, AGT-006 marked as leverage -- outranks project order · finalises Oct 2, 5:42 AM CST · `select public.reverse_decision('57ab2fdc-f2b4-4191-9fb7-ba6efc0a8fdc','John','<why>');`
- `0fd6a6d4` · concurrency · — · AGT-238 concurrency from the corpus: 1 project(s) executing in the order agent-training · finalises Oct 2, 5:42 AM CST · `select public.reverse_decision('0fd6a6d4-7519-4975-812d-bb4f14be607f','John','<why>');`
- `f41770a9` · leverage · — · AGT-238 leverage first: AGT-006, AGT-279, AGT-017, PRO-3 marked as leverage -- outranks project order · finalises Oct 2, 5:48 AM CST · `select public.reverse_decision('f41770a9-025a-4ef0-8379-919a9a790cc7','John','<why>');`
- `75ffb595` · leverage · — · AGT-238 leverage first: AGT-279, AGT-006, PRO-3, AGT-159 marked as leverage -- outranks project order · finalises Oct 2, 5:52 AM CST · `select public.reverse_decision('75ffb595-f2b3-44b5-8df4-58fcae7afdc0','John','<why>');`
- `20b6ae49` · concurrency · — · AGT-238 concurrency from the corpus: 4 project(s) executing in the order agent-training, dev-manager-capabilities, trai… · finalises Oct 2, 5:52 AM CST · `select public.reverse_decision('20b6ae49-1823-4c79-9bc0-95edadda716d','John','<why>');`
- `fa8babf5` · scope · `AGT-020` · Captured agt-176b-cost-basis.test.mjs as a finding instead of fixing it inside AGT-020. · finalises Oct 2, 6:44 AM CST · `select public.reverse_decision('fa8babf5-825a-42b7-9e9f-0bc6137a326d','John','<why>');`
- `cfc0f4e8` · agent-row · `AGT-006` · public.agents is the authoritative roster; agents.js fills its blanks once · finalises Oct 2, 7:09 AM CST · `select public.reverse_decision('cfc0f4e8-3e4e-49d4-844e-b4f008c13335','John','<why>');`
- `21e50737` · ticket-status · `AGR-01` · AGR-01 kept its kickoff_link but design_status cleared from designed — the kickoff is not buildable as written · finalises Oct 2, 7:15 AM CST · `select public.reverse_decision('21e50737-5f48-4165-aa52-a8f163550b36','John','<why>');`
- `4ede7887` · ticket-status · `AGT-020` · Close-out: AGT-020 settles 'partial' · finalises Oct 2, 7:29 AM CST · `select public.reverse_decision('4ede7887-5e64-4c8d-b379-64ceb5ecdc5e','John','<why>');`
- `174e4452` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 2, 7:29 AM CST · `select public.reverse_decision('174e4452-0f94-4d5e-bf85-0e2197cec19c','John','<why>');`
- `475209f2` · ship · `AGT-020` · AGT-020 shipped at v7.0.721 (5ab95a4321ed97f0c85e8c1e36bf8a8991fd3c8d) on verdict 7f3a42ea-690e-4c42-ba30-3d31cb2803c6 · finalises Oct 2, 7:29 AM CST · `select public.reverse_decision('475209f2-327c-477d-9213-d62362e0ee17','John','<why>');`
- `65ff9112` · leverage · — · AGT-238 leverage first: AGT-020, AGT-279, PRO-3, AGT-159 marked as leverage -- outranks project order · finalises Oct 2, 7:38 AM CST · `select public.reverse_decision('65ff9112-38a6-497b-819b-984608aff38f','John','<why>');`
- `08a8bc63` · concurrency · — · AGT-238 concurrency from the corpus: 2 project(s) executing in the order agent-training, dev-manager-capabilities · finalises Oct 2, 7:38 AM CST · `select public.reverse_decision('08a8bc63-6c7b-426d-bd89-36e4e127008d','John','<why>');`
- `d6d214b9` · design · `AGT-020` · AGT-020 slice 2 is designed: kickoff docs/kickoffs/v7.0.724-AGT-020-tone-confidence-ride-along.md. · finalises Oct 2, 7:47 AM CST · `select public.reverse_decision('d6d214b9-7647-4821-ba6e-7e62951e606e','John','<why>');`
- `130d716b` · rollback · — · Auto-rollback held: ci-red on 5ab95a4 was not reverted (card-only) · finalises Oct 2, 7:55 AM CST · `select public.reverse_decision('130d716b-3d2b-491b-b803-8805cf4b0668','John','<why>');`
- `0af7e77c` · ticket-status · `AGT-006` · Close-out: AGT-006 settles 'partial' · finalises Oct 2, 9:01 AM CST · `select public.reverse_decision('0af7e77c-c9b0-4ff9-a358-626a8adbca30','John','<why>');`
- `a4ecf06b` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 2, 9:01 AM CST · `select public.reverse_decision('a4ecf06b-df80-462d-94b7-942bdb813c19','John','<why>');`
- `763ce38f` · ship · `AGT-006` · AGT-006 shipped at v7.0.722 (3ffddca81d8b74780f44636090c6a349e59f28c6) on verdict 8eedba59-d235-436a-8f2d-bb04fa522db8 · finalises Oct 2, 9:03 AM CST · `select public.reverse_decision('763ce38f-6eb2-4c17-a687-2c5e06c98a49','John','<why>');`
- `56606f34` · agent-row · `PRO-3` · Work Order Skill rows carry capability slugs, not 23 literal agent ids; the holder resolves at runtime. · finalises Oct 2, 9:18 AM CST · `select public.reverse_decision('56606f34-3491-4678-b6fb-8045cc182f2b','John','<why>');`
- `88b1105c` · leverage · — · AGT-238 leverage first: AGT-155, AGT-253 marked as leverage -- outranks project order · finalises Oct 2, 10:13 AM CST · `select public.reverse_decision('88b1105c-9698-4b55-ad48-766b784ae82b','John','<why>');`
- `ff747eea` · concurrency · — · AGT-238 concurrency from the corpus: 2 project(s) executing in the order agent-training, mcp-poc · finalises Oct 2, 10:13 AM CST · `select public.reverse_decision('ff747eea-83ec-45ee-a773-826f43ab17c6','John','<why>');`
- `3438863d` · removal · `AGT-155` · AGT-155 premise is dead for any cycle: six of its seven sentences are shipped and green, and the seventh is a routine p… · finalises Oct 2, 10:26 AM CST · `select public.reverse_decision('3438863d-eac5-4860-a43f-b6ab60ebf364','John','<why>');`
- `1ad1f253` · agent-row · `AGT-253` · AGT-253: re-pin dm-knowledge-cycle-card 10d95d49a44e283e → 400f9cb1c7db1bd1 · finalises Oct 2, 10:59 AM CST · `select public.reverse_decision('1ad1f253-04b7-481b-b58f-c2416772da75','John','<why>');`
- `7be76617` · model-catalog · — · Model catalog: 19 Claude model rows checked · finalises Oct 2, 11:03 AM CST · `select public.reverse_decision('7be76617-bfa8-405d-b005-02fe6af5a2dd','John','<why>');`
- `3442d970` · classification · `AGT-156` · AGT-156 classed P10 - Tooling, serves none · finalises Oct 2, 11:04 AM CST · `select public.reverse_decision('3442d970-a500-4a58-bb95-98b52593b784','John','<why>');`
- `aecca4e7` · model-catalog · — · Model catalog: 8 Claude model rows checked · finalises Oct 2, 11:10 AM CST · `select public.reverse_decision('aecca4e7-31e7-472c-9197-a4b6fd316ab9','John','<why>');`
- `39f0ae9f` · model-keep · — · capability/bench-report-card keeps claude-sonnet-4-6 · finalises Oct 2, 11:10 AM CST · `select public.reverse_decision('39f0ae9f-297d-4c72-b66c-8c2fdc20751c','John','<why>');`
- `2f85436b` · filing · — · Model assignment: capability/data-room-custody has no passing replacement -- ticket filed · finalises Oct 2, 11:10 AM CST · `select public.reverse_decision('2f85436b-f936-41f7-ba37-fd3aedc05747','John','<why>');`
- `1c148f95` · model-keep · — · lane/judgment keeps claude-fable-5-1 · finalises Oct 2, 11:10 AM CST · `select public.reverse_decision('1c148f95-f736-4279-8c56-6dba7897b2eb','John','<why>');`
- `bac1685a` · model-keep · — · lane/mechanical keeps claude-sonnet-5 · finalises Oct 2, 11:10 AM CST · `select public.reverse_decision('bac1685a-ce7c-4d6a-aa5e-f5b4c1f25a80','John','<why>');`
- `1bfef2f3` · model-keep · — · lane/orchestrator keeps claude-opus-5 · finalises Oct 2, 11:10 AM CST · `select public.reverse_decision('1bfef2f3-ba03-440d-b8e0-5ef6530b0558','John','<why>');`
- `616ceba7` · model-report · — · model-watch 2026-09-29: releases 13, retirements 10, watch reviewed 0, trials 0, switched 0, kept 4, reverted 0 · finalises Oct 2, 11:12 AM CST · `select public.reverse_decision('616ceba7-cf25-4b56-97a5-cf5c04799058','John','<why>');`
- `f71087b9` · leverage · — · AGT-238 leverage first: AGT-273, AGT-277 marked as leverage -- outranks project order · finalises Oct 2, 11:52 AM CST · `select public.reverse_decision('f71087b9-55fe-48e5-bff4-b6c2eb96038f','John','<why>');`
- `a6ad1ac7` · concurrency · — · AGT-238 concurrency from the corpus: 3 project(s) executing in the order tooling, agent-training, mcp-poc · finalises Oct 2, 11:52 AM CST · `select public.reverse_decision('a6ad1ac7-347a-4678-a08b-d1fc68a9ee03','John','<why>');`
- `e03b9a0f` · ticket-status · — · AGT-253 (v7.0.727): AGT-250/251/252 lose needs-desktop now that the design-only stop is on dev · finalises Oct 2, 11:59 AM CST · `select public.reverse_decision('e03b9a0f-4e10-4f25-81ae-3c748f9bcac3','John','<why>');`
- `f9c9006e` · defect-disposition · `AGT-156` · Captured the Builder's stale-comment defect as a finding rather than fixing it now · finalises Oct 2, 12:01 PM CST · `select public.reverse_decision('f9c9006e-feec-4767-b35e-b8b2a2347a64','John','<why>');`
- `79017e91` · ticket-scope · `AGT-253` · Captured the Builder's out-of-kickoff defect as a finding rather than fixing it in this build, and let its one in-scope… · finalises Oct 2, 12:12 PM CST · `select public.reverse_decision('79017e91-4afa-43f5-9a82-03dc10761f3a','John','<why>');`
- `06c2c29e` · ticket-status · `AGT-156` · Close-out: AGT-156 settles 'delivered' · finalises Oct 2, 12:17 PM CST · `select public.reverse_decision('06c2c29e-1708-43c3-ac9e-a3946d58eb24','John','<why>');`
- `9f591884` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 2, 12:17 PM CST · `select public.reverse_decision('9f591884-29aa-4e2d-9666-35e022009086','John','<why>');`
- `01c0b267` · filing · — · Audit review 2026-W40: 49 findings → 9 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Oct 2, 12:27 PM CST · `select public.reverse_decision('01c0b267-c5ac-426f-bcbd-3619bd005f41','John','<why>');`
- `8905ffaf` · ticket-status · `AGT-253` · Close-out: AGT-253 settles 'partial' · finalises Oct 2, 12:40 PM CST · `select public.reverse_decision('8905ffaf-f452-476d-919d-3f5db4d47c4e','John','<why>');`
- `a88a3a04` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 2, 12:40 PM CST · `select public.reverse_decision('a88a3a04-79f2-4dd1-bbc9-000c7a5ea7b2','John','<why>');`
- `e8a40847` · stall-report · — · Three peer cycles went quiet ~76-80 minutes ago; no claim released, nothing closed · finalises Oct 6, 10:44 AM CST · `select public.reverse_decision('e8a40847-92d2-4839-be4b-389f46cc4a34','John','<why>');`
- `9d2a40aa` · finding-capture · `AGT-273` · Builder deviation captured as a finding, not fixed now: the build lane has no path to apply DDL · finalises Oct 6, 12:10 PM CST · `select public.reverse_decision('9d2a40aa-755b-49e3-af8c-aeee6e33f907','John','<why>');`
- `0b6d5414` · john-ruling · — · test_slot_capacity 1 -> 3: suite runs share the database, throttled by health (John 2026-09-28 ~19:10 CT) · finalises Oct 28, 7:08 PM CST · `select public.reverse_decision('0b6d5414-6d2a-4eb3-84a0-c931d88eeacd','John','<why>');`
- `7b73ae2a` · john-ruling · — · db_health_thresholds iowait amber 35->18, red 60->35 (calibrated on the 2026-09-28 outage) · finalises Oct 28, 11:46 PM CST · `select public.reverse_decision('7b73ae2a-a4fd-42e2-8c68-63f11602004e','John','<why>');`
- `7eddb4d5` · other · — · Close dead cycle 9e519233 (AGT-164) and release 4 claims held by ended cycles so the overnight runner can pick them · finalises Oct 28, 11:52 PM CST · `select public.reverse_decision('7eddb4d5-19e1-4552-b606-4316fe2d9c62','John','<why>');`
- `4abbb67c` · scope · — · Restore John's locked Agent Training list: detach 19 tickets the AGT-159 review moved in at 02:21 CT 2026-09-29 · finalises Oct 29, 9:23 AM CST · `select public.reverse_decision('4abbb67c-9c66-443a-ae45-211083d7178e','John','<why>');`
- `b1f9fa92` · agent-row · — · Narrow the Development Manager's Agent Training exception to John's actual words: Jerry's and Nathan's own approved req… · finalises Oct 29, 9:39 AM CST · `select public.reverse_decision('b1f9fa92-f988-48f7-b895-aac74988f5c9','John','<why>');`
- `2136ce7c` · scope · — · John: tickets into Dev Mgr Findings / Auditor Findings (planned, capture only); stop AGT-020 and PRO-3 builds · finalises Oct 29, 9:48 AM CST · `select public.reverse_decision('2136ce7c-f5d3-43bc-984d-05ec67cd9fea','John','<why>');`
- `778839d2` · scope · — · John: AGT-159 moves to Dev Mgr Findings (capture only); any in-flight run on it is stopped · finalises Oct 29, 9:53 AM CST · `select public.reverse_decision('778839d2-5411-4ecf-baa8-b41ba4233b46','John','<why>');`
- `9d768717` · scope · — · John: AGT-141 moves to Dev Mgr Findings (capture only) · finalises Oct 29, 9:56 AM CST · `select public.reverse_decision('9d768717-1bf6-4143-ac87-36c16672bc32','John','<why>');`
- `ccab94da` · scope · — · John: every ticket the Development Manager files goes to Dev Mgr Findings (capture only) · finalises Oct 29, 9:57 AM CST · `select public.reverse_decision('ccab94da-81aa-4b9e-81ba-02cbfb376bb7','John','<why>');`
- `c3d83bfa` · scope · — · John: AGT-237 moves to Dev Mgr Findings (capture only) · finalises Oct 29, 9:58 AM CST · `select public.reverse_decision('c3d83bfa-cda5-4707-84c5-f66fad6ead3b','John','<why>');`
- `221454eb` · removal · — · Confirm 62 stuck removal proposals (non-John tickets) under M6-03; the Development Manager rules every future proposal · finalises Oct 29, 10:04 AM CST · `select public.reverse_decision('221454eb-6c25-443b-989a-2a1e22caba94','John','<why>');`
- `5c530260` · reversal · — · Partly reverse decision 221454eb: 41 of the 62 removals go back to removal proposed for the Development Manager to rule… · finalises Oct 29, 10:08 AM CST · `select public.reverse_decision('5c530260-591c-4766-8000-a4f3e8d405d4','John','<why>');`
- `f460f8c7` · scope · — · John: the 41 unevidenced removal proposals move to Builder Found Tickets, held for his later review · finalises Oct 29, 10:10 AM CST · `select public.reverse_decision('f460f8c7-f243-49c6-8d7a-b6879f41ceaa','John','<why>');`
- `a184ba88` · removal · — · John: AGT-141 removed -- a requirement Claude invented, never John's · finalises Oct 29, 10:17 AM CST · `select public.reverse_decision('a184ba88-8906-48ed-aba2-a790c62f2d52','John','<why>');`
- `91d12775` · agent-row · — · Brittany (MK-07) switched on under John's 2026-09-15 ruling: an agent from a ticket he discussed needs no second approv… · finalises Oct 29, 10:39 AM CST · `select public.reverse_decision('91d12775-4ec0-442a-b2f3-a59d381129f6','John','<why>');`
- `3fbf38f7` · ticket-status · `AGT-155` · AGT-155 complete: the Wednesday routine now carries the COMPETITOR LEADS block (pasted by attended session status-0929) · finalises Oct 29, 10:51 AM CST · `select public.reverse_decision('3fbf38f7-6f11-4e59-a291-bed745e5c883','John','<why>');`
- `2c38d860` · scope · — · John: AGT-273, AGT-277, AGT-237 into new project Tooling, active · finalises Oct 29, 11:48 AM CST · `select public.reverse_decision('2c38d860-9cf8-40d9-8c05-86e806c32d9c','John','<why>');`

**170 final this week, 4 reversed this week** — *this week* is a **rolling 7 days** back from the stamp, not a calendar week and not a Friday-07:00Z reset: no such weekly-reset helper exists in this file or anywhere in `scripts/`, so a rolling window is what is used and is labelled as one. A reversal is the strongest negative signal the ladder takes (`M6-07`), so the second number is the one to read first.

**Decided for you** — *as of 2026-09-29 17:40Z (Sep 29, 12:40 PM CST).* What the runner DECIDED on your behalf, by CST day (`governance_rules.MANAGER-DECIDES-BY-DEFAULT`: *a daily list of what was decided, not questions*), with the questions that reached you anyway counted beside it — target zero. Not the `Open decisions` group above: that one is the undo list and drops a decision the moment it finalises; this one is the record of the day and keeps it. **114 decided on 2026-09-29**; **5 question(s) reached you in the last 7 days — target zero**; 0 still open.

| CST day | decided | reversed | questions to you |
|---|---:|---:|---:|
| `2026-09-29` | 114 | 1 | 0 |
| `2026-09-28` | 199 | 1 | 1 |
| `2026-09-27` | 186 | 2 | 2 |
| `2026-09-26` | 66 | 0 | 0 |
| `2026-09-25` | 32 | 0 | 0 |
| `2026-09-24` | 39 | 0 | 2 |
| `2026-09-23` | 32 | 0 | 0 |

**The 114 decided on 2026-09-29** — newest first.

- `a88a3a04` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · open
- `8905ffaf` · ticket-status · `AGT-253` · Close-out: AGT-253 settles 'partial' · open
- `01c0b267` · filing · — · Audit review 2026-W40: 49 findings → 9 tickets, 0 not-a-defect, 0 carried, 0 escalated · open
- `9f591884` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · open
- `06c2c29e` · ticket-status · `AGT-156` · Close-out: AGT-156 settles 'delivered' · open
- `79017e91` · ticket-scope · `AGT-253` · Captured the Builder's out-of-kickoff defect as a finding rather than fixing it in this build, and let its one in-scope… · open
- `9d2a40aa` · finding-capture · `AGT-273` · Builder deviation captured as a finding, not fixed now: the build lane has no path to apply DDL · open
- `f9c9006e` · defect-disposition · `AGT-156` · Captured the Builder's stale-comment defect as a finding rather than fixing it now · open
- `e03b9a0f` · ticket-status · — · AGT-253 (v7.0.727): AGT-250/251/252 lose needs-desktop now that the design-only stop is on dev · open
- `a6ad1ac7` · concurrency · — · AGT-238 concurrency from the corpus: 3 project(s) executing in the order tooling, agent-training, mcp-poc · open
- `f71087b9` · leverage · — · AGT-238 leverage first: AGT-273, AGT-277 marked as leverage -- outranks project order · open
- `2c38d860` · scope · — · John: AGT-273, AGT-277, AGT-237 into new project Tooling, active · open
- `616ceba7` · model-report · — · model-watch 2026-09-29: releases 13, retirements 10, watch reviewed 0, trials 0, switched 0, kept 4, reverted 0 · open
- `1bfef2f3` · model-keep · — · lane/orchestrator keeps claude-opus-5 · open
- `2f85436b` · filing · — · Model assignment: capability/data-room-custody has no passing replacement -- ticket filed · open
- `1c148f95` · model-keep · — · lane/judgment keeps claude-fable-5-1 · open
- `bac1685a` · model-keep · — · lane/mechanical keeps claude-sonnet-5 · open
- `aecca4e7` · model-catalog · — · Model catalog: 8 Claude model rows checked · open
- `39f0ae9f` · model-keep · — · capability/bench-report-card keeps claude-sonnet-4-6 · open
- `3442d970` · classification · `AGT-156` · AGT-156 classed P10 - Tooling, serves none · open
- `7be76617` · model-catalog · — · Model catalog: 19 Claude model rows checked · open
- `1ad1f253` · agent-row · `AGT-253` · AGT-253: re-pin dm-knowledge-cycle-card 10d95d49a44e283e → 400f9cb1c7db1bd1 · open
- `3fbf38f7` · ticket-status · `AGT-155` · AGT-155 complete: the Wednesday routine now carries the COMPETITOR LEADS block (pasted by attended session status-0929) · open
- `e8a40847` · stall-report · — · Three peer cycles went quiet ~76-80 minutes ago; no claim released, nothing closed · open
- `91d12775` · agent-row · — · Brittany (MK-07) switched on under John's 2026-09-15 ruling: an agent from a ticket he discussed needs no second approv… · open
- …and 89 more decided that day · `select id, kind, backlog_id, summary, status from public.runner_decisions where (decided_at at time zone 'America/Chicago')::date = '2026-09-29' order by decided_at desc;`

**Judgment classes** — *as of 2026-09-29 17:40Z (Sep 29, 12:40 PM CST).* What the corpus currently holds per pull test, live from `public.judgment_class_census` (`SES-84`; the same view `SES-159` reads). Ratification is a standing metric (John, 2026-08-23: a class is never finished being learned), never a finish line.

| class | ratified | proposed | rejected | total |
|---|---:|---:|---:|---:|
| `P1 - Improves John's Skills` | 7 | 31 | 6 | 44 |
| `P2 - Inventive` | 0 | 95 | 16 | 111 |
| `P3 - Investor Value` | 0 | 86 | 7 | 93 |
| `P4 - New Customers` | 1 | 37 | 3 | 41 |
| `neutral` | 0 | 83 | 30 | 113 |

- Newest proposed root claim for P1: *no proposed root claim*.
- Newest proposed root claim for P2: `VC-SYN-002` — Inventive features are the least-tested product goal because the bar John set — something competitors cannot easily copy — he has never applied to a real featu…
- Newest proposed root claim for P3: `VC-SYN-001` — Investor value is the least-defined product goal because nobody has yet said what an investor would check. The drafts agree on one reading: the buyer is a skep…
- Newest proposed root claim for P4: `VC-ROOT-004` — New features that win new customers. The bar is buy-pull — functionality that makes a customer say "I have to buy this." Administrative capability (accounts, b…

- **FLAG: 4 live claims still `unclassed`** — after `SES-84` this is zero by construction; a non-zero here is drift (a claim inserted without a classing decision) and needs one recorded decision, never a default.

**John-model** — *as of 2026-09-29 17:40Z (Sep 29, 12:40 PM CST).* How often a decision that leaned on a standing pattern of John's stood unreversed through its window, live from `public.john_model_signal` (`SES-004`; the criteria are `public.decision_patterns`, exported from `docs/JOHN-DECISION-PATTERNS.md`). A rate binds only from 30 finalised-or-reversed decisions (M7 gate, ruling iii).

- **98.7% agreement** over 377 finalised-or-reversed decisions (372 finalised unreversed, 5 reversed; 306 still open, 683 citing in total). A reversal is the strongest negative signal the ladder takes, so the second number is the one to read first.

| criterion | citing | final unreversed | reversed | open | rate |
|---|---:|---:|---:|---:|---:|
| `pattern:0` No standing pattern applied -- new judgment. | 344 | 191 | 1 | 152 | 99.5% |
| `pattern:9` Never spend a model call where a deterministic mechanism serves. | 89 | 9 | 0 | 80 | — |
| `pattern:14` When two code paths compute the same thing, build one shared core they both cal… | 82 | 6 | 0 | 76 | — |
| `pattern:137` P1–P4 are pull tests, not category labels — administrative expectations never q… | 80 | 77 | 0 | 3 | 100% |
| `pattern:162` A check grades the change, never the live world. | 59 | 15 | 0 | 44 | — |

- A per-pattern `—` is not a zero: that criterion has not reached 30 finalised-or-reversed citations of its own, so it carries counts and no rate.

**Invention in use** — *as of 2026-09-29 17:40Z (Sep 29, 12:40 PM CST).* Criterion 7 (`docs/SELFBUILD-CHARTER.md`): at least one platform-originated feature — the Bench Report Card judge (`LOG-143`) — is measurably used by real visitors, live from `public.report_card_usage`. Counts only, never a rate.

- **7d:** 0 judge runs, 0 by real visitors (0 distinct).
- **30d:** 3 judge runs, 0 by real visitors (0 distinct).
- **all:** 3 judge runs, 0 by real visitors (0 distinct).

- *no real-visitor use yet.*

**Board by served class** — *as of 2026-09-29 17:40Z (Sep 29, 12:40 PM CST).* Which class each open ticket SERVES under the served-class test (`VC-MISSION-033`), ruled by The Prioritizer's `classify-ticket` and stored on `backlog_items.supports_class` — a ticket's own class is a different question and is not restated here.

| serves | open tickets |
|---|---:|
| `P1 - Improves John's Skills` | 82 |
| `P2 - Inventive` | 11 |
| `P3 - Investor Value` | 5 |
| `P4 - New Customers` | 2 |
| `P7 - Agent Creation` | 1 |
| *serves none* | 551 |

- *Negative ranks are John's own automation queue, seeded to sort ahead of anything assigned later (`SES-86`). The nightly re-rank writes 1..N and therefore sits below them — intended precedence, not a re-rank that failed.*

- **Top 5 by `automation_rank`:**
  -35. `SES-288` — A schema-range red can never be auto-reverted: one refused down-migration disables rollba… *(serves none)*
  4. `AGT-253` — Design-only projects: the runner's Designer designs their tickets and the cycle stops bef… *(serves none)*
  4. `AGT-165` — Onboarding page on DeepBench: how the tester connects Brittany to Claude *(serves none)*
  4. `SES-337` — The Verifier agent must reproduce the last 30 recorded verdicts before it grades a ship,… *(serves P1 - Improves John's Skills)*
  5. `SES-392` — The meter reader fails silently: exit 2 from 13:15 CT to 19:20 CT on 2026-09-12 with no l… *(serves P2 - Inventive)*

- Last scheduled re-rank: Sep 29, 12:30 AM CST.

**Governance agents, last 7 days** — *as of 2026-09-29 17:40Z (Sep 29, 12:40 PM CST).* Whether the platform's own agents (`agents.lane = 'governance'`) are doing the development work, live from `public.governance_agent_usage` and `public.ship_handoff_census` (`SES-360`). A **rolling 7 days** back from render time, like the decision counts above. Counts and token sums only, never a rate.

| role | source | calls | input tokens | output tokens |
|---|---|---:|---:|---:|
| Governance — Development Manager | `session` | 167 (146 untokened) | 1019133 | 440061 |
| Governance — Researcher | `session` | 2 (2 untokened) | 0 | 0 |
| Governance — Prioritizer | `session` | 25 (18 untokened) | 334404 | 3054 |
| Governance — Prioritizer | *unlabelled* | 864 (864 untokened) | 0 | 0 |
| Governance — Designer | `session` | 159 (141 untokened) | 2430695 | 195000 |
| Governance — Builder | `session` | 119 (110 untokened) | 1542843 | 138000 |
| Governance — Verifier | *no calls in the window* | 0 | — | — |
| Governance — Auditor | `session` | 41 (29 untokened) | 651208 | 86558 |
| Governance — Ticket Owner | `session` | 9 | 0 | 0 |

- **Ships with all four handoff rows: 48 of 93** ships in the window (`SES-345`'s four: `automation_rank`, `kickoff_link`, a per-ticket push sha, a verdict row). Missing per leg: kickoff_link 1, per-ticket sha 3, automation_rank 45, verdict 1.
- *unlabelled* is a NULL `call_source` — the pre-attribution unknown, never read as automation (`LOG-128`); `untokened` rows carry no token counts at all (deterministic handler rows), so a large call count beside a small token sum is that, not a cheap model.

**Auditor's ledger** — *as of 2026-09-29 17:40Z (Sep 29, 12:40 PM CST).* What `public.audit_findings` (`AGT-70`) holds and what has left it for the board. Counts only, never a rate. Latest week 2026-W40: **449 findings (30 open · 0 resolved · 9 not a defect)** — **0 ruled** open findings (a ruled, open, `high` row is what `tripwire-to-backlog.js --from-ledger` files, at most 3 per ISO week); **0 filed** to the board from the ledger so far (`source_file = 'audit-ledger'`).

| fingerprint | kind | confidence | fact | ruled |
|---|---|---|---|---|
| `06d8f4e2105afd85` | other | high | kickoff carried no lane declaration on first assembly | — |
| `0ef82bd8c91c7482` | other | high | a ledger line a human reads must render its value, never an object placeholder | — |
| `12ce8aac8e4e56e2` | other | high | assignment differs from the queue head | — |
| `2055fc233a225ddd` | other | high | build needed a fact the kickoff did not carry | — |
| `24d82772f762c589` | other | high | build needed a fact the kickoff did not carry | — |
| `2563102d51fb48e1` | other | high | assignment agt-155 differs from prime_directive_queue() head 009eeb7a (john dir… | — |
| `2ef2a60b69caaad3` | other | high | build needed a fact the kickoff did not carry | — |
| `33863630e9349337` | contradiction | high | A migration whose down capture was refused, with derived_down_sql null, carries… | — |
| `3794f51774592b8f` | other | high | build needed a fact the kickoff did not carry | — |
| `4abe6d1388b72c49` | contradiction | high | How many backlog-review findings had been raised when the card was written: aud… | — |
| `5ad82708af6dbeb1` | other | high | kickoff section 4 specified a skill row with llm_model null and no traits.handl… | — |
| `61de2267a16d828d` | other | high | build needed a fact the kickoff did not carry | — |
| `666611e8aefecc39` | other | high | assignment differs from the queue head | — |
| `6f28fb48e11b22f9` | other | high | Ticket Owner check type-off-taxonomy holds open judgment rows a capability must… | — |
| `7a0ef23e40e5cd84` | other | high | build needed a fact the kickoff did not carry | — |
| `7bb7c07cde570fe7` | other | high | kickoff carried no lane declaration on first assembly | — |
| `7be0a3c16ef09e7e` | other | high | build needed a fact the kickoff did not carry | — |
| `994f677883c39479` | other | high | assignment differs from the queue head | — |
| `af8afd3ee5eea40b` | other | high | kickoff carried no lane declaration on first assembly | — |
| `afe2d6dda0bec52e` | other | high | kickoff carried no lane declaration on first assembly | — |
| `b7efbc7f7006e4d7` | other | high | build needed a fact the kickoff did not carry | — |
| `b9a1eff544a353c1` | other | high | Ticket Owner check delivered-unaccepted holds open judgment rows a capability m… | — |
| `bb5917300f612622` | other | high | build needed a fact the kickoff did not carry | — |
| `bcb3936396620dc9` | other | high | build needed a fact the kickoff did not carry | — |
| `cc862a5a27e97b0e` | duplicate | high | One close-out of one ticket is one reversal; AGT-266's close-out carries three… | — |
| `e466c6f50f151f92` | contradiction | high | Which step this cycle last reached: its row says it is still waiting for a test… | — |
| `ee15983cbe27a2e6` | other | high | build needed a fact the kickoff did not carry | — |
| `1fc488543fe22bb8` | contradiction | medium | How many of the 341 regression tests passed on graded sha 63241a5c: the verdict… | — |
| `72dd0cb9e3e7e0bd` | contradiction | medium | Which files this cycle's second push carried: the record says the backlog snaps… | — |
| `8cb6d3557727e232` | other | medium | runner_verdicts is the only surviving record of what a verdict graded; row 58d0… | — |

- *A finding leaves this table only by John's ruling — `resolved`, `not-a-defect`, or ruled and left `open` to file. Candidates a run found but nobody ingested live in `docs/audits/<week>-candidates.json`, not here.*

**Ticket hygiene, last night** — *as of 2026-09-29 17:40Z (Sep 29, 12:40 PM CST).* What the Ticket Owner (`AGT-79`) left on the board: `public.ticket_owner_findings` open rows by check, the newest `hygiene` decision and the newest nightly cycle row. Counts only, never a rate. **165 open findings** across 8 check(s).

| check | open | oldest | nights open |
|---|---:|---|---:|
| `verdict-missing` | 48 | Sep 12, 10:31 PM CST | 16 |
| `size-missing` | 34 | Sep 12, 10:31 PM CST | 16 |
| `type-off-taxonomy` | 26 | Sep 12, 10:31 PM CST | 16 |
| `delivered-unaccepted` | 20 | Sep 12, 10:31 PM CST | 16 |
| `designed-closed` | 17 | Sep 23, 7:50 PM CST | 5 |
| `quote-missing` | 11 | Sep 12, 10:31 PM CST | 16 |
| `remainder-stranded` | 6 | Sep 18, 5:38 AM CST | 11 |
| `cycles-over-quote` | 3 | Sep 12, 10:31 PM CST | 16 |

- Last run: `86720a4f` · shipped · Sep 29, 12:41 AM CST · 1037 rows · 212 findings (33 derivable · 179 judgment) · behind the fences: quote 525 · size 493 · cost 45 · verdict 97 · unrevalidated>30d 432 · attended-actual null 376 · revalidation 432 left (batch 25, carried 12) · retired 1 check / 130 rows · fixed 33 · proposed 14 · findings +9 ~156 −23 · decision ce4db35d-15b4-4157-907e-55c48230091b — reversible until 2026-10-02T05:41:20.110126+00:00 · judged 33/2/0 on claude-fable-5-1
- Judgment: **the newest night was judged** — 0 unjudged nights on top, over the newest 14 on record.
- Decision `ce4db35d` · open · Ticket Owner: 33 derivable cell fix(es) on 33 row(s) — cost 8 · claim 2 · type 0 · revalidation 23 · finalises Oct 2, 12:41 AM CST · `select public.reverse_decision('ce4db35d-15b4-4157-907e-55c48230091b','John','<why>');`

**Staff watch** — *as of 2026-09-29 17:40Z (Sep 29, 12:40 PM CST).* What the Development Manager (`SES-378`) recorded about the runner's own agents: `public.runner_staff_findings` rows per `agent_id`, with the distinct fingerprints and the distinct CYCLES behind them. Counts only, never a rate. **83 finding(s)** across 2 agent(s).

| agent | findings | distinct fingerprints | distinct cycles | newest |
|---|---:|---:|---:|---|
| `designer` | 71 | 12 | 62 | Sep 29, 12:11 PM CST |
| `devmanager` | 12 | 5 | 12 | Sep 29, 12:45 AM CST |

**Human gates** — *as of 2026-09-29 17:40Z (Sep 29, 12:40 PM CST).* The two reads that say whether anything is waiting on a human: open `backlog_items` carrying `design_status = 'needs-john'`, and `gated_before_build` `runner_items` left with `decision IS NULL` (`M6-01`). Board state, written by no code in this repo — which is why it is REPORTED here and not asserted as a gate by the regression suite. **1 open `needs-john` ticket(s)**, **9 undecided `gated_before_build` card(s)**.

- **`needs-john` (1):** `AGT-110`
- **Undecided gated cards (9):** `54b42eea-be4f-434d-963a-6707873bc137`, `2d5441c7-5133-4b21-9768-7921dce0c409`, `30c70c89-4e49-472b-be96-461520db36d9`, `1440625e-99ef-472d-ab9a-081ca56f234a`, `5ec900f0-63a9-4606-a39d-e4921bac0bd5` …and 4 more
- *Open is not wrong.* A card nobody has answered yet is a real board state; what it is NOT is a regression, so nothing in the suite goes red for it.

*Provenance: 1000 board rows, payload `sha256:4b5e55f08bab0b96`, as of 2026-09-29 17:40Z (Sep 29, 12:40 PM CST). The stamp says when this was last read; the sha says whether it still matches the tables. `--check` compares the sha, never the stamp — a refreshed stamp over identical facts is not drift.*
<!-- END GENERATED — scripts/render-standing-brief.js -->

**Next session:** none required — the runner is live and works **John's automation queue** (canonical: `docs/RUNNER-GOV-0820-REQUIREMENTS.md`): the queue is the board's leading sort key, not a list to read (`automation_rank`, v7.0.133) — `ORDER BY queue` already honours it. Classes are always written named, **`P1 - Improves John's Skills` → `P10 - Tooling`**; outcomes as plain words (“did not run”, “gated before build”); budget is two-track (API dollars + token governor). John judges from the briefing page. Runner pause: disable `deepbench-runner` at claude.ai/code/routines. **Board census measured 2026-08-23T12:5xZ by runner cycle `363b5138`, taken from the board after its own close-out recompute rather than carried forward:** **561 open tickets, 561 numbered, 0 open-but-unnumbered**, 611 rows total, **the standing Automation drain now has a FIXED finish line** — from `v7.0.179` (`SES-142`) it works the **18 members John named** on directive `b74009ea`, stored as `runner_drain_scope` FK rows, and a ticket filed into the epic *after* that naming **never joins it**: it queues normally and waits for him. The live `now` tier had already drifted to 19 against his 18. `drain_epic_next()` retires when those 18 are `done`/`removed`, and returns the new outcome **`unscoped`** — never a live-tier fallback — for any future drain declared without a list. Queue/drain state as of **v7.0.196** (2026-08-23 ~17:00Z, `successional-review` close-out, 561 rows renumbered): `SES-140` — *the successor fire is refused by the platform* and `SES-151` — *the scheduler runs on John's clock grid* are both **`done`**; the drain's nearest open member `SES-84` — *the vision corpus* (`needs-john`) waits on John's briefing decisions, so cycles step past it (`SES-114`) and work the board (`SES-121` — *shrink the `.claude/`-mutable surface* went `done` at v7.0.198; procedure text now lives in `docs/runbooks/`, cycle-writable). **The board's `title` column is trustworthy for display for the first time** (`SES-91`, v7.0.177): 98 rows that held a bare priority-class string now carry a real authored title, and the only `^P[0-9]+ - ` title left is `ADM-1`, whose title is a real sentence behind a stale class prefix and is deliberately left for `SES-117` to **accommodate** rather than repair. `SES-119` is now `done` (v7.0.184 + v7.0.185): the briefing renders `public.backlog_display_title(title, description)` rather than the read-time `gist` workaround, and **`runner-cycle.md`'s Language block now requires a ticket's title wherever John reads its ID**. Step 5's `gist` expression deliberately stays — it is still correct for any future row filed the old way, and 50 of 562 open numbered tickets still fall back to it. **From v7.0.195 the chain runs IN-SESSION (`SES-140` FINAL)** — a cycle that actually ran one (`shipped`/`gated_before_build`/`reverted`) and whose drain still returns `pick` opens its next `runner_cycles` row (trigger `chained (drain continuation)`) **in the same session** and re-enters the runbook at step 1; session-spawning is retired as platform-unsupported (`runner-cycle.md` tail step (8) carries the evidence). A **wall-stopped cycle continues nothing**, which keeps the budget wall a brake rather than a metronome. Proven live 2026-08-23: cycles `1fcd687e` → `a11c94d2`, the first chained row in the runner's life. **The briefing-redesign epic is finished** — `SES-129`, its last member, shipped in cycle `ed1a5eb3`. **A new filing rule binds from this version:** `runner_items.backlog_id` takes a **bare** ticket id or NULL and is enforced by `ck_runner_items_backlog_id_bare`; the display string belongs in `display_ref`, and the briefing's id chip reads `coalesce(backlog_id, display_ref)` (`SES-116`, v7.0.174 — `runner-cycle.md` step 9). **`design_status` reads for selection (`SES-114`, v7.0.165); among OPEN tickets measured at the v7.0.198 close-out:** 16 `designed` (incl. `SES-101`, flipped from `needs-desktop` — its one remaining edit now lives in `docs/runbooks/session-setup.md` step 3c, cycle-writable), **0 `needs-desktop`**, **1 `needs-john`** (`SES-84`), 546 `NULL` = not yet triaged, deliberately not guessed to `auto`. Measured at the v7.0.198 close-out: **11 of John's 18 named members remain open** (`SES-121` retired from the list by going `done` this session); the only `needs-john` member is `SES-84` — the rest are buildable, the drain reaches them and can retire on them. **`CHI-89`** still holds its queue slot with its removal card undecided — visible to John and skipped by cycles, exactly as `SES-113` intended. **`SES-133` is still open at `partial`** — the other half of John's 2026-08-23 emergencies directive; it sits at queue 251 rather than at the top, because the drain reads the Automation epic's `now` tier in queue order and `SES-133` is not in that epic. **From v7.0.182 John's own switches govern the cadence** (`SES-143`): the briefing's **§2b Automation panel** carries a scheduler checkbox + an every-N-hours box (the generated block above is the only home for their live values — it renders `runner_settings` row 1 fresh each cycle, `SES-151`) and a drain checkbox, and `runner-cycle.md`'s **new step 1b** calls `public.scheduler_gate()` before anything else — a scheduled cycle arriving early closes `did_not_run` with *"paced by your scheduler setting"*, and with the scheduler off it closes *"scheduler off"*. **The cron is John's own routine switch** — a cycle cannot edit its own routine — and **from v7.0.196 (`SES-151`) the gate paces by John's clock grid**: a scheduled fire runs iff its row's `started_at` falls in an America/Chicago hour divisible by `runner_settings.interval_hours` — row 1, read live, never a number written here — and the routine's cron fires in that hour (DST-proof; the mixed-clock elapsed test that wrongly paced 3 of 9 hourly fires is dead, `q-hourly-interval-boundary` answered by ship). Two consequences worth knowing before reading a quiet night as a stall: the gate **fails open** on every unknown, and it governs **scheduled** fires only, so a standing drain's chained continuation cycles run regardless — while the Automation drain stands, **the chain and not the interval is what actually sets the pace**. A manual fire (off the cron grid) is never paced; whether that is what John wants is the one thing the spec leaves open, asked as `q-manual-fire-pacing`. **From v7.0.188 that gate actually fires** (`SES-146`): until then `scheduler_gate()` matched the trigger by exact equality against the bare word `scheduled`, so a cycle passing the verbatim line step 1b asks for — `trigger: scheduled` — fell through to *"not a scheduled cycle"* and skipped **both** the pacing branch and the `scheduler_on = false` branch, and the grid test compared `now()`-at-step-1b rather than the fire time against a hardcoded ±2. Both failed open, so the panel looked live and bound nothing. The trigger is now normalised, the grid is anchored to the cycle row's own `started_at`, and the tolerance is the column `runner_settings.grid_tolerance_min` (10). **Silence is not a “no”** on any open question. **From v7.0.183 the board's open status is `open`, never `missing`** (`SES-118`): `backlog_items_status_check` now allows exactly `('open','partial','done','removal proposed','removed')` and the retired value raises `23514` — 510 rows renamed, `updated_at` deliberately untouched so step 8c's 30-day revalidation sweep still sees the sinking tail. **That consequence closed at v7.0.189** (attended session `ses118-gated`, 2026-08-23): step 3c's INSERT now writes `'open'`, zero `'missing'` literals remain under `.claude/`, and `SES-118` is `done` — its gated card `76564dde` awaits John's decision on the briefing page.
