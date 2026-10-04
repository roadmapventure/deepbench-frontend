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
## Live board state — generated, do not hand-edit — *as of 2026-10-03 18:28Z (Oct 3, 1:28 PM CST)*

> Rendered from the tables by `scripts/render-standing-brief.js` at every ship. **Every number below is derived; nothing here is maintained by hand.** The judgment prose beneath this block is the opposite — hand-maintained, deliberately, and this script never writes outside these markers. Where the two disagree about a number, this block is right and the sentence below is stale: say so rather than reconciling them by hand.

**Board census** — *as of 2026-10-03 18:28Z (Oct 3, 1:28 PM CST).* **654 open tickets**, 632 numbered, **22 open-but-unnumbered**, 1000 rows total.

| `status` | rows | share of board |
|---|---:|---:|
| `open` | 480 | 48% |
| `done` | 264 | 26.4% |
| `delivered` | 94 | 9.4% |
| `removed` | 82 | 8.2% |
| `partial` | 43 | 4.3% |
| `removal proposed` | 37 | 3.7% |

**`design_status` among OPEN tickets** — *as of 2026-10-03 18:28Z (Oct 3, 1:28 PM CST).* Reads for selection (`SES-114`); `NULL` is *not* `auto`, it is not-yet-triaged and no cycle may backfill it.

| `design_status` | open rows | selection effect |
|---|---:|---|
| `NULL` | 584 | full ceremony — not yet triaged |
| `needs-decision` | 33 | — |
| `designed` | 23 | **not a skip** — build from `kickoff_link` (step 6 fast path) |
| `needs-desktop` | 13 | skipped, `record_skip()` — needs a session John attends (B39) |
| `needs-john` | 1 | skipped, `record_skip()` — John decides on a card |

**Scheduler and automation settings** — *as of 2026-10-03 18:28Z (Oct 3, 1:28 PM CST).* §2b of the briefing, John's own switches, binding via `scheduler_gate()` at step 1b:

- Scheduler: **on**, every **1 hour** on John's clock grid (America/Chicago hours divisible by the interval — `SES-151`, DST-proof).
- Cron minute **40**, manual-fire tolerance **±10 min** (a start outside it is treated as a manual fire and is never paced).
- Standing daily max: **196M tokens**. This is rung 3 of five, **below** the 48h stale floor: a standing number must not defeat the staleness brake.

**Standing epic drain** — *as of 2026-10-03 18:28Z (Oct 3, 1:28 PM CST).* Created only by John; the runner may read one, never write one (`drain_epic_next()` property 5). The finish line is drawn from the members he **named** (`runner_drain_scope`), never the live `now` tier (`SES-142`) — and within that list it is the members a milestone **gate ruled required** (`milestone_required`, `SES-310`) whenever the list carries such a ruling, every named member otherwise.

- **No drain standing.** Selection is the class-sorted board exactly as it is with no drain declared.

**Proposed projects** — *as of 2026-10-03 18:28Z (Oct 3, 1:28 PM CST).* A project whose batch finished proposes the next one (`AGT-240`): The Auditor grades what it built, The Development Manager proposes ONE project with its tickets and why. Its tickets are normal backlog rows the runner does not pick until you say yes. **0 proposed.**

- **None** — a measured none: no finished batch has proposed a project.

**Open decisions** — *as of 2026-10-03 18:28Z (Oct 3, 1:28 PM CST).* Decisions made under `M6-02` that are still inside their reversal window (`runner_settings.reversal_window_hours` = 72h). Silence finalises them; to reverse one, run the line beside it (`docs/runbooks/session-setup.md` § Reversing a decision).

- `a38f649e` · reversal · `ZAGTPBC-1` · reversal of requirement-check decision c33763f0-bb6e-4d70-b5c0-ff9912dbf693 -- applied: 1 restored, 0 restored-unverifi… · finalises Oct 3, 1:18 PM CST · `select public.reverse_decision('a38f649e-acc4-4e6e-aa1d-9b7399204945','John','<why>');`
- `bc530aec` · classification · — · board ordered: 1 ticket(s) given an automation_rank · finalises Oct 5, 1:57 AM CST · `select public.reverse_decision('bc530aec-7d00-43e6-89ca-cc13e238c01e','John','<why>');`
- `a7be1220` · hygiene · `AGT-79` · Ticket Owner: 33 derivable cell fix(es) on 31 row(s) — cost 7 · claim 2 · type 0 · revalidation 24 · finalises Oct 5, 2:05 AM CST · `select public.reverse_decision('a7be1220-2998-4db1-8358-81f589ee1f09','John','<why>');`
- `41c32cfe` · removal-proposal · `DL-04` · DL-04 removal proposed: Built: public.deliverables exists live with every column the premise names (is_final, is_shared… · finalises Oct 5, 2:05 AM CST · `select public.reverse_decision('41c32cfe-958e-482b-b0ac-499b92570720','John','<why>');`
- `6b1b45e7` · leverage · — · AGT-238 leverage first: AGT-281 marked as leverage -- outranks project order · finalises Oct 5, 2:11 AM CST · `select public.reverse_decision('6b1b45e7-6db7-4bb2-a3b5-8e4edcae8a58','John','<why>');`
- `feb60c33` · concurrency · — · AGT-238 concurrency from the corpus: 1 project(s) executing in the order agent-training · finalises Oct 5, 2:11 AM CST · `select public.reverse_decision('feb60c33-d2d2-468f-8afd-648dc4231312','John','<why>');`
- `5ed6e033` · rollback · — · Auto-rollback held: ci-red on 6faa129 was not reverted (card-only) · finalises Oct 5, 2:52 AM CST · `select public.reverse_decision('5ed6e033-0819-4fcb-8fc7-3e9cd9db543c','John','<why>');`
- `eccf0a2f` · leverage · — · AGT-238 leverage first: AGT-281 marked as leverage -- outranks project order · finalises Oct 5, 2:58 AM CST · `select public.reverse_decision('eccf0a2f-bf17-499c-87d0-aab1b3dd6287','John','<why>');`
- `9104f489` · concurrency · — · AGT-238 concurrency from the corpus: 3 project(s) executing in the order agent-training, tooling, trainer-authored-agen… · finalises Oct 5, 2:58 AM CST · `select public.reverse_decision('9104f489-ffe0-4db6-8177-5a95f07a1668','John','<why>');`
- `7f4588e9` · design-ruling · `AGT-136` · Open questions ruled by cycle cb9dc3f6-5c8d-405a-bad9-2c776646c479: 8 question(s) — {"no": 4, "yes": 0, "john": 4, "wit… · finalises Oct 5, 3:21 AM CST · `select public.reverse_decision('7f4588e9-9ed8-44a5-bac1-32348323d9c8','John','<why>');`
- `dbb15e1e` · learning · `SES-159` · class-loop learning claims for P3 - Investor Value · finalises Oct 5, 3:21 AM CST · `select public.reverse_decision('dbb15e1e-fed2-4f0c-a60c-f10e32c296eb','John','<why>');`
- `e2c0d503` · agent-row · `AGT-281` · AGT-281 (v7.0.741): Victoria rules a whole findings list in one turn -- the sibling Intent vc-reorganize-intent joins r… · finalises Oct 5, 3:47 AM CST · `select public.reverse_decision('e2c0d503-9514-4bf9-aa06-68c2ef4af4ac','John','<why>');`
- `ff5a0bb6` · ticket-status · `AGT-281` · Close-out: AGT-281 settles 'partial' · finalises Oct 5, 4:24 AM CST · `select public.reverse_decision('ff5a0bb6-7402-436d-8142-bde34f688b51','John','<why>');`
- `433ae787` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 5, 4:24 AM CST · `select public.reverse_decision('433ae787-d53f-4a14-b982-e97d17923eca','John','<why>');`
- `199f27ef` · ship · `AGT-281` · AGT-281 shipped at v7.0.741 (b33e89492cd2bf2f875ee00b16921bbd5bc4ab90) on verdict 94e15346-ebcd-4887-9a3a-21004122e93f · finalises Oct 5, 4:25 AM CST · `select public.reverse_decision('199f27ef-218c-4e56-991c-98992aaea425','John','<why>');`
- `4c7c6014` · rollback · — · Auto-rollback held: ci-red on b33e894 was not reverted (card-only) · finalises Oct 5, 4:26 AM CST · `select public.reverse_decision('4c7c6014-4a3c-4ad9-a557-acc45d9ede47','John','<why>');`
- `2f2ae42d` · model-catalog · — · Model catalog: 20 Claude model rows checked · finalises Oct 5, 4:48 AM CST · `select public.reverse_decision('2f2ae42d-340b-4d0f-a987-1a8099658368','John','<why>');`
- `8beea924` · filing · — · Audit review 2026-W40: 30 findings → 9 tickets, 3 not-a-defect, 0 carried, 0 escalated · finalises Oct 5, 4:54 AM CST · `select public.reverse_decision('8beea924-ae5a-4315-8cc9-7e4f11dcb440','John','<why>');`
- `cb984e86` · leverage · — · AGT-238 leverage first: AGT-281 marked as leverage -- outranks project order · finalises Oct 5, 5:02 AM CST · `select public.reverse_decision('cb984e86-d025-4456-b5d6-60944bef6b14','John','<why>');`
- `5ea67a8c` · concurrency · — · AGT-238 concurrency from the corpus: 1 project(s) executing in the order agent-training · finalises Oct 5, 5:02 AM CST · `select public.reverse_decision('5ea67a8c-b879-483f-a7b2-8021b38147dc','John','<why>');`
- `e88f9c83` · model-catalog · — · Model catalog: 9 Claude model rows checked · finalises Oct 5, 5:10 AM CST · `select public.reverse_decision('e88f9c83-0d4c-4c8f-95a6-dbf7c11b0ab2','John','<why>');`
- `29ca1a81` · filing · — · Model assignment: capability/data-room-custody has no passing replacement -- ticket filed · finalises Oct 5, 5:10 AM CST · `select public.reverse_decision('29ca1a81-ea9b-4fcb-a22d-7172fc2502e4','John','<why>');`
- `4dbd6d04` · model-keep · — · lane/orchestrator keeps claude-opus-5 · finalises Oct 5, 5:10 AM CST · `select public.reverse_decision('4dbd6d04-7826-47a6-9936-3fc730616d1d','John','<why>');`
- `d4d745d1` · model-keep · — · lane/judgment keeps claude-fable-5-1 · finalises Oct 5, 5:10 AM CST · `select public.reverse_decision('d4d745d1-8213-46db-b6d6-da8d02cd9728','John','<why>');`
- `0cadb5c4` · model-keep · — · capability/bench-report-card keeps claude-sonnet-4-6 · finalises Oct 5, 5:10 AM CST · `select public.reverse_decision('0cadb5c4-c390-48c2-ac9d-4c480b9c5cd0','John','<why>');`
- `0ba1e3c9` · model-keep · — · lane/mechanical keeps claude-sonnet-5 · finalises Oct 5, 5:10 AM CST · `select public.reverse_decision('0ba1e3c9-01be-4096-893f-3f353ff7aefe','John','<why>');`
- `17bb635d` · model-report · — · model-watch 2026-10-02: releases 1, retirements 10, watch reviewed 0, trials 2, switched 0, kept 4, reverted 0 · models… · finalises Oct 5, 5:14 AM CST · `select public.reverse_decision('17bb635d-49e3-4c3a-8d11-840e7693334a','John','<why>');`
- `e69dac1e` · gate · `AGT-281` · Filed a gated_before_build card for AGT-281 and held it out of the pick; the remaining work is attended by design. · finalises Oct 5, 5:40 AM CST · `select public.reverse_decision('e69dac1e-158c-41a0-8bdd-a9ca2a0db75a','John','<why>');`
- `cddfe7a6` · filing · — · Audit review 2026-W40: 19 findings → 1 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Oct 5, 5:46 AM CST · `select public.reverse_decision('cddfe7a6-ee6b-4724-9e23-de2569824514','John','<why>');`
- `9ee2fe9b` · agent-row · `AGT-281` · Completed the SES-114 act on AGT-281: wrote design_status needs-desktop, the state half that the gate card alone did no… · finalises Oct 5, 5:48 AM CST · `select public.reverse_decision('9ee2fe9b-5e39-4c5e-ab23-cdc7f5935042','John','<why>');`
- `be7e3331` · gate · — · Gate cards ruled by cycle 58c12f60-ef9b-441c-b59e-8e4df9740c62: 3 card(s) — {"john": 0, "accept": 2, "rework": 0, "reti… · finalises Oct 5, 5:58 AM CST · `select public.reverse_decision('be7e3331-cc3e-4279-9623-53bab1331de2','John','<why>');`
- `581a9a07` · ship · `AGT-129` · AGT-129 shipped at v7.0.587 (ca56d1fca355892666b46f9192134a232f7b89e2) on verdict 22e1b2c9-43ed-4463-bfb7-d70b93907871 · finalises Oct 5, 6:20 AM CST · `select public.reverse_decision('581a9a07-c397-4c7d-8287-cfa17561135b','John','<why>');`
- `0d725492` · john-ruling · — · John 2026-10-02: weekly pace limit back on (meter_limiter_off true -> false) so routines slow down instead of going dar… · finalises Oct 5, 9:26 AM CST · `select public.reverse_decision('0d725492-166a-4a9a-8591-14312dcdfd59','John','<why>');`
- `0f257702` · requirement-check · `AGT-160` · The governance and tooling agents report what they find into the one findings list instead of filing tickets or leaving… · finalises Oct 5, 9:39 AM CST · `select public.reverse_decision('0f257702-5677-43c3-9910-d67142e07e0b','John','<why>');`
- `874648b6` · john-ruling · `AGT-160` · John 2026-10-02: an agent breaking the ticket writing and review process, where a less important ticket gets developed… · finalises Oct 5, 10:16 AM CST · `select public.reverse_decision('874648b6-c254-4a1f-b152-5d94d6b28b72','John','<why>');`
- `34ef662d` · filing · — · Audit review 2026-W40: 2 findings → 2 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Oct 5, 10:20 AM CST · `select public.reverse_decision('34ef662d-06b9-49dd-963d-bae8bfb49f76','John','<why>');`
- `35980d96` · ticket · `AGT-309` · AGT-309 homed in Agent Training with need source john:runner_decisions:874648b6 — The Development Manager's own pick, c… · finalises Oct 5, 10:23 AM CST · `select public.reverse_decision('35980d96-28a9-42cc-8159-d1d5e30e1994','John','<why>');`
- `26194e2b` · requirement-check · `AGT-309` · Your ruling on process-break fixes is read by nobody: Victoria scores them "can wait" and the manager files them where… · finalises Oct 5, 10:31 AM CST · `select public.reverse_decision('26194e2b-b28a-49b6-8bc7-d45d388904ad','John','<why>');`
- `6a24f412` · ticket-scope · `AGT-309` · AGT-309 gains John's condition: The Development Manager's pick enters an active project only after Victoria has verifie… · finalises Oct 5, 10:31 AM CST · `select public.reverse_decision('6a24f412-8a22-4ece-8f23-e538e887000a','John','<why>');`
- `d588abc0` · ticket-scope · `AGT-309` · Served-class ruling on AGT-309: P10 - Tooling, supports_class left NULL. · finalises Oct 5, 11:08 AM CST · `select public.reverse_decision('d588abc0-6406-48bf-8d9e-b766d922cc26','John','<why>');`
- `501ab7c5` · routine-prompt-push · — · Pushed the docs/runbooks/routine-prompt.md block (origin/dev 57bc6767) to the four runner routines; all four read back… · finalises Oct 5, 11:25 AM CST · `select public.reverse_decision('501ab7c5-28eb-4aae-92d6-f0f0d028ccf9','John','<why>');`
- `6668e1ac` · john-ruling · — · John 2026-10-02: before a next project is proposed to him, Victoria reviews it too, and it reaches him only when both T… · finalises Oct 5, 11:38 AM CST · `select public.reverse_decision('6668e1ac-3248-4172-9472-7cede7c15c7a','John','<why>');`
- `7e89835f` · removal-proposal · `AGT-307` · AGT-307 removal proposed: duplicate of AGT-287 · finalises Oct 5, 11:46 AM CST · `select public.reverse_decision('7e89835f-6862-4bf5-a971-6e7ba2c4a116','John','<why>');`
- `d4442471` · john-ruling · — · John 2026-10-02: Victoria, Nathan and Jerry create a new project plan; then Victoria and The Development Manager decide… · finalises Oct 5, 11:49 AM CST · `select public.reverse_decision('d4442471-8253-4151-9999-da39fc64cb75','John','<why>');`
- `46859e0b` · john-ruling · `AGT-304` · John 2026-10-02: he is not turning off the GitHub failure emails — the failing CI tests are to be fixed, and the ticket… · finalises Oct 5, 11:56 AM CST · `select public.reverse_decision('46859e0b-4883-4f4f-8361-a1fec181d7d2','John','<why>');`
- `24dd0537` · requirement-check · `AGT-304` · 38 regression suites fail on dev, so the ship gate cannot tell a new red from the standing one · finalises Oct 5, 12:00 PM CST · `select public.reverse_decision('24dd0537-451e-4b36-ad59-ce4969dbc3b6','John','<why>');`
- `c794b432` · filing · — · Audit review 2026-W40: 4 findings → 3 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Oct 5, 12:01 PM CST · `select public.reverse_decision('c794b432-90c8-42f8-ae98-e38e34b0ae32','John','<why>');`
- `7d7cbf5d` · ticket · `AGT-304` · AGT-304 placed in Tooling on The Development Manager's pick and Victoria's pass (need 5), by John's delegation · finalises Oct 5, 12:02 PM CST · `select public.reverse_decision('7d7cbf5d-ca00-4c12-8691-a59c6cf839a7','John','<why>');`
- `3bfd99d9` · routine-created · — · Created two cloud routines switched OFF on John's word: victoria-reorg (trig_012xvmXsXAjbVxdbYhUTq6W1) and jerry-linked… · finalises Oct 5, 12:14 PM CST · `select public.reverse_decision('3bfd99d9-c4a9-4f0b-bfcd-de5ab89557ea','John','<why>');`
- `54d80a6a` · agent-row · `AGT-309` · AGT-309: the process-break class recorded as rule JOHN-1002-PROCESS-BREAK-CLASS and as Victoria's inline Knowledge on r… · finalises Oct 5, 12:14 PM CST · `select public.reverse_decision('54d80a6a-78cc-43ce-ad07-1eae31228e29','John','<why>');`
- `58c0e39c` · john-ruling · — · John 2026-10-02: file an issue for The Development Manager to find out why a routine run takes so long, whether other r… · finalises Oct 5, 12:29 PM CST · `select public.reverse_decision('58c0e39c-a2f7-40e1-9905-4cac834f68a2','John','<why>');`
- `446d679d` · john-ruling · — · John 2026-10-02: he wants a ticket, proposed for The Development Manager and Victoria to decide on, for the Auditor rev… · finalises Oct 5, 12:34 PM CST · `select public.reverse_decision('446d679d-b095-4d48-a412-973a8ba098d8','John','<why>');`
- `280f2fa0` · john-ruling · — · John 2026-10-02: for the four loop-closing items, The Development Manager's project pick plus Victoria's approval is en… · finalises Oct 5, 2:15 PM CST · `select public.reverse_decision('280f2fa0-ff5c-4050-a403-b81814615fab','John','<why>');`
- `af1b9e8a` · john-ruling · — · John 2026-10-02: The Development Manager and Victoria may only assign tickets that improve existing projects; a new pro… · finalises Oct 5, 2:15 PM CST · `select public.reverse_decision('af1b9e8a-38bf-4a34-8ea5-dc56771dd9ad','John','<why>');`
- `0739525d` · filing · — · Audit review 2026-W40: 5 findings → 5 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Oct 5, 2:18 PM CST · `select public.reverse_decision('0739525d-b9e5-4c7d-910b-f2128efb0743','John','<why>');`
- `2df11863` · requirement-check · `AGT-291` · Nothing triggers the project finish line: two projects hold zero open tickets and neither is finished nor proposing a s… · finalises Oct 5, 2:18 PM CST · `select public.reverse_decision('2df11863-9902-404f-9a3e-7079a884811f','John','<why>');`
- `4add65f1` · requirement-check · `AGT-312` · A next-project proposal reaches John on the manager's answer alone: no Victoria turn exists and nothing requires both t… · finalises Oct 5, 2:18 PM CST · `select public.reverse_decision('4add65f1-3ed3-4e23-b945-e473e941b4f6','John','<why>');`
- `47c10256` · requirement-check · `AGT-313` · Nothing creates the next product project plan: no capability lets Victoria, Nathan and Jerry author one, and Jerry's sh… · finalises Oct 5, 2:19 PM CST · `select public.reverse_decision('47c10256-71e6-4fa0-b941-fe5985362b2b','John','<why>');`
- `ed4e7743` · requirement-check · `AGT-314` · An empty queue wakes nobody: a fire with nothing pickable ends in two actions while open findings and unrouted tickets… · finalises Oct 5, 2:19 PM CST · `select public.reverse_decision('ed4e7743-b945-4e49-ad6d-85d6b78b09d7','John','<why>');`
- `c1e9dc3a` · ticket · — · Four loop-closing tickets placed in active projects on The Development Manager's pick and Victoria's pass: AGT-314, AGT… · finalises Oct 5, 2:20 PM CST · `select public.reverse_decision('c1e9dc3a-28f8-45f0-8183-aac347caf42a','John','<why>');`
- `956086bc` · ticket-scope · `AGT-281` · AGT-281: the attended steps are done; its remainder is now ordinary repo work a cycle can build, so the needs-desktop h… · finalises Oct 5, 2:23 PM CST · `select public.reverse_decision('956086bc-b83b-4f81-a603-de66f7b669b3','John','<why>');`
- `30ce3418` · john-ruling · — · John 2026-10-02 asked whether the captured decisions and reasoning are used to make the agents smarter, how to make tha… · finalises Oct 5, 2:27 PM CST · `select public.reverse_decision('30ce3418-66b0-40f3-ab0d-92a801bd6e26','John','<why>');`
- `43808c03` · agent-row · `AGT-309` · vc-process-break-class reads John's ruling 874648b6 as: an agent breaking the ticket process is enough; a priority inve… · finalises Oct 5, 2:49 PM CST · `select public.reverse_decision('43808c03-e7a1-4493-a770-068a81de1155','John','<why>');`
- `49a3cd37` · requirement-check · `AGT-160` · The governance and tooling agents report what they find into the one findings list instead of filing tickets or leaving… · finalises Oct 5, 3:03 PM CST · `select public.reverse_decision('49a3cd37-9f45-484f-bffb-2d339d0cd3de','John','<why>');`
- `e7572eb2` · filing · — · Audit review 2026-W40: 2 findings → 0 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Oct 5, 3:52 PM CST · `select public.reverse_decision('e7572eb2-efa2-49d8-bfd3-8e2c1a6ba9a8','John','<why>');`
- `2178bf75` · requirement-check · `AGT-308` · A ticket gated at step 5 with no card and no design_status stays at queue #1 and is re-picked every fire · finalises Oct 5, 3:52 PM CST · `select public.reverse_decision('2178bf75-b797-493c-af2b-4c1358725c93','John','<why>');`
- `71d3843d` · classification · — · board ordered: 3 ticket(s) given an automation_rank · finalises Oct 6, 1:48 AM CST · `select public.reverse_decision('71d3843d-d6f0-4909-8c36-4a7a06533376','John','<why>');`
- `a551adc2` · hygiene · `AGT-79` · Ticket Owner: 26 derivable cell fix(es) on 26 row(s) — cost 1 · claim 0 · type 0 · revalidation 25 · finalises Oct 6, 1:53 AM CST · `select public.reverse_decision('a551adc2-889a-4886-b366-df400a5b3926','John','<why>');`
- `85b530d7` · leverage · — · AGT-238 leverage first: AGT-308, AGT-314, AGT-312 marked as leverage -- outranks project order · finalises Oct 6, 1:54 AM CST · `select public.reverse_decision('85b530d7-e956-44e7-9eca-d7bf60bd4c42','John','<why>');`
- `ee939ad5` · concurrency · — · AGT-238 concurrency from the corpus: 1 project(s) executing in the order agent-training · finalises Oct 6, 1:54 AM CST · `select public.reverse_decision('ee939ad5-39e9-4dd3-8c02-82d142312163','John','<why>');`
- `106a0608` · gate · `AGT-308` · Both defects the Builder found outside the kickoff were captured as findings rather than fixed — limb 1 of the AGT-133… · finalises Oct 6, 2:38 AM CST · `select public.reverse_decision('106a0608-2dc5-4ea3-b454-eed1e31ae4bc','John','<why>');`
- `a4aab0b8` · filing · — · Audit review 2026-W40: 25 findings → 3 tickets, 0 not-a-defect, 0 carried, 2 escalated · finalises Oct 6, 3:14 AM CST · `select public.reverse_decision('a4aab0b8-c597-4d42-8ee5-51b40b709837','John','<why>');`
- `01f0ca08` · agent-row · `AGT-312` · AGT-312 (v7.0.747): Victoria gains the review-proposal capability as four rows -- intent Skill vc-proposal-intent, the… · finalises Oct 6, 3:51 AM CST · `select public.reverse_decision('01f0ca08-43c6-4b97-b3d6-94309b9b7144','John','<why>');`
- `3a8dfd39` · ticket-status · `AGT-312` · Close-out: AGT-312 settles 'delivered' · finalises Oct 6, 4:21 AM CST · `select public.reverse_decision('3a8dfd39-97c1-4ee9-afd3-78b7ef0dc5a1','John','<why>');`
- `33e08f26` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 6, 4:21 AM CST · `select public.reverse_decision('33e08f26-98ac-450a-96a0-aeb156c6b639','John','<why>');`
- `8d24d781` · ticket-status · `AGT-312` · Close-out: AGT-312 settles 'delivered' · finalises Oct 6, 4:21 AM CST · `select public.reverse_decision('8d24d781-6e29-4175-b618-57dcd03b6e08','John','<why>');`
- `66d801f0` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 6, 4:21 AM CST · `select public.reverse_decision('66d801f0-5de9-48fc-93bc-ec9c81f20e12','John','<why>');`
- `fc1db2f0` · model-catalog · — · Model catalog: 20 Claude model rows checked · finalises Oct 6, 4:45 AM CST · `select public.reverse_decision('fc1db2f0-7d68-433e-9a49-15a1f205f6c5','John','<why>');`
- `751decc0` · filing · — · Audit review 2026-W40: 21 findings → 3 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Oct 6, 4:48 AM CST · `select public.reverse_decision('751decc0-1b4d-43c5-84a4-1c5f65040b0b','John','<why>');`
- `1c45bc8c` · model-catalog · — · Model catalog: 9 Claude model rows checked · finalises Oct 6, 4:50 AM CST · `select public.reverse_decision('1c45bc8c-bfd4-45cc-a050-16ef42e4048a','John','<why>');`
- `e6bd3e07` · model-keep · — · capability/bench-report-card keeps claude-sonnet-4-6 · finalises Oct 6, 4:50 AM CST · `select public.reverse_decision('e6bd3e07-d641-469b-8a65-0e3c65151348','John','<why>');`
- `ae07f1f5` · model-keep · — · capability/data-room-custody keeps claude-haiku-4-5-20251001 · finalises Oct 6, 4:50 AM CST · `select public.reverse_decision('ae07f1f5-48a6-4e42-83a1-711795b9eb66','John','<why>');`
- `eeae7190` · model-keep · — · lane/judgment keeps claude-fable-5-1 · finalises Oct 6, 4:50 AM CST · `select public.reverse_decision('eeae7190-f0ba-435e-b630-ecb5972e15c5','John','<why>');`
- `69052065` · model-keep · — · lane/mechanical keeps claude-sonnet-5 · finalises Oct 6, 4:50 AM CST · `select public.reverse_decision('69052065-22da-432b-bd9f-11b79673cf7d','John','<why>');`
- `e5f969d5` · model-keep · — · lane/orchestrator keeps claude-opus-5 · finalises Oct 6, 4:50 AM CST · `select public.reverse_decision('e5f969d5-403e-4356-99ae-0c9f895ad936','John','<why>');`
- `66cb91dd` · model-report · — · model-watch 2026-10-03: releases 0, retirements 16, watch reviewed 0, trials 0, switched 0, kept 5, reverted 0 · finalises Oct 6, 4:51 AM CST · `select public.reverse_decision('66cb91dd-5235-46b6-880a-17cd459a5a76','John','<why>');`
- `5b80c95f` · leverage · — · AGT-238 leverage first: AGT-314, AGT-291, AGT-313 marked as leverage -- outranks project order · finalises Oct 6, 5:03 AM CST · `select public.reverse_decision('5b80c95f-5d36-4c33-9424-c6a1807b11b6','John','<why>');`
- `ca79c855` · concurrency · — · AGT-238 concurrency from the corpus: 4 project(s) executing in the order dev-manager-capabilities, agent-training, tool… · finalises Oct 6, 5:03 AM CST · `select public.reverse_decision('ca79c855-77b9-465f-b8ec-0e2abefa6d82','John','<why>');`
- `14507f0b` · agent-row · `AGT-314` · AGT-314: re-pin dm-knowledge-cycle-card 400f9cb1c7db1bd1 → 0607365c80ed65cb · finalises Oct 6, 5:45 AM CST · `select public.reverse_decision('14507f0b-ece4-42df-9dfb-3ba670698134','John','<why>');`
- `3e60c839` · ticket-status · `AGT-314` · Close-out: AGT-314 settles 'delivered' · finalises Oct 6, 6:29 AM CST · `select public.reverse_decision('3e60c839-fa9b-4622-b5a6-d93fd9f1c7f1','John','<why>');`
- `e3e3ee0c` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 6, 6:29 AM CST · `select public.reverse_decision('e3e3ee0c-6264-4773-8501-9525c055ddf1','John','<why>');`
- `5c3b8943` · ship · `AGT-314` · AGT-314 shipped at v7.0.748 (452311992fb95321b87e5b7e3e6264ce939720b3) on verdict 3406d996-72d0-44a5-98b8-f03358fb2848 · finalises Oct 6, 6:29 AM CST · `select public.reverse_decision('5c3b8943-84a6-445d-b80d-04f3f72b95cc','John','<why>');`
- `55cf89ac` · agent-row · `AGT-291` · AGT-291: re-pin dm-knowledge-cycle-card 0607365c80ed65cb → 254dcbfa990f2bbf · finalises Oct 6, 7:25 AM CST · `select public.reverse_decision('55cf89ac-5ea4-4ead-91c2-bcf178d7d3b3','John','<why>');`
- `a007c78a` · ticket-status · `AGT-291` · Close-out: AGT-291 settles 'partial' · finalises Oct 6, 8:25 AM CST · `select public.reverse_decision('a007c78a-1dfc-442e-9e0a-2af818865555','John','<why>');`
- `c764b43f` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 6, 8:25 AM CST · `select public.reverse_decision('c764b43f-9922-4f94-afde-08de82dd149c','John','<why>');`
- `12301a69` · filing · — · Audit review 2026-W40: 16 findings → 0 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Oct 6, 8:48 AM CST · `select public.reverse_decision('12301a69-5547-4fc7-9ec1-30e17b2d5afb','John','<why>');`
- `d94ee9ce` · design-ruling · `AGT-136` · Open questions ruled by cycle ba7c3c09-97f2-4f03-9bee-d92523901897: 7 question(s) — {"no": 2, "yes": 5, "john": 0, "wit… · finalises Oct 6, 8:48 AM CST · `select public.reverse_decision('d94ee9ce-1438-4375-9b18-8d7425342225','John','<why>');`
- `1f51d48b` · ticket-status · `AGT-251` · AGT-253: John answered yes on AGT-251 — the design is approved; the build runs in a session John attends · finalises Oct 6, 8:48 AM CST · `select public.reverse_decision('1f51d48b-1cd1-46f2-9d04-86c28423ad5d','John','<why>');`
- `f68cb139` · ticket-status · `AGT-250` · AGT-253: John answered yes on AGT-250 — the design is approved; the build runs in a session John attends · finalises Oct 6, 8:48 AM CST · `select public.reverse_decision('f68cb139-3672-44d0-9693-20200b6e970b','John','<why>');`
- `87d62da4` · ticket-status · `AGT-252` · AGT-253: John answered yes on AGT-252 — the design is approved; the build runs in a session John attends · finalises Oct 6, 8:48 AM CST · `select public.reverse_decision('87d62da4-ce0e-4651-a628-6134ec60e136','John','<why>');`
- `2cd6086e` · agent-row · `AGT-313` · AGT-313 (v7.0.750): the product project plan -- Victoria gains plan-product-project as four rows; the growth review int… · finalises Oct 6, 10:28 AM CST · `select public.reverse_decision('2cd6086e-caba-4ac7-abca-f51ab27fe0ba','John','<why>');`
- `e8a40847` · stall-report · — · Three peer cycles went quiet ~76-80 minutes ago; no claim released, nothing closed · finalises Oct 6, 10:44 AM CST · `select public.reverse_decision('e8a40847-92d2-4839-be4b-389f46cc4a34','John','<why>');`
- `80ffbfa4` · gated · `AGT-313` · AGT-313 built green and could not be shipped: staging a tracked file is denied in this container · finalises Oct 6, 11:54 AM CST · `select public.reverse_decision('80ffbfa4-342a-4798-b666-68ac29285193','John','<why>');`
- `9d2a40aa` · finding-capture · `AGT-273` · Builder deviation captured as a finding, not fixed now: the build lane has no path to apply DDL · finalises Oct 6, 12:10 PM CST · `select public.reverse_decision('9d2a40aa-755b-49e3-af8c-aeee6e33f907','John','<why>');`
- `f51ca19b` · ticket-scope · `AGT-309` · AGT-309 premise revalidated alive but NARROWED: (a)(b)(c)(e) shipped in v7.0.743; the remainder is fix (d), the class t… · finalises Oct 6, 12:53 PM CST · `select public.reverse_decision('f51ca19b-c933-4aec-a2da-7d778d40c046','John','<why>');`
- `5a4424fc` · ticket-status · `AGT-309` · Close-out: AGT-309 settles 'delivered' · finalises Oct 6, 1:03 PM CST · `select public.reverse_decision('5a4424fc-239b-4977-b7d4-ea4079f3de58','John','<why>');`
- `7452fae9` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 6, 1:03 PM CST · `select public.reverse_decision('7452fae9-4e53-440a-aa62-4d3329f5e9bd','John','<why>');`
- `3a6534ca` · ship · `AGT-309` · AGT-309 shipped at v7.0.751 (61b04c65890affbd796dbebd2ad50ea3334e28bb) on verdict 8833273f-c1d0-4704-8e23-d861b56d0bf9 · finalises Oct 6, 1:24 PM CST · `select public.reverse_decision('3a6534ca-bc02-4c4e-9c51-728bf4971921','John','<why>');`
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
- `58cf6423` · john-ruling · — · John: runner resumes after outage #3 on ONE lane, usage may exceed 100% (overage credits), keep the projects going · finalises Oct 29, 6:18 PM CST · `select public.reverse_decision('58cf6423-33f6-430f-910c-4c7f4dccf752','John','<why>');`

**733 final this week, 65 reversed this week** — *this week* is a **rolling 7 days** back from the stamp, not a calendar week and not a Friday-07:00Z reset: no such weekly-reset helper exists in this file or anywhere in `scripts/`, so a rolling window is what is used and is labelled as one. A reversal is the strongest negative signal the ladder takes (`M6-07`), so the second number is the one to read first.

**Decided for you** — *as of 2026-10-03 18:28Z (Oct 3, 1:28 PM CST).* What the runner DECIDED on your behalf, by CST day (`governance_rules.MANAGER-DECIDES-BY-DEFAULT`: *a daily list of what was decided, not questions*), with the questions that reached you anyway counted beside it — target zero. Not the `Open decisions` group above: that one is the undo list and drops a decision the moment it finalises; this one is the record of the day and keeps it. **104 decided on 2026-10-03**; **6 question(s) reached you in the last 7 days — target zero**; 0 still open.

| CST day | decided | reversed | questions to you |
|---|---:|---:|---:|
| `2026-10-03` | 104 | 32 | 0 |
| `2026-10-02` | 123 | 29 | 0 |
| `2026-10-01` | 0 | 0 | 0 |
| `2026-09-30` | 0 | 0 | 0 |
| `2026-09-29` | 144 | 1 | 3 |
| `2026-09-28` | 199 | 1 | 1 |
| `2026-09-27` | 186 | 2 | 2 |

- *34 decision(s) were read but fall outside the table:* the read window is a rolling 7×24h back from the stamp, the table is the seven CST days ending `2026-10-03`, and any render after CST midnight sees the gap between them. They are in no column above.

**The 104 decided on 2026-10-03** — newest first.

- `3a6534ca` · ship · `AGT-309` · AGT-309 shipped at v7.0.751 (61b04c65890affbd796dbebd2ad50ea3334e28bb) on verdict 8833273f-c1d0-4704-8e23-d861b56d0bf9 · open
- `a38f649e` · reversal · `ZAGTPBC-1` · reversal of requirement-check decision c33763f0-bb6e-4d70-b5c0-ff9912dbf693 -- applied: 1 restored, 0 restored-unverifi… · open
- `c33763f0` · requirement-check · `ZAGTPBC-1` · AGT-309 process-break-class probe 1 · reversed
- `68a4234d` · reversal · `ZAGTPBC-1` · reversal of requirement-check decision 23c353fb-7efc-40c0-9c53-b6968810b569 -- applied: 1 restored, 0 restored-unverifi… · final
- `23c353fb` · requirement-check · `ZAGTPBC-1` · AGT-309 process-break-class probe 1 · reversed
- `7452fae9` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · open
- `5a4424fc` · ticket-status · `AGT-309` · Close-out: AGT-309 settles 'delivered' · open
- `e85ef4ed` · reversal · `ZAGTPBC-1` · reversal of requirement-check decision d15e7dd6-d0fd-4749-abd3-4e5af1abc858 -- applied: 1 restored, 0 restored-unverifi… · final
- `d15e7dd6` · requirement-check · `ZAGTPBC-1` · AGT-309 process-break-class probe 1 · reversed
- `f51ca19b` · ticket-scope · `AGT-309` · AGT-309 premise revalidated alive but NARROWED: (a)(b)(c)(e) shipped in v7.0.743; the remainder is fix (d), the class t… · open
- `80ffbfa4` · gated · `AGT-313` · AGT-313 built green and could not be shipped: staging a tracked file is denied in this container · open
- `e9ba2f9d` · reversal · `ZAGTPBC-1` · reversal of requirement-check decision 14d78307-1cba-43cc-be77-55ab71ce701b -- applied: 1 restored, 0 restored-unverifi… · final
- `14d78307` · requirement-check · `ZAGTPBC-1` · AGT-309 process-break-class probe 1 · reversed
- `606918e6` · reversal · `ZAGTPBC-1` · reversal of requirement-check decision dafd6ece-8c59-495f-b83a-84b15d772f8d -- applied: 1 restored, 0 restored-unverifi… · final
- `dafd6ece` · requirement-check · `ZAGTPBC-1` · AGT-309 process-break-class probe 1 · reversed
- `eb1c1b3c` · reversal · `ZAGTPBC-1` · reversal of requirement-check decision ac28defd-c0fc-4afb-9937-c77418959c84 -- applied: 1 restored, 0 restored-unverifi… · final
- `ac28defd` · requirement-check · `ZAGTPBC-1` · AGT-309 process-break-class probe 1 · reversed
- `a8c2e2f0` · reversal · `ZAGTPBC-1` · reversal of requirement-check decision dece90c5-b923-410f-b9f7-499da1e1ffd9 -- applied: 1 restored, 0 restored-unverifi… · final
- `dece90c5` · requirement-check · `ZAGTPBC-1` · AGT-309 process-break-class probe 1 · reversed
- `2cd6086e` · agent-row · `AGT-313` · AGT-313 (v7.0.750): the product project plan -- Victoria gains plan-product-project as four rows; the growth review int… · open
- `39f2a6fc` · reversal · `ZAGTPBC-1` · reversal of requirement-check decision 47ae1df5-40f3-4d61-8c24-95e8d2378e8b -- applied: 1 restored, 0 restored-unverifi… · final
- `47ae1df5` · requirement-check · `ZAGTPBC-1` · AGT-309 process-break-class probe 1 · reversed
- `f86eab7e` · reversal · `ZAGTPBC-1` · reversal of requirement-check decision 8d91572e-0b13-488c-bd7c-8de7d5b3dc27 -- applied: 1 restored, 0 restored-unverifi… · final
- `8d91572e` · requirement-check · `ZAGTPBC-1` · AGT-309 process-break-class probe 1 · reversed
- `1f51d48b` · ticket-status · `AGT-251` · AGT-253: John answered yes on AGT-251 — the design is approved; the build runs in a session John attends · open
- …and 79 more decided that day · `select id, kind, backlog_id, summary, status from public.runner_decisions where (decided_at at time zone 'America/Chicago')::date = '2026-10-03' order by decided_at desc;`

**Judgment classes** — *as of 2026-10-03 18:28Z (Oct 3, 1:28 PM CST).* What the corpus currently holds per pull test, live from `public.judgment_class_census` (`SES-84`; the same view `SES-159` reads). Ratification is a standing metric (John, 2026-08-23: a class is never finished being learned), never a finish line.

| class | ratified | proposed | rejected | total |
|---|---:|---:|---:|---:|
| `P1 - Improves John's Skills` | 7 | 31 | 6 | 44 |
| `P2 - Inventive` | 0 | 95 | 16 | 111 |
| `P3 - Investor Value` | 0 | 89 | 7 | 96 |
| `P4 - New Customers` | 1 | 37 | 3 | 41 |
| `neutral` | 0 | 83 | 30 | 113 |

- Newest proposed root claim for P1: *no proposed root claim*.
- Newest proposed root claim for P2: `VC-SYN-002` — Inventive features are the least-tested product goal because the bar John set — something competitors cannot easily copy — he has never applied to a real featu…
- Newest proposed root claim for P3: `VC-SYN-001` — Investor value is the least-defined product goal because nobody has yet said what an investor would check. The drafts agree on one reading: the buyer is a skep…
- Newest proposed root claim for P4: `VC-ROOT-004` — New features that win new customers. The bar is buy-pull — functionality that makes a customer say "I have to buy this." Administrative capability (accounts, b…

- **FLAG: 4 live claims still `unclassed`** — after `SES-84` this is zero by construction; a non-zero here is drift (a claim inserted without a classing decision) and needs one recorded decision, never a default.

**John-model** — *as of 2026-10-03 18:28Z (Oct 3, 1:28 PM CST).* How often a decision that leaned on a standing pattern of John's stood unreversed through its window, live from `public.john_model_signal` (`SES-004`; the criteria are `public.decision_patterns`, exported from `docs/JOHN-DECISION-PATTERNS.md`). A rate binds only from 30 finalised-or-reversed decisions (M7 gate, ruling iii).

- **99.3% agreement** over 695 finalised-or-reversed decisions (690 finalised unreversed, 5 reversed; 55 still open, 750 citing in total). A reversal is the strongest negative signal the ladder takes, so the second number is the one to read first.

| criterion | citing | final unreversed | reversed | open | rate |
|---|---:|---:|---:|---:|---:|
| `pattern:0` No standing pattern applied -- new judgment. | 359 | 345 | 1 | 13 | 99.7% |
| `pattern:9` Never spend a model call where a deterministic mechanism serves. | 104 | 94 | 0 | 10 | 100% |
| `pattern:14` When two code paths compute the same thing, build one shared core they both cal… | 91 | 84 | 0 | 7 | 100% |
| `pattern:137` P1–P4 are pull tests, not category labels — administrative expectations never q… | 84 | 80 | 0 | 4 | 100% |
| `pattern:92` Persist every finding and decision where a cold future session will find it — r… | 78 | 56 | 2 | 20 | 96.6% |

- A per-pattern `—` is not a zero: that criterion has not reached 30 finalised-or-reversed citations of its own, so it carries counts and no rate.

**Invention in use** — *as of 2026-10-03 18:28Z (Oct 3, 1:28 PM CST).* Criterion 7 (`docs/SELFBUILD-CHARTER.md`): at least one platform-originated feature — the Bench Report Card judge (`LOG-143`) — is measurably used by real visitors, live from `public.report_card_usage`. Counts only, never a rate.

- **7d:** 0 judge runs, 0 by real visitors (0 distinct).
- **30d:** 0 judge runs, 0 by real visitors (0 distinct).
- **all:** 3 judge runs, 0 by real visitors (0 distinct).

- *no real-visitor use yet.*

**Board by served class** — *as of 2026-10-03 18:28Z (Oct 3, 1:28 PM CST).* Which class each open ticket SERVES under the served-class test (`VC-MISSION-033`), ruled by The Prioritizer's `classify-ticket` and stored on `backlog_items.supports_class` — a ticket's own class is a different question and is not restated here.

| serves | open tickets |
|---|---:|
| `P1 - Improves John's Skills` | 81 |
| `P2 - Inventive` | 11 |
| `P3 - Investor Value` | 5 |
| `P4 - New Customers` | 2 |
| `P7 - Agent Creation` | 1 |
| *serves none* | 567 |

- *Negative ranks are John's own automation queue, seeded to sort ahead of anything assigned later (`SES-86`). The nightly re-rank writes 1..N and therefore sits below them — intended precedence, not a re-rank that failed.*

- **Top 5 by `automation_rank`:**
  -35. `SES-288` — A schema-range red can never be auto-reverted: one refused down-migration disables rollba… *(serves none)*
  1. `AGT-308` — A ticket gated at step 5 with no card and no design_status stays at queue #1 and is re-pi… *(serves none)*
  4. `SES-337` — The Verifier agent must reproduce the last 30 recorded verdicts before it grades a ship,… *(serves P1 - Improves John's Skills)*
  5. `SES-392` — The meter reader fails silently: exit 2 from 13:15 CT to 19:20 CT on 2026-09-12 with no l… *(serves P2 - Inventive)*
  5. `AGT-159` — The Development Manager reviews every open ticket through the findings process: first the… *(serves none)*

- Last scheduled re-rank: Oct 3, 1:47 AM CST.

**Governance agents, last 7 days** — *as of 2026-10-03 18:28Z (Oct 3, 1:28 PM CST).* Whether the platform's own agents (`agents.lane = 'governance'`) are doing the development work, live from `public.governance_agent_usage` and `public.ship_handoff_census` (`SES-360`). A **rolling 7 days** back from render time, like the decision counts above. Counts and token sums only, never a rate.

| role | source | calls | input tokens | output tokens |
|---|---|---:|---:|---:|
| Governance — Development Manager | `session` | 175 (163 untokened) | 5401467 | 240136 |
| Governance — Researcher | `session` | 2 (2 untokened) | 0 | 0 |
| Governance — Prioritizer | `session` | 23 (17 untokened) | 168290 | 64884 |
| Governance — Prioritizer | *unlabelled* | 726 (726 untokened) | 0 | 0 |
| Governance — Designer | `session` | 121 (115 untokened) | 1120933 | 0 |
| Governance — Builder | `session` | 88 (86 untokened) | 364587 | 0 |
| Governance — Verifier | *no calls in the window* | 0 | — | — |
| Governance — Auditor | `session` | 37 (25 untokened) | 651208 | 86558 |
| Governance — Ticket Owner | `session` | 7 | 0 | 0 |

- **Ships with all four handoff rows: 42 of 81** ships in the window (`SES-345`'s four: `automation_rank`, `kickoff_link`, a per-ticket push sha, a verdict row). Missing per leg: kickoff_link 0, per-ticket sha 3, automation_rank 38, verdict 0.
- *unlabelled* is a NULL `call_source` — the pre-attribution unknown, never read as automation (`LOG-128`); `untokened` rows carry no token counts at all (deterministic handler rows), so a large call count beside a small token sum is that, not a cheap model.

**Auditor's ledger** — *as of 2026-10-03 18:28Z (Oct 3, 1:28 PM CST).* What `public.audit_findings` (`AGT-70`) holds and what has left it for the board. Counts only, never a rate. Latest week 2026-W40: **693 findings (59 open · 0 resolved · 73 not a defect)** — **0 ruled** open findings (a ruled, open, `high` row is what `tripwire-to-backlog.js --from-ledger` files, at most 3 per ISO week); **0 filed** to the board from the ledger so far (`source_file = 'audit-ledger'`).

| fingerprint | kind | confidence | fact | ruled |
|---|---|---|---|---|
| `06d8f4e2105afd85` | other | high | kickoff carried no lane declaration on first assembly | — |
| `0a7679f5209d278d` | other | high | build needed a fact the kickoff did not carry | — |
| `12ce8aac8e4e56e2` | other | high | assignment differs from the queue head | — |
| `2055fc233a225ddd` | other | high | build needed a fact the kickoff did not carry | — |
| `24d82772f762c589` | other | high | build needed a fact the kickoff did not carry | — |
| `2563102d51fb48e1` | other | high | assignment agt-155 differs from prime_directive_queue() head 009eeb7a (john dir… | — |
| `2838ed53fedbb314` | other | high | build needed a fact the kickoff did not carry | — |
| `2ef2a60b69caaad3` | other | high | build needed a fact the kickoff did not carry | — |
| `33863630e9349337` | contradiction | high | A migration whose down capture was refused, with derived_down_sql null, carries… | — |
| `35bd0e7daee2cbe2` | contradiction | high | Whether the recorded skip reason on AGT-281 is placeholder text: runner_skips.r… | — |
| `3794f51774592b8f` | other | high | build needed a fact the kickoff did not carry | — |
| `44a43ef7a5669c06` | other | high | How many decision rows the AGT-312 settle wrote: notes, ship card and finding e… | — |
| `45429d5db65dd50c` | other | high | Ticket Owner check cost-snapshot-missing holds open judgment rows a capability… | — |
| `4abe6d1388b72c49` | contradiction | high | How many backlog-review findings had been raised when the card was written: aud… | — |
| `5ad82708af6dbeb1` | other | high | kickoff section 4 specified a skill row with llm_model null and no traits.handl… | — |
| `61de2267a16d828d` | other | high | build needed a fact the kickoff did not carry | — |
| `666611e8aefecc39` | other | high | assignment differs from the queue head | — |
| `6f28fb48e11b22f9` | other | high | Ticket Owner check type-off-taxonomy holds open judgment rows a capability must… | — |
| `7a0ef23e40e5cd84` | other | high | build needed a fact the kickoff did not carry | — |
| `7bb7c07cde570fe7` | other | high | kickoff carried no lane declaration on first assembly | — |
| `7be0a3c16ef09e7e` | other | high | build needed a fact the kickoff did not carry | — |
| `987092f0ba88d2c0` | other | high | build needed a fact the kickoff did not carry | — |
| `994f677883c39479` | other | high | assignment differs from the queue head | — |
| `9b856e5cd2e24745` | other | high | kickoff carried no lane declaration on first assembly | — |
| `a21546929899228f` | other | high | build needed a fact the kickoff did not carry | — |
| `af8afd3ee5eea40b` | other | high | kickoff carried no lane declaration on first assembly | — |
| `afe2d6dda0bec52e` | other | high | kickoff carried no lane declaration on first assembly | — |
| `agt-314:duplicate-byte-pin:52ba146bf5692ab08bdf4cd3f8090da6619a4def4864022beb66b3edeec6e5d3` | duplicate | high | docs/runbooks/runner-cycle.md step 7 (one home per fact); agt-253 own header co… | — |
| `b7efbc7f7006e4d7` | other | high | build needed a fact the kickoff did not carry | — |
| `b9a1eff544a353c1` | other | high | Ticket Owner check delivered-unaccepted holds open judgment rows a capability m… | — |
| `bb5917300f612622` | other | high | build needed a fact the kickoff did not carry | — |
| `bcb3936396620dc9` | other | high | build needed a fact the kickoff did not carry | — |
| `c016f5878302309f` | other | high | Ticket Owner check claim-expired holds open judgment rows a capability must dec… | — |
| `c7403dbf38a8b250` | other | high | assignment differs from the queue head | — |
| `cc862a5a27e97b0e` | duplicate | high | One close-out of one ticket is one reversal; AGT-266's close-out carries three… | — |
| `chained-continuation-counts-itself-as-the-full-lane` | contradiction | high | The routine prompt step 9: a verdict of continue is executed, not weighed, and… | — |
| `e466c6f50f151f92` | contradiction | high | Which step this cycle last reached: its row says it is still waiting for a test… | — |
| `eafdfe2bae682002` | contradiction | high | How many regression tests stood red by name on the graded tree: 360 minus 320 i… | — |
| `ee15983cbe27a2e6` | other | high | build needed a fact the kickoff did not carry | — |
| `session:usage-review-1003:agt304-followups-never-filed` | other | high | AGT-304's Designer (cycle e25bba11, 2026-10-02) triaged every standing red test… | — |
| `session:usage-review-1003:ci-blocker-tickets-not-in-executing-project` | other | high | Two of the three tickets that must land for dev CI to go green (AGT-271 live-st… | — |
| `session:usage-review-1003:cost-per-ship-3pct-weekly` | other | high | John asked 2026-10-03: in the last 8 hours only 2 tickets closed, how did that… | — |
| `session:usage-review-1003:gated-before-build-label-covers-builder-block` | contradiction | high | runner_cycles.outcome = gated_before_build is written both for cycles gated bef… | — |
| `session:usage-review-1003:kickoff-precheck-before-builder` | other | high | Cycle 89491155 ran the full Designer (190,864 tokens) and Builder (194,862 toke… | — |
| `session:usage-review-1003:ship-leaves-pinned-test-behind` | other | high | Twelve of the 40 triaged reds are a later ship legitimately changing a pinned f… | — |
| `session:usage-review-1003:standing-red-per-cycle-tax` | other | high | Dev CI (Tripwire + regression, blocking) has been red for 17 days with 42 faili… | — |
| `victoria-1002-cloud:owed-4-agt309-ship-card-open` | other | high | The AGT-309 ship report c8d82ebc asked John "both or either?". He answered on 2… | — |
| `1fc488543fe22bb8` | contradiction | medium | How many of the 341 regression tests passed on graded sha 63241a5c: the verdict… | — |
| `3b6b149e87fb40f2` | duplicate | medium | Which ticket owns settle-ship's cost-patch read-back exiting 2 after a successf… | — |
| `727fdc171ed28181` | other | medium | Which numbered items of the live runner prompt differ from docs/runbooks/routin… | — |
| `72dd0cb9e3e7e0bd` | contradiction | medium | Which files this cycle's second push carried: the record says the backlog snaps… | — |
| `7d2aaf651dbee0db` | contradiction | medium | Which commit holds the tree runner_verdicts d7294e55 graded: graded_sha fdad1bd… | — |
| `8cb6d3557727e232` | other | medium | runner_verdicts is the only surviving record of what a verdict graded; row 58d0… | — |
| `f1633a571357f311` | contradiction | medium | Whether a gated card written without the ticket mark leaves the ticket re-picka… | — |
| `session:usage-review-1003:connect-page-claude-only-untested-e2e` | other | medium | The /connect onboarding page covers Claude only (John asked to test from Claude… | — |
| `session:usage-review-1003:designer-followups-no-filing-check` | other | medium | A Designer harvest can hand follow-ups to the runner's close-out without writin… | — |
| `session:usage-review-1003:no-ship-close-out-cost` | other | medium | After a cycle that shipped nothing closed at 07:44Z, the same session spent ~30… | — |
| `session:usage-review-1003:step5-stop-overridden-lane-selfcount` | contradiction | medium | At step 5 the manager sub-agent answered stop because it counted the cycle's ow… | — |
| `session:usage-review-1003:nathan-runs-leave-no-output-record` | other | low | Nathan's two capability runs today (feature-benefits, release-notes) and three… | — |

- *A finding leaves this table only by John's ruling — `resolved`, `not-a-defect`, or ruled and left `open` to file. Candidates a run found but nobody ingested live in `docs/audits/<week>-candidates.json`, not here.*

**Ticket hygiene, last night** — *as of 2026-10-03 18:28Z (Oct 3, 1:28 PM CST).* What the Ticket Owner (`AGT-79`) left on the board: `public.ticket_owner_findings` open rows by check, the newest `hygiene` decision and the newest nightly cycle row. Counts only, never a rate. **188 open findings** across 9 check(s).

| check | open | oldest | nights open |
|---|---:|---|---:|
| `verdict-missing` | 46 | Sep 12, 10:31 PM CST | 20 |
| `delivered-unaccepted` | 45 | Sep 12, 10:31 PM CST | 20 |
| `size-missing` | 31 | Sep 12, 10:31 PM CST | 20 |
| `type-off-taxonomy` | 24 | Sep 12, 10:31 PM CST | 20 |
| `designed-closed` | 22 | Sep 23, 7:50 PM CST | 9 |
| `quote-missing` | 8 | Sep 12, 10:31 PM CST | 20 |
| `remainder-stranded` | 5 | Sep 18, 5:38 AM CST | 15 |
| `cycles-over-quote` | 4 | Sep 12, 10:31 PM CST | 20 |
| `claim-expired` | 3 | Oct 2, 1:57 AM CST | 1 |

- Last run: `f2f039ae` · shipped · Oct 3, 1:53 AM CST · 1048 rows · 214 findings (26 derivable · 188 judgment) · behind the fences: quote 503 · size 471 · cost 45 · verdict 97 · unrevalidated>30d 385 · attended-actual null 384 · revalidation 385 left (batch 25, carried 0) · retired 1 check / 130 rows · fixed 26 · findings +1 ~187 −5 · decision a551adc2-889a-4886-b366-df400a5b3926 — reversible until 2026-10-06T06:53:52.431556+00:00 · judged 26/3/0 on claude-fable-5-1
- Judgment: **the newest night was judged** — 0 unjudged nights on top, over the newest 14 on record.
- Decision `a551adc2` · open · Ticket Owner: 26 derivable cell fix(es) on 26 row(s) — cost 1 · claim 0 · type 0 · revalidation 25 · finalises Oct 6, 1:53 AM CST · `select public.reverse_decision('a551adc2-889a-4886-b366-df400a5b3926','John','<why>');`

**Victoria's lists, last Tuesday** — *as of 2026-10-03 18:28Z (Oct 3, 1:28 PM CST).* What the weekly list reorganization (`AGT-281`) ruled: the newest 2 ended `public.runner_cycles` rows whose `notes` carry `SCHEDULED-AGENT: victoria-reorg`, each printing its own run line. One row per LIST, so a Tuesday that ruled both lists shows two. **0 run(s)** on record.

- **No run on record yet — a measured zero:** the ledger was read and holds no `SCHEDULED-AGENT: victoria-reorg` row. The routine is not created yet: that is attended work, and the switch goes on only after John has seen the first run (`docs/runbooks/victoria-reorg.md`).

**Staff watch** — *as of 2026-10-03 18:28Z (Oct 3, 1:28 PM CST).* What the Development Manager (`SES-378`) recorded about the runner's own agents: `public.runner_staff_findings` rows per `agent_id`, with the distinct fingerprints and the distinct CYCLES behind them. Counts only, never a rate. **100 finding(s)** across 2 agent(s).

| agent | findings | distinct fingerprints | distinct cycles | newest |
|---|---:|---:|---:|---|
| `designer` | 87 | 23 | 71 | Oct 3, 11:12 AM CST |
| `devmanager` | 13 | 5 | 13 | Oct 2, 3:00 PM CST |

**Human gates** — *as of 2026-10-03 18:28Z (Oct 3, 1:28 PM CST).* The two reads that say whether anything is waiting on a human: open `backlog_items` carrying `design_status = 'needs-john'`, and `gated_before_build` `runner_items` left with `decision IS NULL` (`M6-01`). Board state, written by no code in this repo — which is why it is REPORTED here and not asserted as a gate by the regression suite. **1 open `needs-john` ticket(s)**, **3 undecided `gated_before_build` card(s)**.

- **`needs-john` (1):** `AGT-110`
- **Undecided gated cards (3):** `54b42eea-be4f-434d-963a-6707873bc137`, `b3d185e1-ef33-4e16-bb07-986751d5f928`, `5d1f0891-4013-4f9c-80fd-6a3aa3a946c1`
- *Open is not wrong.* A card nobody has answered yet is a real board state; what it is NOT is a regression, so nothing in the suite goes red for it.

*Provenance: 1000 board rows, payload `sha256:e932db4e9f8de9c0`, as of 2026-10-03 18:28Z (Oct 3, 1:28 PM CST). The stamp says when this was last read; the sha says whether it still matches the tables. `--check` compares the sha, never the stamp — a refreshed stamp over identical facts is not drift.*
<!-- END GENERATED — scripts/render-standing-brief.js -->

**Next session:** none required — the runner is live and works **John's automation queue** (canonical: `docs/RUNNER-GOV-0820-REQUIREMENTS.md`): the queue is the board's leading sort key, not a list to read (`automation_rank`, v7.0.133) — `ORDER BY queue` already honours it. Classes are always written named, **`P1 - Improves John's Skills` → `P10 - Tooling`**; outcomes as plain words (“did not run”, “gated before build”); budget is two-track (API dollars + token governor). John judges from the briefing page. Runner pause: disable `deepbench-runner` at claude.ai/code/routines. **Board census measured 2026-08-23T12:5xZ by runner cycle `363b5138`, taken from the board after its own close-out recompute rather than carried forward:** **561 open tickets, 561 numbered, 0 open-but-unnumbered**, 611 rows total, **the standing Automation drain now has a FIXED finish line** — from `v7.0.179` (`SES-142`) it works the **18 members John named** on directive `b74009ea`, stored as `runner_drain_scope` FK rows, and a ticket filed into the epic *after* that naming **never joins it**: it queues normally and waits for him. The live `now` tier had already drifted to 19 against his 18. `drain_epic_next()` retires when those 18 are `done`/`removed`, and returns the new outcome **`unscoped`** — never a live-tier fallback — for any future drain declared without a list. Queue/drain state as of **v7.0.196** (2026-08-23 ~17:00Z, `successional-review` close-out, 561 rows renumbered): `SES-140` — *the successor fire is refused by the platform* and `SES-151` — *the scheduler runs on John's clock grid* are both **`done`**; the drain's nearest open member `SES-84` — *the vision corpus* (`needs-john`) waits on John's briefing decisions, so cycles step past it (`SES-114`) and work the board (`SES-121` — *shrink the `.claude/`-mutable surface* went `done` at v7.0.198; procedure text now lives in `docs/runbooks/`, cycle-writable). **The board's `title` column is trustworthy for display for the first time** (`SES-91`, v7.0.177): 98 rows that held a bare priority-class string now carry a real authored title, and the only `^P[0-9]+ - ` title left is `ADM-1`, whose title is a real sentence behind a stale class prefix and is deliberately left for `SES-117` to **accommodate** rather than repair. `SES-119` is now `done` (v7.0.184 + v7.0.185): the briefing renders `public.backlog_display_title(title, description)` rather than the read-time `gist` workaround, and **`runner-cycle.md`'s Language block now requires a ticket's title wherever John reads its ID**. Step 5's `gist` expression deliberately stays — it is still correct for any future row filed the old way, and 50 of 562 open numbered tickets still fall back to it. **From v7.0.195 the chain runs IN-SESSION (`SES-140` FINAL)** — a cycle that actually ran one (`shipped`/`gated_before_build`/`reverted`) and whose drain still returns `pick` opens its next `runner_cycles` row (trigger `chained (drain continuation)`) **in the same session** and re-enters the runbook at step 1; session-spawning is retired as platform-unsupported (`runner-cycle.md` tail step (8) carries the evidence). A **wall-stopped cycle continues nothing**, which keeps the budget wall a brake rather than a metronome. Proven live 2026-08-23: cycles `1fcd687e` → `a11c94d2`, the first chained row in the runner's life. **The briefing-redesign epic is finished** — `SES-129`, its last member, shipped in cycle `ed1a5eb3`. **A new filing rule binds from this version:** `runner_items.backlog_id` takes a **bare** ticket id or NULL and is enforced by `ck_runner_items_backlog_id_bare`; the display string belongs in `display_ref`, and the briefing's id chip reads `coalesce(backlog_id, display_ref)` (`SES-116`, v7.0.174 — `runner-cycle.md` step 9). **`design_status` reads for selection (`SES-114`, v7.0.165); among OPEN tickets measured at the v7.0.198 close-out:** 16 `designed` (incl. `SES-101`, flipped from `needs-desktop` — its one remaining edit now lives in `docs/runbooks/session-setup.md` step 3c, cycle-writable), **0 `needs-desktop`**, **1 `needs-john`** (`SES-84`), 546 `NULL` = not yet triaged, deliberately not guessed to `auto`. Measured at the v7.0.198 close-out: **11 of John's 18 named members remain open** (`SES-121` retired from the list by going `done` this session); the only `needs-john` member is `SES-84` — the rest are buildable, the drain reaches them and can retire on them. **`CHI-89`** still holds its queue slot with its removal card undecided — visible to John and skipped by cycles, exactly as `SES-113` intended. **`SES-133` is still open at `partial`** — the other half of John's 2026-08-23 emergencies directive; it sits at queue 251 rather than at the top, because the drain reads the Automation epic's `now` tier in queue order and `SES-133` is not in that epic. **From v7.0.182 John's own switches govern the cadence** (`SES-143`): the briefing's **§2b Automation panel** carries a scheduler checkbox + an every-N-hours box (the generated block above is the only home for their live values — it renders `runner_settings` row 1 fresh each cycle, `SES-151`) and a drain checkbox, and `runner-cycle.md`'s **new step 1b** calls `public.scheduler_gate()` before anything else — a scheduled cycle arriving early closes `did_not_run` with *"paced by your scheduler setting"*, and with the scheduler off it closes *"scheduler off"*. **The cron is John's own routine switch** — a cycle cannot edit its own routine — and **from v7.0.196 (`SES-151`) the gate paces by John's clock grid**: a scheduled fire runs iff its row's `started_at` falls in an America/Chicago hour divisible by `runner_settings.interval_hours` — row 1, read live, never a number written here — and the routine's cron fires in that hour (DST-proof; the mixed-clock elapsed test that wrongly paced 3 of 9 hourly fires is dead, `q-hourly-interval-boundary` answered by ship). Two consequences worth knowing before reading a quiet night as a stall: the gate **fails open** on every unknown, and it governs **scheduled** fires only, so a standing drain's chained continuation cycles run regardless — while the Automation drain stands, **the chain and not the interval is what actually sets the pace**. A manual fire (off the cron grid) is never paced; whether that is what John wants is the one thing the spec leaves open, asked as `q-manual-fire-pacing`. **From v7.0.188 that gate actually fires** (`SES-146`): until then `scheduler_gate()` matched the trigger by exact equality against the bare word `scheduled`, so a cycle passing the verbatim line step 1b asks for — `trigger: scheduled` — fell through to *"not a scheduled cycle"* and skipped **both** the pacing branch and the `scheduler_on = false` branch, and the grid test compared `now()`-at-step-1b rather than the fire time against a hardcoded ±2. Both failed open, so the panel looked live and bound nothing. The trigger is now normalised, the grid is anchored to the cycle row's own `started_at`, and the tolerance is the column `runner_settings.grid_tolerance_min` (10). **Silence is not a “no”** on any open question. **From v7.0.183 the board's open status is `open`, never `missing`** (`SES-118`): `backlog_items_status_check` now allows exactly `('open','partial','done','removal proposed','removed')` and the retired value raises `23514` — 510 rows renamed, `updated_at` deliberately untouched so step 8c's 30-day revalidation sweep still sees the sinking tail. **That consequence closed at v7.0.189** (attended session `ses118-gated`, 2026-08-23): step 3c's INSERT now writes `'open'`, zero `'missing'` literals remain under `.claude/`, and `SES-118` is `done` — its gated card `76564dde` awaits John's decision on the briefing page.
