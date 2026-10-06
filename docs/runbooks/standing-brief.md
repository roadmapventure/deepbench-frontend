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
## Live board state — generated, do not hand-edit — *as of 2026-10-06 08:16Z (Oct 6, 3:16 AM CST)*

> Rendered from the tables by `scripts/render-standing-brief.js` at every ship. **Every number below is derived; nothing here is maintained by hand.** The judgment prose beneath this block is the opposite — hand-maintained, deliberately, and this script never writes outside these markers. Where the two disagree about a number, this block is right and the sentence below is stale: say so rather than reconciling them by hand.

**Board census** — *as of 2026-10-06 08:16Z (Oct 6, 3:16 AM CST).* **649 open tickets**, 627 numbered, **22 open-but-unnumbered**, 1000 rows total.

| `status` | rows | share of board |
|---|---:|---:|
| `open` | 451 | 45.1% |
| `done` | 269 | 26.9% |
| `delivered` | 107 | 10.7% |
| `removed` | 82 | 8.2% |
| `removal proposed` | 57 | 5.7% |
| `partial` | 34 | 3.4% |

**`design_status` among OPEN tickets** — *as of 2026-10-06 08:16Z (Oct 6, 3:16 AM CST).* Reads for selection (`SES-114`); `NULL` is *not* `auto`, it is not-yet-triaged and no cycle may backfill it.

| `design_status` | open rows | selection effect |
|---|---:|---|
| `NULL` | 565 | full ceremony — not yet triaged |
| `designed` | 37 | **not a skip** — build from `kickoff_link` (step 6 fast path) |
| `needs-decision` | 33 | — |
| `needs-desktop` | 13 | skipped, `record_skip()` — needs a session John attends (B39) |
| `needs-john` | 1 | skipped, `record_skip()` — John decides on a card |

**Scheduler and automation settings** — *as of 2026-10-06 08:16Z (Oct 6, 3:16 AM CST).* §2b of the briefing, John's own switches, binding via `scheduler_gate()` at step 1b:

- Scheduler: **on**, every **1 hour** on John's clock grid (America/Chicago hours divisible by the interval — `SES-151`, DST-proof).
- Cron minute **40**, manual-fire tolerance **±10 min** (a start outside it is treated as a manual fire and is never paced).
- Standing daily max: **196M tokens**. This is rung 3 of five, **below** the 48h stale floor: a standing number must not defeat the staleness brake.

**Standing epic drain** — *as of 2026-10-06 08:16Z (Oct 6, 3:16 AM CST).* Created only by John; the runner may read one, never write one (`drain_epic_next()` property 5). The finish line is drawn from the members he **named** (`runner_drain_scope`), never the live `now` tier (`SES-142`) — and within that list it is the members a milestone **gate ruled required** (`milestone_required`, `SES-310`) whenever the list carries such a ruling, every named member otherwise.

- **No drain standing.** Selection is the class-sorted board exactly as it is with no drain declared.

**Proposed projects** — *as of 2026-10-06 08:16Z (Oct 6, 3:16 AM CST).* A project whose batch finished proposes the next one (`AGT-240`): The Auditor grades what it built, The Development Manager proposes ONE project with its tickets and why. Its tickets are normal backlog rows the runner does not pick until you say yes. **0 proposed.**

- **None** — a measured none: no finished batch has proposed a project.

**Open decisions** — *as of 2026-10-06 08:16Z (Oct 6, 3:16 AM CST).* Decisions made under `M6-02` that are still inside their reversal window (`runner_settings.reversal_window_hours` = 72h). Silence finalises them; to reverse one, run the line beside it (`docs/runbooks/session-setup.md` § Reversing a decision).

- `ff5a0bb6` · ticket-status · `AGT-281` · Close-out: AGT-281 settles 'partial' · finalises Oct 5, 4:24 AM CST · `select public.reverse_decision('ff5a0bb6-7402-436d-8142-bde34f688b51','John','<why>');`
- `433ae787` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 5, 4:24 AM CST · `select public.reverse_decision('433ae787-d53f-4a14-b982-e97d17923eca','John','<why>');`
- `199f27ef` · ship · `AGT-281` · AGT-281 shipped at v7.0.741 (b33e89492cd2bf2f875ee00b16921bbd5bc4ab90) on verdict 94e15346-ebcd-4887-9a3a-21004122e93f · finalises Oct 5, 4:25 AM CST · `select public.reverse_decision('199f27ef-218c-4e56-991c-98992aaea425','John','<why>');`
- `4c7c6014` · rollback · — · Auto-rollback held: ci-red on b33e894 was not reverted (card-only) · finalises Oct 5, 4:26 AM CST · `select public.reverse_decision('4c7c6014-4a3c-4ad9-a557-acc45d9ede47','John','<why>');`
- `615e1de3` · reversal · `ZAGTPBC-1` · reversal of requirement-check decision 8c813a9f-5e1f-4b51-8744-6cf10c32cf4c -- applied: 1 restored, 0 restored-unverifi… · finalises Oct 5, 4:29 AM CST · `select public.reverse_decision('615e1de3-c481-4014-a6d4-617f468caaf4','John','<why>');`
- `3572f973` · reversal · `ZAGTPBC-1` · reversal of requirement-check decision 629edcfa-8099-4ce8-a77f-3de35c8190f3 -- applied: 1 restored, 0 restored-unverifi… · finalises Oct 5, 4:41 AM CST · `select public.reverse_decision('3572f973-29d0-4729-bfac-1682420516bb','John','<why>');`
- `2b7c5cbe` · reversal · `ZAGTPBC-1` · reversal of requirement-check decision f2084189-6e17-4b93-9eff-7083c9f22c08 -- applied: 1 restored, 0 restored-unverifi… · finalises Oct 5, 4:42 AM CST · `select public.reverse_decision('2b7c5cbe-cbba-4232-ae44-535cce67358d','John','<why>');`
- `2f2ae42d` · model-catalog · — · Model catalog: 20 Claude model rows checked · finalises Oct 5, 4:48 AM CST · `select public.reverse_decision('2f2ae42d-340b-4d0f-a987-1a8099658368','John','<why>');`
- `7b1c8ee3` · reversal · `ZAGTPBC-1` · reversal of requirement-check decision 38d79baa-09cb-4110-b846-09b37a809716 -- applied: 1 restored, 0 restored-unverifi… · finalises Oct 5, 4:54 AM CST · `select public.reverse_decision('7b1c8ee3-e28b-4b6c-a1f6-9025dea5dce0','John','<why>');`
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
- **22 ticket-status decisions** finalising Oct 6, 4:21 AM CST → Oct 6, 10:27 PM CST · one batch, listed by query rather than one line each: `select id, backlog_id, summary, expires_at from public.runner_decisions where status='open' and kind='ticket-status' order by expires_at;` · reverse any one with `select public.reverse_decision('<id>','John','<why>');`
- `33e08f26` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 6, 4:21 AM CST · `select public.reverse_decision('33e08f26-98ac-450a-96a0-aeb156c6b639','John','<why>');`
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
- `e3e3ee0c` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 6, 6:29 AM CST · `select public.reverse_decision('e3e3ee0c-6264-4773-8501-9525c055ddf1','John','<why>');`
- `5c3b8943` · ship · `AGT-314` · AGT-314 shipped at v7.0.748 (452311992fb95321b87e5b7e3e6264ce939720b3) on verdict 3406d996-72d0-44a5-98b8-f03358fb2848 · finalises Oct 6, 6:29 AM CST · `select public.reverse_decision('5c3b8943-84a6-445d-b80d-04f3f72b95cc','John','<why>');`
- `55cf89ac` · agent-row · `AGT-291` · AGT-291: re-pin dm-knowledge-cycle-card 0607365c80ed65cb → 254dcbfa990f2bbf · finalises Oct 6, 7:25 AM CST · `select public.reverse_decision('55cf89ac-5ea4-4ead-91c2-bcf178d7d3b3','John','<why>');`
- `c764b43f` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 6, 8:25 AM CST · `select public.reverse_decision('c764b43f-9922-4f94-afde-08de82dd149c','John','<why>');`
- `12301a69` · filing · — · Audit review 2026-W40: 16 findings → 0 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Oct 6, 8:48 AM CST · `select public.reverse_decision('12301a69-5547-4fc7-9ec1-30e17b2d5afb','John','<why>');`
- `d94ee9ce` · design-ruling · `AGT-136` · Open questions ruled by cycle ba7c3c09-97f2-4f03-9bee-d92523901897: 7 question(s) — {"no": 2, "yes": 5, "john": 0, "wit… · finalises Oct 6, 8:48 AM CST · `select public.reverse_decision('d94ee9ce-1438-4375-9b18-8d7425342225','John','<why>');`
- `2cd6086e` · agent-row · `AGT-313` · AGT-313 (v7.0.750): the product project plan -- Victoria gains plan-product-project as four rows; the growth review int… · finalises Oct 6, 10:28 AM CST · `select public.reverse_decision('2cd6086e-caba-4ac7-abca-f51ab27fe0ba','John','<why>');`
- `e8a40847` · stall-report · — · Three peer cycles went quiet ~76-80 minutes ago; no claim released, nothing closed · finalises Oct 6, 10:44 AM CST · `select public.reverse_decision('e8a40847-92d2-4839-be4b-389f46cc4a34','John','<why>');`
- `80ffbfa4` · gated · `AGT-313` · AGT-313 built green and could not be shipped: staging a tracked file is denied in this container · finalises Oct 6, 11:54 AM CST · `select public.reverse_decision('80ffbfa4-342a-4798-b666-68ac29285193','John','<why>');`
- `9d2a40aa` · finding-capture · `AGT-273` · Builder deviation captured as a finding, not fixed now: the build lane has no path to apply DDL · finalises Oct 6, 12:10 PM CST · `select public.reverse_decision('9d2a40aa-755b-49e3-af8c-aeee6e33f907','John','<why>');`
- `f51ca19b` · ticket-scope · `AGT-309` · AGT-309 premise revalidated alive but NARROWED: (a)(b)(c)(e) shipped in v7.0.743; the remainder is fix (d), the class t… · finalises Oct 6, 12:53 PM CST · `select public.reverse_decision('f51ca19b-c933-4aec-a2da-7d778d40c046','John','<why>');`
- `7452fae9` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 6, 1:03 PM CST · `select public.reverse_decision('7452fae9-4e53-440a-aa62-4d3329f5e9bd','John','<why>');`
- `3a6534ca` · ship · `AGT-309` · AGT-309 shipped at v7.0.751 (61b04c65890affbd796dbebd2ad50ea3334e28bb) on verdict 8833273f-c1d0-4704-8e23-d861b56d0bf9 · finalises Oct 6, 1:24 PM CST · `select public.reverse_decision('3a6534ca-bc02-4c4e-9c51-728bf4971921','John','<why>');`
- `4056f8a8` · design-ruling · `AGT-136` · Open questions ruled by cycle fb9f991b-74ee-46ee-8025-8d374d00d85d: 3 question(s) — {"no": 2, "yes": 1, "john": 0, "wit… · finalises Oct 6, 1:46 PM CST · `select public.reverse_decision('4056f8a8-7d31-4d9e-b588-b6acb423fd3f','John','<why>');`
- `11e2c07d` · filing · — · Audit review 2026-W40: 30 findings → 7 tickets, 0 not-a-defect, 0 carried, 1 escalated · finalises Oct 6, 1:55 PM CST · `select public.reverse_decision('11e2c07d-cbdf-4c01-bd15-3b76eefa36d3','John','<why>');`
- `ac3443ea` · design-kickoff · `AGT-332` · Kickoff designed for AGT-332 (slice 1 of 2: Private bench group in data, Brittany moved to it) · finalises Oct 6, 2:20 PM CST · `select public.reverse_decision('ac3443ea-81a2-4375-b6d3-69a27cc38713','John','<why>');`
- `a828b44f` · john-ruling · `AGT-337` · John 2026-10-03: private, user-created agents are exempt from the §19u "every hire is signed" rule and go live on creat… · finalises Oct 6, 2:38 PM CST · `select public.reverse_decision('a828b44f-11f3-4570-a35a-18b28b2d7382','John','<why>');`
- `0eebdd32` · design-kickoff · `AGT-335` · Kickoff designed for AGT-335 · finalises Oct 6, 2:44 PM CST · `select public.reverse_decision('0eebdd32-b469-463d-ac3c-342ffba46f7a','John','<why>');`
- `75033a11` · ticket-scope · `AGT-339` · AGT-339 scope set to the Activity tab layout John approved 2026-10-03, with the AI-patterns line; the read is two publi… · finalises Oct 6, 2:54 PM CST · `select public.reverse_decision('75033a11-5530-470d-845c-1dad61e17cbf','John','<why>');`
- `2583ee42` · design-kickoff · `AGT-336` · Kickoff designed for AGT-336 (slice 1 of 2) · finalises Oct 6, 2:57 PM CST · `select public.reverse_decision('2583ee42-aa3b-41dd-8936-c722784678d6','John','<why>');`
- `ea558dc3` · design-kickoff · `AGT-339` · Kickoff designed for AGT-339 · finalises Oct 6, 3:11 PM CST · `select public.reverse_decision('ea558dc3-cafd-4f8c-ae22-83e40b5453fd','John','<why>');`
- `2bb82982` · design-kickoff · `AGT-342` · Kickoff designed for AGT-342 · finalises Oct 6, 3:15 PM CST · `select public.reverse_decision('2bb82982-60fa-4daf-aa5d-d70b2c35b666','John','<why>');`
- `79a20f6a` · design-kickoff · `AGT-332` · Kickoff designed for AGT-332 slice 2 of 2 (RosterScreen: Private first, opens on Private, All excludes private agents) · finalises Oct 6, 3:18 PM CST · `select public.reverse_decision('79a20f6a-5086-4179-ad8d-27e0e8192fc7','John','<why>');`
- `bfefb600` · design-kickoff · `AGT-333` · Kickoff designed for AGT-333 (per-agent MCP address /api/mcp/<agent id>; /api/mcp unchanged) · finalises Oct 6, 3:18 PM CST · `select public.reverse_decision('bfefb600-aecb-44fd-8262-83991fceab44','John','<why>');`
- `8694dc25` · design-kickoff · `AGT-334` · Kickoff designed for AGT-334 slice 1 of 2 (Add Training + Connect buttons and the pill popup) · finalises Oct 6, 3:18 PM CST · `select public.reverse_decision('8694dc25-abb8-4273-87f7-899eea91293b','John','<why>');`
- `d5fb7591` · design-kickoff · `AGT-336` · Kickoff designed for AGT-336 slice 2 of 2 · finalises Oct 6, 3:48 PM CST · `select public.reverse_decision('d5fb7591-4e35-4e22-832a-1f76e3c1c4b1','John','<why>');`
- `067cc2ad` · john-ruling · `AGT-337` · John 2026-10-03 "approved all five": save-failure message, saving state, outside-AI tool copy, dashes on a new card, hi… · finalises Oct 6, 4:27 PM CST · `select public.reverse_decision('067cc2ad-27b1-42c5-918f-c66aeef14750','John','<why>');`
- `4465403c` · requirement-check · `AGT-349` · The test line opens up on its own after sustained green readings, never above John's ceiling of 5 · finalises Oct 6, 4:43 PM CST · `select public.reverse_decision('4465403c-7dbe-49ec-8dc3-a13e378ffffd','John','<why>');`
- `b8f2584d` · design-kickoff · `AGT-349` · Kickoff designed for AGT-349 · finalises Oct 6, 4:52 PM CST · `select public.reverse_decision('b8f2584d-4763-4f99-897d-fdad025323f0','John','<why>');`
- `0c4ec06c` · concurrency · `AGT-349` · Test line 1 -> 2 (up): 3 green readings with headroom, 1 held, 11 waiting · finalises Oct 6, 5:16 PM CST · `select public.reverse_decision('0c4ec06c-4e0a-46bf-9c26-3d98c1f35546','John','<why>');`
- `a8e633e3` · removal · `AGT-337` · John 2026-10-03 "yes remove test agents": the three live-test agents (max-lnorjl, priya-test-aqah5q, solo-test-mpwk32),… · finalises Oct 6, 5:19 PM CST · `select public.reverse_decision('a8e633e3-815d-439b-a52d-dbe11d841498','John','<why>');`
- `6e0208fa` · concurrency · `AGT-349` · Test line 4 -> 5 (up): 3 green readings with headroom, 4 held, 3 waiting · finalises Oct 6, 5:56 PM CST · `select public.reverse_decision('6e0208fa-e9ae-48ef-8ddc-ee0318182d0c','John','<why>');`
- `7ba9bf18` · status · `AGT-349` · AGT-349 open -> delivered on a block verdict (one newly red test, not this ticket's) · finalises Oct 6, 6:07 PM CST · `select public.reverse_decision('7ba9bf18-c607-4cb7-8ec8-75ac9d823530','John','<why>');`
- `c6aace0b` · design-kickoff · `AGT-343` · Kickoff designed for AGT-343 · finalises Oct 6, 6:42 PM CST · `select public.reverse_decision('c6aace0b-48ec-4d1f-83a8-e9e6c910afb1','John','<why>');`
- `acb9f0a8` · design-kickoff · `AGT-350` · Kickoff designed for AGT-350 · finalises Oct 6, 6:44 PM CST · `select public.reverse_decision('acb9f0a8-8b8d-4683-acbd-6d117aa977fb','John','<why>');`
- `5560dcd9` · john-ruling · `AGT-338` · John 2026-10-03 "yes, build the fix": an agent's knowledge tool only ever gives out that agent's own knowledge, on ever… · finalises Oct 6, 6:49 PM CST · `select public.reverse_decision('5560dcd9-8684-48d2-a0ad-3425978e722b','John','<why>');`
- `c7c92b3f` · design-kickoff · `AGT-344` · Kickoff designed for AGT-344 (slice 1 of 2) · finalises Oct 6, 6:57 PM CST · `select public.reverse_decision('c7c92b3f-734f-4935-a62d-7248b774e9e0','John','<why>');`
- `64ff6ef4` · agent-row · `AGT-338` · AGT-338 slice 2: the general bundle tool moves to its own Intent row carrying traits.any_agent = true; agent-bundle-int… · finalises Oct 6, 6:57 PM CST · `select public.reverse_decision('64ff6ef4-6516-4af4-839f-1f8d974782a0','John','<why>');`
- `61de6bec` · ship · `AGT-339` · AGT-339 shipped at v7.0.758 (e6be1568807cbecde5c032318a09f21fdaf12544) on verdict 2037cf33-0212-42b0-bf09-25f010f238f0 · finalises Oct 6, 7:17 PM CST · `select public.reverse_decision('61de6bec-5118-47f6-bac1-62b2c3e075a0','John','<why>');`
- `ea233259` · john-ruling · `AGT-350` · John ruled AGT-350 done over the block verdict · finalises Oct 6, 7:19 PM CST · `select public.reverse_decision('ea233259-2d82-4d97-9349-641dd143e8a5','John','<why>');`
- `a27a7cbe` · john-ruling · `AGT-338` · John 2026-10-03 "approved, build it": the Connect popup offers the team address under the agent's own URL box, with the… · finalises Oct 6, 7:20 PM CST · `select public.reverse_decision('a27a7cbe-58d8-405c-9097-2321d3ff7d58','John','<why>');`
- `35a8983a` · design-kickoff · `DAT-004` · Kickoff designed for DAT-004 · finalises Oct 6, 7:43 PM CST · `select public.reverse_decision('35a8983a-24ba-475e-b4ab-1ff6df25a4f9','John','<why>');`
- `378d9043` · design-kickoff · `AGT-345` · Kickoff designed for AGT-345 · finalises Oct 6, 7:43 PM CST · `select public.reverse_decision('378d9043-0663-4498-b9ac-81be66d46fe8','John','<why>');`
- `2aaa466c` · classification · — · board ordered: 4 ticket(s) given an automation_rank · finalises Oct 7, 1:49 AM CST · `select public.reverse_decision('2aaa466c-4975-4688-bcaa-3ece4383f75c','John','<why>');`
- `7b3fa7ba` · hygiene · `AGT-79` · Ticket Owner: 6 derivable cell fix(es) on 6 row(s) — cost 6 · claim 0 · type 0 · revalidation 0 · finalises Oct 7, 1:55 AM CST · `select public.reverse_decision('7b3fa7ba-013e-4f88-9ec3-9e61ce96b186','John','<why>');`
- **25 removal-proposal decisions** finalising Oct 7, 1:55 AM CST → Oct 7, 1:55 AM CST · one batch, listed by query rather than one line each: `select id, backlog_id, summary, expires_at from public.runner_decisions where status='open' and kind='removal-proposal' order by expires_at;` · reverse any one with `select public.reverse_decision('<id>','John','<why>');`
- `173c68a0` · ship · `AGT-304` · AGT-304 shipped at v7.0.777 (eb93fbe3969a893814c6cdbaf95ee1889decd1f5) on verdict 44e555a1-792b-4c42-a9ac-04d16ebe619a · finalises Oct 7, 2:42 AM CST · `select public.reverse_decision('173c68a0-758e-4a67-9fb6-d7761f448d28','John','<why>');`
- `177f0976` · ship · `AGT-137` · AGT-137 shipped at v7.0.602 (b1725dd036af4a17c79f20a216c432a152f23cf2) on verdict 87fa103b-b472-4bf6-952e-4bdd6a58df19 · finalises Oct 7, 2:58 AM CST · `select public.reverse_decision('177f0976-d987-4276-8b7b-46ebf34fe9ca','John','<why>');`
- `4662ce2a` · learning · `SES-159` · class-loop learning claims for P3 - Investor Value · finalises Oct 7, 3:02 AM CST · `select public.reverse_decision('4662ce2a-1db8-4ba1-9adc-08495f739c05','John','<why>');`
- `640b3141` · ship · `AGT-304` · AGT-304 shipped at v7.0.778 (bc1c56bf40d38042d33c918940092a48e7e16c01) on verdict 6f354b11-ee8a-4c2a-9b6f-21fb52f71385 · finalises Oct 7, 3:46 AM CST · `select public.reverse_decision('640b3141-6679-4886-9ff3-ce9f7b6ab0aa','John','<why>');`
- `16927962` · model-catalog · — · Model catalog: 20 Claude model rows checked · finalises Oct 7, 4:44 AM CST · `select public.reverse_decision('16927962-d65d-4873-ac2a-b3150a8dd217','John','<why>');`
- `c063afc9` · model-catalog · — · Model catalog: 9 Claude model rows checked · finalises Oct 7, 4:49 AM CST · `select public.reverse_decision('c063afc9-a9c5-4d29-8d44-9609b3df671a','John','<why>');`
- `6bb98a04` · model-keep · — · capability/bench-report-card keeps claude-sonnet-4-6 · finalises Oct 7, 4:49 AM CST · `select public.reverse_decision('6bb98a04-e3f6-44a8-82ea-4eb6d5f7eded','John','<why>');`
- `f1a78dd8` · model-keep · — · capability/data-room-custody keeps claude-haiku-4-5-20251001 · finalises Oct 7, 4:49 AM CST · `select public.reverse_decision('f1a78dd8-a76f-4c33-bdc5-4fda7ceeaa0a','John','<why>');`
- `f02ce306` · model-keep · — · lane/judgment keeps claude-fable-5-1 · finalises Oct 7, 4:49 AM CST · `select public.reverse_decision('f02ce306-4e0c-4e95-b24e-752f23d909ab','John','<why>');`
- `eba63a6d` · model-keep · — · lane/mechanical keeps claude-sonnet-5 · finalises Oct 7, 4:49 AM CST · `select public.reverse_decision('eba63a6d-93e9-421f-9478-cf576796ab22','John','<why>');`
- `123d74a7` · model-keep · — · lane/orchestrator keeps claude-opus-5 · finalises Oct 7, 4:49 AM CST · `select public.reverse_decision('123d74a7-d8e6-43d6-ae51-0cff2e3bd267','John','<why>');`
- `928e8eba` · model-report · — · model-watch 2026-10-04: releases 0, retirements 9, watch reviewed 0, trials 0, switched 0, kept 5, reverted 0 · finalises Oct 7, 4:51 AM CST · `select public.reverse_decision('928e8eba-cd2c-40b1-a604-98fa961820bb','John','<why>');`
- `5bea2b06` · design-kickoff · `AGT-348` · Kickoff designed for AGT-348 · finalises Oct 7, 7:46 PM CST · `select public.reverse_decision('5bea2b06-2f1e-48b3-8486-d6331133cb56','John','<why>');`
- `f6323999` · classification · — · board ordered: 4 ticket(s) given an automation_rank · finalises Oct 8, 1:55 AM CST · `select public.reverse_decision('f6323999-e343-4e82-a9e9-b1d7c815e024','John','<why>');`
- `0c14e92f` · hygiene · `AGT-79` · Ticket Owner: 23 derivable cell fix(es) on 23 row(s) — cost 0 · claim 0 · type 0 · revalidation 23 · finalises Oct 8, 2:05 AM CST · `select public.reverse_decision('0c14e92f-d875-48fc-a325-fc54bf3eb77d','John','<why>');`
- `23d1f165` · removal-proposal · `SK-17` · SK-17 removal proposed: Dead by evidence: skill_profiles already has llm_provider, llm_model, max_tokens, api_key_sourc… · finalises Oct 8, 2:05 AM CST · `select public.reverse_decision('23d1f165-8b30-4ab8-9097-85d7f530054e','John','<why>');`
- `fcc38a15` · removal-proposal · `SK-18` · SK-18 removal proposed: Dead by evidence: skill_profiles row execution-plan (the SP-PM-03 format skill) already holds t… · finalises Oct 8, 2:05 AM CST · `select public.reverse_decision('fcc38a15-4761-4e19-b935-34d7e3352407','John','<why>');`
- `fa80c764` · leverage · — · AGT-238 leverage first: AGT-304 marked as leverage -- outranks project order · finalises Oct 8, 2:55 AM CST · `select public.reverse_decision('fa80c764-beb8-480a-8e4a-2877668af410','John','<why>');`
- `366e8222` · concurrency · — · AGT-238 concurrency from the corpus: 4 project(s) executing in the order tooling, dev-manager-capabilities, mcp-poc, ag… · finalises Oct 8, 2:55 AM CST · `select public.reverse_decision('366e8222-d0a3-4fe2-957c-55cacbea29d3','John','<why>');`
- `f476c81f` · ticket-status · `AGT-304` · Close-out: AGT-304 settles 'partial' · finalises Oct 8, 3:25 AM CST · `select public.reverse_decision('f476c81f-a6bd-45b8-ad37-38b4e2ceab4e','John','<why>');`
- `93c60b47` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 8, 3:25 AM CST · `select public.reverse_decision('93c60b47-490c-49b7-8883-d409f28e95de','John','<why>');`
- `de659c2d` · learning · `SES-159` · class-loop learning claims for P3 - Investor Value · finalises Oct 8, 3:56 AM CST · `select public.reverse_decision('de659c2d-61bc-4bb1-938a-67f9fa3f6eba','John','<why>');`
- `bc9091dd` · ticket-scope · `AGT-304` · AGT-304 slice 5 is designed: v7.0.782 re-pins three regression arms (agt-135, agt-176b, agt-226) whose assertions were… · finalises Oct 8, 4:22 AM CST · `select public.reverse_decision('bc9091dd-ca71-4503-96a9-f47842c467da','John','<why>');`
- `19990a75` · filing · — · Audit review 2026-W41: 58 findings → 16 tickets, 5 not-a-defect, 0 carried, 1 escalated · finalises Oct 8, 4:25 AM CST · `select public.reverse_decision('19990a75-4178-4a36-b5c9-6ffa95efd553','John','<why>');`
- `c23feb06` · model-catalog · — · Model catalog: 20 Claude model rows checked · finalises Oct 8, 4:45 AM CST · `select public.reverse_decision('c23feb06-c3ed-40a9-8dff-023970ffb6fc','John','<why>');`
- `d16eb172` · ticket-status · `AGT-304` · Close-out: AGT-304 settles 'partial' · finalises Oct 8, 4:46 AM CST · `select public.reverse_decision('d16eb172-d819-4209-954a-9a090fb07feb','John','<why>');`
- `da434872` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 8, 4:46 AM CST · `select public.reverse_decision('da434872-47d4-41a6-9d96-eee6c974d84b','John','<why>');`
- `6ea72343` · gate · — · Filed a defect finding: run-project's record_leverage fence refuses the manager's own pass-two write whenever the calli… · finalises Oct 8, 4:50 AM CST · `select public.reverse_decision('6ea72343-688a-4a9f-859e-7ceee970326c','John','<why>');`
- `ae3feb07` · model-keep · — · capability/bench-report-card keeps claude-sonnet-4-6 · finalises Oct 8, 4:50 AM CST · `select public.reverse_decision('ae3feb07-c465-4e7b-a483-cb3917c9a32d','John','<why>');`
- `04f1d539` · model-keep · — · capability/data-room-custody keeps claude-haiku-4-5-20251001 · finalises Oct 8, 4:50 AM CST · `select public.reverse_decision('04f1d539-dee4-4739-bbe7-264d8373701e','John','<why>');`
- `0f8d2c06` · model-keep · — · lane/judgment keeps claude-fable-5-1 · finalises Oct 8, 4:50 AM CST · `select public.reverse_decision('0f8d2c06-e116-4187-ad02-f9bbb592a937','John','<why>');`
- `370a8409` · model-keep · — · lane/mechanical keeps claude-sonnet-5 · finalises Oct 8, 4:50 AM CST · `select public.reverse_decision('370a8409-9e29-49f6-a7ff-1106328a0ad3','John','<why>');`
- `3f471871` · model-keep · — · lane/orchestrator keeps claude-opus-5 · finalises Oct 8, 4:50 AM CST · `select public.reverse_decision('3f471871-cf40-4400-a9db-9b090d5f1a55','John','<why>');`
- `fad99186` · model-report · — · model-watch 2026-10-05: releases 0, retirements 8, watch reviewed 0, trials 0, switched 0, kept 5, reverted 0 · finalises Oct 8, 4:51 AM CST · `select public.reverse_decision('fad99186-d8b1-450f-bb64-ef5a68acd1a5','John','<why>');`
- `9101686e` · gate · — · Filed a defect finding: one delivered ticket whose latest verdict is a block now makes the all-or-nothing sweep_decisio… · finalises Oct 8, 5:05 AM CST · `select public.reverse_decision('9101686e-6058-439b-b98b-2e6137fae40e','John','<why>');`
- `666e08f8` · leverage · — · AGT-238 leverage first: AGT-304, AGT-340, AGT-341 marked as leverage -- outranks project order · finalises Oct 8, 5:52 AM CST · `select public.reverse_decision('666e08f8-ba14-4d79-85f4-87c05aeb6ebe','John','<why>');`
- `0faa4031` · concurrency · — · AGT-238 concurrency from the corpus: 1 project(s) executing in the order tooling, pausing agent-training · finalises Oct 8, 5:52 AM CST · `select public.reverse_decision('0faa4031-add7-40f1-97f5-f7518d2c9ef0','John','<why>');`
- `37d6fa4b` · filing · — · Audit review 2026-W41: 118 findings → 13 tickets, 1 not-a-defect, 2 carried, 2 escalated · finalises Oct 8, 6:04 AM CST · `select public.reverse_decision('37d6fa4b-a528-495e-9041-98303fe118a6','John','<why>');`
- `ed974c75` · audit-report · — · WAITING ON JOHN (rules): finding_routes has no row for source builder or session, so five defects I have no quarrel wit… · finalises Oct 8, 6:06 AM CST · `select public.reverse_decision('ed974c75-aabb-42c7-80b3-7d631bea6298','John','<why>');`
- `5ce3a812` · ticket-status · `AGT-304` · Close-out: AGT-304 settles 'partial' · finalises Oct 8, 6:56 AM CST · `select public.reverse_decision('5ce3a812-0448-4e5e-9db2-42e9bbde4204','John','<why>');`
- `b0e5b5ee` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 8, 6:56 AM CST · `select public.reverse_decision('b0e5b5ee-5164-421c-a1b0-4deb9051e275','John','<why>');`
- `4ba5186b` · finding-route · `AGT-304` · Builder deviation on AGT-304 slice 6: the regression suite unshallows its own clone — CAPTURED as a finding, not fixed… · finalises Oct 8, 6:58 AM CST · `select public.reverse_decision('4ba5186b-1951-4234-b717-eb8851cf3127','John','<why>');`
- `a862e547` · ship · `AGT-304` · AGT-304 shipped at v7.0.783 (9a95d9c76d9774c42718b0c9bd57c3151974ee56) on verdict 03b0fb08-9b41-4ac9-84e7-ac9e4a4f2e1b · finalises Oct 8, 7:00 AM CST · `select public.reverse_decision('a862e547-ec35-466d-b4a1-71fdec162645','John','<why>');`
- `fc8b9f7c` · ship · `AGT-174` · AGT-174 shipped at v7.0.622 (1b422b277aff126b90960685a9d6b74dfcf78c24) on verdict 3da23932-b209-4008-92fe-709c4e056741 · finalises Oct 8, 7:13 AM CST · `select public.reverse_decision('fc8b9f7c-4579-41b2-a39b-0cb2d96cd803','John','<why>');`
- `e868adb3` · design-kickoff · `AGT-348` · Kickoff designed for AGT-348 slice 2 · finalises Oct 8, 10:27 AM CST · `select public.reverse_decision('e868adb3-8b07-443e-8a33-a9d9d7b81891','John','<why>');`
- `7e7f46a9` · design-kickoff · `AGT-348` · Kickoff designed for AGT-348 slice 3 · finalises Oct 8, 10:36 AM CST · `select public.reverse_decision('7e7f46a9-e8cc-47b9-b23b-032a2cb8f254','John','<why>');`
- `94e820c3` · design-kickoff · `AGT-348` · Kickoff designed for AGT-348 slice 4 · finalises Oct 8, 10:55 AM CST · `select public.reverse_decision('94e820c3-eaa2-47a7-aa83-c936c3cfd92c','John','<why>');`
- `64e6940c` · design-kickoff · `AGT-348` · Kickoff designed for AGT-348 slice 5 · finalises Oct 8, 11:05 AM CST · `select public.reverse_decision('64e6940c-f4c9-4cd4-b724-cbc4902b1050','John','<why>');`
- `1f8d7302` · john-ruling · `AGT-384` · John named AGT-384's scope (Bench home, four cards, Connect to AI and Test AI pages, shared left nav with breadcrumb) a… · finalises Oct 8, 12:44 PM CST · `select public.reverse_decision('1f8d7302-9354-42f4-bf04-f99c5464c14a','John','<why>');`
- `3fa088aa` · design-kickoff · `AGT-384` · Kickoff designed for AGT-384 · finalises Oct 8, 12:58 PM CST · `select public.reverse_decision('3fa088aa-d563-4a82-8d9e-c4d9a4f1af7c','John','<why>');`
- `2ce24377` · ticket-status · `AGT-384` · Close-out: AGT-384 settles delivered (v7.0.788, on dev at d48ab2db). · finalises Oct 8, 1:41 PM CST · `select public.reverse_decision('2ce24377-3575-4f14-85b0-2110d8e71464','John','<why>');`
- `d110e648` · john-ruling · `AGT-385` · John named AGT-385's scope (Connect to AI page redesign) and waived the three-file / four-task cap for this one ticket:… · finalises Oct 8, 6:01 PM CST · `select public.reverse_decision('d110e648-ac94-4442-9cdc-c6f0fc6bc846','John','<why>');`
- `5a8dda85` · design-kickoff · `AGT-385` · Kickoff designed for AGT-385 · finalises Oct 8, 6:12 PM CST · `select public.reverse_decision('5a8dda85-de95-4db9-8679-4a4114170a05','John','<why>');`
- `ce41396c` · requirement-check · `ZAGTVIC-1022652a` · AGT-281 list probe — the pass arm · finalises Oct 8, 6:28 PM CST · `select public.reverse_decision('ce41396c-a637-4667-9c75-6f96b0f9b237','John','<why>');`
- `80cdb6e6` · removal-proposal · `ZAGTVIC-1022652b` · ZAGTVIC-1022652b removal proposed: no candidate record asks for this at all (regression fixture) · finalises Oct 8, 6:28 PM CST · `select public.reverse_decision('80cdb6e6-9732-4df2-aee1-3ba31b872d76','John','<why>');`
- `2469b825` · ticket-scope · `AGT-385` · AGT-385 gains John's three round-two copy changes on the Connect page: a plain-text lead-in before the Claude link, a n… · finalises Oct 8, 6:28 PM CST · `select public.reverse_decision('2469b825-7d59-42f8-abf5-a108c6819d15','John','<why>');`
- `c1f447c7` · design-kickoff · `AGT-386` · Kickoff designed for AGT-386 · finalises Oct 8, 6:31 PM CST · `select public.reverse_decision('c1f447c7-d80f-4f3f-894b-abc7c03cd3fc','John','<why>');`
- `6897e61a` · ticket-status · `AGT-385` · Close-out: AGT-385 settles delivered (v7.0.789, on dev at bbce7080). · finalises Oct 8, 6:45 PM CST · `select public.reverse_decision('6897e61a-3600-431c-81a9-7446994b846a','John','<why>');`
- `3c6bbe04` · scope-ruling · `AGT-387` · AGT-387 Company: record the AI tool name going forward · finalises Oct 8, 6:50 PM CST · `select public.reverse_decision('3c6bbe04-0092-428f-8703-53a3d826a833','John','<why>');`
- `e2d4dd01` · john-ruling · `AGT-388` · John named AGT-388's scope: the Test AI page gets the Connect page's FAQ drawers, three of them, behind tool tabs. · finalises Oct 8, 6:56 PM CST · `select public.reverse_decision('e2d4dd01-152c-4250-b85d-d93b0cc352d9','John','<why>');`
- `1e5b9b52` · design-kickoff · `AGT-388` · Kickoff designed for AGT-388 · finalises Oct 8, 7:06 PM CST · `select public.reverse_decision('1e5b9b52-0727-4dac-87c6-cc3b77d2a464','John','<why>');`
- `20e5f7c2` · ticket-scope · `AGT-388` · AGT-388 gains John's styling change: on the Test AI page only, "Select your AI tool" under FAQ is drawn as instructiona… · finalises Oct 8, 7:18 PM CST · `select public.reverse_decision('20e5f7c2-f2cb-4fe0-bb7d-857a47cf2e25','John','<why>');`
- `17df5eb1` · ticket-status · `AGT-386` · Close-out: AGT-386 settles delivered · finalises Oct 8, 7:18 PM CST · `select public.reverse_decision('17df5eb1-04d7-4748-a79d-d39f948389a5','John','<why>');`
- `55f50b9b` · ticket-status · `AGT-388` · Close-out: AGT-388 settles delivered (v7.0.791, on dev at 7321b7e5). · finalises Oct 8, 7:36 PM CST · `select public.reverse_decision('55f50b9b-23fa-4216-923f-5b34b86d3b35','John','<why>');`
- `74843236` · john-ruling · — · John's session brief, pasted 2026-10-05: "a user in an AI client (Claude, ChatGPT, Grok) can update the rules and knowl… · finalises Oct 8, 10:38 PM CST · `select public.reverse_decision('74843236-b407-4130-a349-a472da97468c','John','<why>');`
- `526ce846` · requirement-check · `AGT-390` · A private agent's MCP address gets a "Teach <name>" tool: the connected AI client can add a rule (role prompt, guardrai… · finalises Oct 8, 10:40 PM CST · `select public.reverse_decision('526ce846-494b-478f-8cb7-e9fc93c06b85','John','<why>');`
- `6eafed1b` · john-ruling · `AGT-390` · John 2026-10-05, verbatim: "need to make sure we tag knowledge - we know where it came from" -- every item or rule taug… · finalises Oct 8, 10:50 PM CST · `select public.reverse_decision('6eafed1b-9a2c-4ff5-86af-09450301778c','John','<why>');`
- `75b989f0` · john-ruling · `AGT-390` · John 2026-10-05 "sure reactive": testjohn-w50rvr is reactivated as the second live example for AGT-390 (Brittany is the… · finalises Oct 8, 10:51 PM CST · `select public.reverse_decision('75b989f0-2e7a-4b2b-b8f0-b7bb0263d242','John','<why>');`
- `60135230` · john-ruling · `AGT-390` · John 2026-10-05 "its fine it is there": the Teach tool may be listed on the admin address too. The visibility rule is u… · finalises Oct 8, 10:52 PM CST · `select public.reverse_decision('60135230-37f3-4d09-a72d-53877a366227','John','<why>');`
- `0b2bd8e3` · john-ruling · `AGT-390` · John 2026-10-05 "yes, approved": a guardrail taught from an AI client is its own agent_configs row under Always or Neve… · finalises Oct 8, 10:59 PM CST · `select public.reverse_decision('0b2bd8e3-147f-4a7e-8769-59dabf4d83d5','John','<why>');`
- `e7d32de3` · john-ruling · `AGT-390` · John 2026-10-05 "one build, waive the cap": AGT-390 ships as one build; the three-file / four-task cap is waived for th… · finalises Oct 8, 11:00 PM CST · `select public.reverse_decision('e7d32de3-7f74-40a3-a209-dc861bee05dc','John','<why>');`
- `419d8ee2` · ticket-scope · `AGT-390` · AGT-390 description rewritten to the walkthrough's agreed scope: origin + date tag on every taught row, client guardrai… · finalises Oct 8, 11:01 PM CST · `select public.reverse_decision('419d8ee2-9618-413e-926b-af7f852ec02c','John','<why>');`
- `83dbaa5f` · design-kickoff · `AGT-390` · Kickoff designed for AGT-390 · finalises Oct 8, 11:21 PM CST · `select public.reverse_decision('83dbaa5f-724c-4368-b356-84c55e8ee996','John','<why>');`
- `a63986f4` · john-ruling · — · John 2026-10-05, verbatim: "i think we should only run regression once a week or after a push to production. We should… · finalises Oct 8, 11:34 PM CST · `select public.reverse_decision('a63986f4-08aa-4b80-bc76-889be5318bae','John','<why>');`
- `e1a254d4` · requirement-check · `AGT-391` · Selective regression: a build runs its own test plus the related set; the full suite runs weekly and before a push to p… · finalises Oct 8, 11:36 PM CST · `select public.reverse_decision('e1a254d4-bbbc-49b1-b87e-7d910359fd0c','John','<why>');`
- `ce3a13e8` · john-ruling · `AGT-391` · John 2026-10-05 "yes waive the cap, monday is fine": AGT-391 ships as one build with the three-file / four-task cap wai… · finalises Oct 8, 11:39 PM CST · `select public.reverse_decision('ce3a13e8-23ce-4469-8a86-e5c299b1ed84','John','<why>');`
- `63e2ec07` · design-kickoff · `AGT-391` · Kickoff designed for AGT-391 · finalises Oct 9, 12:09 AM CST · `select public.reverse_decision('63e2ec07-6228-4076-970b-74493c5f1fb7','John','<why>');`
- `4838c745` · john-ruling · `AGT-390` · John 2026-10-05 (late evening CDT), verbatim: "push dev to production once agt-390 is done" -- sign-off for the dev ->… · finalises Oct 9, 12:11 AM CST · `select public.reverse_decision('4838c745-6e4c-4c88-b755-270fc3a25dec','John','<why>');`
- `e87ac5ef` · ticket-status · `AGT-390` · Close-out: AGT-390 settles 'delivered' · finalises Oct 9, 12:11 AM CST · `select public.reverse_decision('e87ac5ef-1b99-4cb5-a73e-6dd83b298a3a','John','<why>');`
- `099b6352` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 9, 12:11 AM CST · `select public.reverse_decision('099b6352-98ea-4256-bcfe-ca19d1c6fc2e','John','<why>');`
- `e904fc2f` · ticket-status · `AGT-390` · Close-out: AGT-390 settles done (v7.0.792, on dev at 9972b5fc; verifier APPROVE 830208ba, 0 newly red). · finalises Oct 9, 12:11 AM CST · `select public.reverse_decision('e904fc2f-c867-4ac7-af28-8320322df9e4','John','<why>');`
- `c76fa5e7` · john-ruling · — · Released to production: dev f07d5514 (v7.0.792) merged into main as c3e6b66d, PR #15 (release/v7.0.792-mcp-teach), 2026… · finalises Oct 9, 12:14 AM CST · `select public.reverse_decision('c76fa5e7-9c62-4be1-97b1-9ba82fc8f3dd','John','<why>');`
- `e1eb09e9` · agent-row · `AGT-391` · AGT-391: re-pin dm-knowledge-cycle-card 254dcbfa990f2bbf → 4fb23dcee4ee3b2e · finalises Oct 9, 12:28 AM CST · `select public.reverse_decision('e1eb09e9-5aef-4be3-9ae7-33fc83bfb1da','John','<why>');`
- `0bce4c62` · agent-row · `AGT-391` · AGT-391 Skill-row edits (AGENT-ROW-AGREED-TICKET, john-named): bd-guardrails must[1], bd-build-intent.method and vf-kno… · finalises Oct 9, 12:31 AM CST · `select public.reverse_decision('0bce4c62-5c78-4ecf-8663-90d8bfc752e9','John','<why>');`
- `f328ea68` · ticket-status · `AGT-391` · Close-out: AGT-391 settles 'delivered' · finalises Oct 9, 12:34 AM CST · `select public.reverse_decision('f328ea68-0d29-468b-8e4d-3dbe6d025206','John','<why>');`
- `901f7648` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 9, 12:34 AM CST · `select public.reverse_decision('901f7648-4d9d-4f4b-8e3c-98df025f5e86','John','<why>');`
- `f4550915` · ticket-status · `AGT-391` · Close-out: AGT-391 settles done (v7.0.793, on dev at eeda8f1f; verifier APPROVE d239b90a on the 118-test related set, 1… · finalises Oct 9, 12:34 AM CST · `select public.reverse_decision('f4550915-ff72-4727-9bcb-f79228e672c1','John','<why>');`
- `9a6ff2d3` · classification · — · board ordered: 6 ticket(s) given an automation_rank · finalises Oct 9, 1:52 AM CST · `select public.reverse_decision('9a6ff2d3-2918-4034-b83a-723a6d48bfcc','John','<why>');`
- `ae4e559c` · hygiene · `AGT-79` · Ticket Owner: 22 derivable cell fix(es) on 22 row(s) — cost 0 · claim 0 · type 0 · revalidation 22 · finalises Oct 9, 2:12 AM CST · `select public.reverse_decision('ae4e559c-0943-4097-844d-a07d07b59a38','John','<why>');`
- `48f953b5` · removal-proposal · `AA-56` · AA-56 removal proposed: api/prompt/db-assembly.js:630 assemblePrompt already takes runtime_context (AA-136, rendered at… · finalises Oct 9, 2:12 AM CST · `select public.reverse_decision('48f953b5-1fc9-46a6-8aee-cc507ae0c86d','John','<why>');`
- `04314733` · removal-proposal · `AI-42` · AI-42 removal proposed: Premise half-superseded: public write grants revoked platform-wide (DAT-18 v7.0.78, .claude/rul… · finalises Oct 9, 2:12 AM CST · `select public.reverse_decision('04314733-7a24-4d99-ac5b-0b9435e3a657','John','<why>');`
- `1be5490b` · removal-proposal · `AI-45` · AI-45 removal proposed: Precondition AI-44 is not on the board; the row cannot say whether it shipped, so the pass cann… · finalises Oct 9, 2:12 AM CST · `select public.reverse_decision('1be5490b-dbc5-49d0-81f5-c102ee21ab90','John','<why>');`
- `fc1e4a35` · ticket-status · `AGT-304` · Close-out: AGT-304 settles 'partial' · finalises Oct 9, 3:16 AM CST · `select public.reverse_decision('fc1e4a35-ab9d-4e62-9fde-571a85628a76','John','<why>');`
- `8263b59a` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 9, 3:16 AM CST · `select public.reverse_decision('8263b59a-1d6e-4696-9079-b79da28aadf6','John','<why>');`
- `ac131956` · stall-report · — · 10 open cycle rows went quiet at the SAME last_step — one defect, not 10 separate stalls · finalises Oct 12, 1:43 AM CST · `select public.reverse_decision('ac131956-3a96-4bae-bba8-cce5cdc6e828','John','<why>');`
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
- `19fda6f0` · john-ruling · — · John: build the rule that lets the test line open up on its own, ceiling 5, in the existing database tooling · finalises Nov 2, 3:41 PM CST · `select public.reverse_decision('19fda6f0-3297-4372-b839-ce243bacf126','John','<why>');`
- `7211dc31` · john-ruling · `AGT-349` · Test line: the 24-hour bar on level 2 is lifted after the database moved from Nano (0.5 GB) to Micro (1 GB) · finalises Nov 2, 4:14 PM CST · `select public.reverse_decision('7211dc31-2488-4444-b9b1-68f627d6d812','John','<why>');`
- `7aaa5424` · john-ruling · `AGT-349` · test_slot_capacity 2 -> 4 by hand on the 1 GB machine; the AGT-349 rule moves it from here (John 2026-10-03 ~17:26 CT) · finalises Nov 2, 4:28 PM CST · `select public.reverse_decision('7aaa5424-5597-4cb8-a00f-85f684af4213','John','<why>');`
- `ddf1eeac` · john-ruling · — · John: merge dev into production when the in-flight builds finish; the two open security findings do not hold the release · finalises Nov 2, 6:38 PM CST · `select public.reverse_decision('ddf1eeac-ea11-4c93-b28e-c2b6213c3ff7','John','<why>');`
- `613a9167` · john-ruling · — · Released to production: dev adf10589 (v7.0.776) merged into main as 49c2a228, PR #13 · finalises Nov 2, 10:04 PM CST · `select public.reverse_decision('613a9167-ce88-4caf-9eb9-0ada618e8ceb','John','<why>');`
- `df9968b6` · john-ruling · `AGT-364` · AGT-364 stays parked in Security until a subscription manager is added to DeepBench · finalises Nov 4, 8:52 AM CST · `select public.reverse_decision('df9968b6-706c-45a1-a69f-d8228c0031ed','John','<why>');`
- `5f638ad8` · john-ruling · — · John holds Claude Max 20x; no plan change. Auditor plan-tier alert closed. · finalises Nov 4, 8:57 AM CST · `select public.reverse_decision('5f638ad8-3e22-4890-98eb-525895f2dbdf','John','<why>');`
- `f1e7cf62` · john-ruling · — · Separate test database: spend held. Check the free throwaway-database lead first; revisit on the first amber or red dat… · finalises Nov 4, 8:58 AM CST · `select public.reverse_decision('f1e7cf62-9c56-4d05-9afd-ecc98292510a','John','<why>');`
- `1c5e9daa` · john-ruling · — · Standing rule: The Development Manager and Victoria Chen may jointly move a repair ticket into a running project, under… · finalises Nov 4, 9:04 AM CST · `select public.reverse_decision('1c5e9daa-b513-4654-b910-86af7a51298b','John','<why>');`
- `34074923` · john-ruling · — · Ship bar: "nothing newly red" passes only until the standing regression failures are fixed, then "all green" again; eve… · finalises Nov 4, 9:12 AM CST · `select public.reverse_decision('34074923-a910-4617-a745-006e267da2bf','John','<why>');`
- `16730a05` · john-ruling · — · 20-assignment promotion bar ratified as twenty cycles in a row with no wrong pick; cannot take effect until The Develop… · finalises Nov 4, 9:14 AM CST · `select public.reverse_decision('16730a05-a95a-473a-b566-eb636a481a99','John','<why>');`

**773 final this week, 205 reversed this week** — *this week* is a **rolling 7 days** back from the stamp, not a calendar week and not a Friday-07:00Z reset: no such weekly-reset helper exists in this file or anywhere in `scripts/`, so a rolling window is what is used and is labelled as one. A reversal is the strongest negative signal the ladder takes (`M6-07`), so the second number is the one to read first.

**Decided for you** — *as of 2026-10-06 08:16Z (Oct 6, 3:16 AM CST).* What the runner DECIDED on your behalf, by CST day (`governance_rules.MANAGER-DECIDES-BY-DEFAULT`: *a daily list of what was decided, not questions*), with the questions that reached you anyway counted beside it — target zero. Not the `Open decisions` group above: that one is the undo list and drops a decision the moment it finalises; this one is the record of the day and keeps it. **18 decided on 2026-10-06**; **3 question(s) reached you in the last 7 days — target zero**; 0 still open.

| CST day | decided | reversed | questions to you |
|---|---:|---:|---:|
| `2026-10-06` | 18 | 0 | 0 |
| `2026-10-05` | 94 | 12 | 0 |
| `2026-10-04` | 74 | 17 | 0 |
| `2026-10-03` | 380 | 146 | 0 |
| `2026-10-02` | 123 | 29 | 0 |
| `2026-10-01` | 0 | 0 | 0 |
| `2026-09-30` | 0 | 0 | 0 |

- *112 decision(s) were read but fall outside the table:* the read window is a rolling 7×24h back from the stamp, the table is the seven CST days ending `2026-10-06`, and any render after CST midnight sees the gap between them. They are in no column above.

**The 18 decided on 2026-10-06** — newest first.

- `8263b59a` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · open
- `fc1e4a35` · ticket-status · `AGT-304` · Close-out: AGT-304 settles 'partial' · open
- `1be5490b` · removal-proposal · `AI-45` · AI-45 removal proposed: Precondition AI-44 is not on the board; the row cannot say whether it shipped, so the pass cann… · open
- `04314733` · removal-proposal · `AI-42` · AI-42 removal proposed: Premise half-superseded: public write grants revoked platform-wide (DAT-18 v7.0.78, .claude/rul… · open
- `48f953b5` · removal-proposal · `AA-56` · AA-56 removal proposed: api/prompt/db-assembly.js:630 assemblePrompt already takes runtime_context (AA-136, rendered at… · open
- `ae4e559c` · hygiene · `AGT-79` · Ticket Owner: 22 derivable cell fix(es) on 22 row(s) — cost 0 · claim 0 · type 0 · revalidation 22 · open
- `9a6ff2d3` · classification · — · board ordered: 6 ticket(s) given an automation_rank · open
- `f4550915` · ticket-status · `AGT-391` · Close-out: AGT-391 settles done (v7.0.793, on dev at eeda8f1f; verifier APPROVE d239b90a on the 118-test related set, 1… · open
- `901f7648` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · open
- `f328ea68` · ticket-status · `AGT-391` · Close-out: AGT-391 settles 'delivered' · open
- `0bce4c62` · agent-row · `AGT-391` · AGT-391 Skill-row edits (AGENT-ROW-AGREED-TICKET, john-named): bd-guardrails must[1], bd-build-intent.method and vf-kno… · open
- `e1eb09e9` · agent-row · `AGT-391` · AGT-391: re-pin dm-knowledge-cycle-card 254dcbfa990f2bbf → 4fb23dcee4ee3b2e · open
- `c76fa5e7` · john-ruling · — · Released to production: dev f07d5514 (v7.0.792) merged into main as c3e6b66d, PR #15 (release/v7.0.792-mcp-teach), 2026… · open
- `e904fc2f` · ticket-status · `AGT-390` · Close-out: AGT-390 settles done (v7.0.792, on dev at 9972b5fc; verifier APPROVE 830208ba, 0 newly red). · open
- `099b6352` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · open
- `e87ac5ef` · ticket-status · `AGT-390` · Close-out: AGT-390 settles 'delivered' · open
- `4838c745` · john-ruling · `AGT-390` · John 2026-10-05 (late evening CDT), verbatim: "push dev to production once agt-390 is done" -- sign-off for the dev ->… · open
- `63e2ec07` · design-kickoff · `AGT-391` · Kickoff designed for AGT-391 · open

**Judgment classes** — *as of 2026-10-06 08:16Z (Oct 6, 3:16 AM CST).* What the corpus currently holds per pull test, live from `public.judgment_class_census` (`SES-84`; the same view `SES-159` reads). Ratification is a standing metric (John, 2026-08-23: a class is never finished being learned), never a finish line.

| class | ratified | proposed | rejected | total |
|---|---:|---:|---:|---:|
| `P1 - Improves John's Skills` | 7 | 31 | 6 | 44 |
| `P2 - Inventive` | 0 | 95 | 16 | 111 |
| `P3 - Investor Value` | 0 | 95 | 7 | 102 |
| `P4 - New Customers` | 1 | 37 | 3 | 41 |
| `neutral` | 0 | 83 | 30 | 113 |

- Newest proposed root claim for P1: *no proposed root claim*.
- Newest proposed root claim for P2: `VC-SYN-002` — Inventive features are the least-tested product goal because the bar John set — something competitors cannot easily copy — he has never applied to a real featu…
- Newest proposed root claim for P3: `VC-SYN-001` — Investor value is the least-defined product goal because nobody has yet said what an investor would check. The drafts agree on one reading: the buyer is a skep…
- Newest proposed root claim for P4: `VC-ROOT-004` — New features that win new customers. The bar is buy-pull — functionality that makes a customer say "I have to buy this." Administrative capability (accounts, b…

- **FLAG: 4 live claims still `unclassed`** — after `SES-84` this is zero by construction; a non-zero here is drift (a claim inserted without a classing decision) and needs one recorded decision, never a default.

**John-model** — *as of 2026-10-06 08:16Z (Oct 6, 3:16 AM CST).* How often a decision that leaned on a standing pattern of John's stood unreversed through its window, live from `public.john_model_signal` (`SES-004`; the criteria are `public.decision_patterns`, exported from `docs/JOHN-DECISION-PATTERNS.md`). A rate binds only from 30 finalised-or-reversed decisions (M7 gate, ruling iii).

- **99.3% agreement** over 703 finalised-or-reversed decisions (698 finalised unreversed, 5 reversed; 162 still open, 865 citing in total). A reversal is the strongest negative signal the ladder takes, so the second number is the one to read first.

| criterion | citing | final unreversed | reversed | open | rate |
|---|---:|---:|---:|---:|---:|
| `pattern:0` No standing pattern applied -- new judgment. | 438 | 348 | 1 | 89 | 99.7% |
| `pattern:9` Never spend a model call where a deterministic mechanism serves. | 112 | 94 | 0 | 18 | 100% |
| `pattern:14` When two code paths compute the same thing, build one shared core they both cal… | 106 | 84 | 0 | 22 | 100% |
| `pattern:137` P1–P4 are pull tests, not category labels — administrative expectations never q… | 85 | 80 | 0 | 5 | 100% |
| `pattern:92` Persist every finding and decision where a cold future session will find it — r… | 84 | 56 | 2 | 26 | 96.6% |

- A per-pattern `—` is not a zero: that criterion has not reached 30 finalised-or-reversed citations of its own, so it carries counts and no rate.

**Invention in use** — *as of 2026-10-06 08:16Z (Oct 6, 3:16 AM CST).* Criterion 7 (`docs/SELFBUILD-CHARTER.md`): at least one platform-originated feature — the Bench Report Card judge (`LOG-143`) — is measurably used by real visitors, live from `public.report_card_usage`. Counts only, never a rate.

- **7d:** 0 judge runs, 0 by real visitors (0 distinct).
- **30d:** 0 judge runs, 0 by real visitors (0 distinct).
- **all:** 3 judge runs, 0 by real visitors (0 distinct).

- *no real-visitor use yet.*

**Board by served class** — *as of 2026-10-06 08:16Z (Oct 6, 3:16 AM CST).* Which class each open ticket SERVES under the served-class test (`VC-MISSION-033`), ruled by The Prioritizer's `classify-ticket` and stored on `backlog_items.supports_class` — a ticket's own class is a different question and is not restated here.

| serves | open tickets |
|---|---:|
| `P1 - Improves John's Skills` | 81 |
| `P2 - Inventive` | 11 |
| `P3 - Investor Value` | 4 |
| `P4 - New Customers` | 2 |
| `P7 - Agent Creation` | 1 |
| *serves none* | 579 |

- *Negative ranks are John's own automation queue, seeded to sort ahead of anything assigned later (`SES-86`). The nightly re-rank writes 1..N and therefore sits below them — intended precedence, not a re-rank that failed.*

- **Top 5 by `automation_rank`:**
  -35. `SES-288` — A schema-range red can never be auto-reverted: one refused down-migration disables rollba… *(serves none)*
  1. `AGT-340` — A private agent's MCP address answers "what were you taught about X?" lookups and logs th… *(serves none)*
  1. `AGT-308` — A ticket gated at step 5 with no card and no design_status stays at queue #1 and is re-pi… *(serves none)*
  2. `AGT-341` — MCP calls record which AI tool connected (Claude, ChatGPT, other), so a private agent's A… *(serves none)*
  3. `AGT-387` — Private agent Activity tab: AI patterns become their own card with a count per pattern; C… *(serves none)*

- Last scheduled re-rank: Oct 6, 1:51 AM CST.

**Governance agents, last 7 days** — *as of 2026-10-06 08:16Z (Oct 6, 3:16 AM CST).* Whether the platform's own agents (`agents.lane = 'governance'`) are doing the development work, live from `public.governance_agent_usage` and `public.ship_handoff_census` (`SES-360`). A **rolling 7 days** back from render time, like the decision counts above. Counts and token sums only, never a rate.

| role | source | calls | input tokens | output tokens |
|---|---|---:|---:|---:|
| Governance — Development Manager | `session` | 68 (58 untokened) | 5385174 | 85940 |
| Governance — Researcher | `session` | 2 (2 untokened) | 0 | 0 |
| Governance — Prioritizer | `session` | 15 (10 untokened) | 130832 | 65883 |
| Governance — Prioritizer | *unlabelled* | 406 (406 untokened) | 0 | 0 |
| Governance — Designer | `session` | 72 (62 untokened) | 1682465 | 127000 |
| Governance — Builder | `session` | 47 (40 untokened) | 1044587 | 68000 |
| Governance — Verifier | *no calls in the window* | 0 | — | — |
| Governance — Auditor | `session` | 22 (10 untokened) | 596130 | 95955 |
| Governance — Ticket Owner | `session` | 5 | 0 | 0 |

- **Ships with all four handoff rows: 9 of 22** ships in the window (`SES-345`'s four: `automation_rank`, `kickoff_link`, a per-ticket push sha, a verdict row). Missing per leg: kickoff_link 0, per-ticket sha 2, automation_rank 12, verdict 0.
- *unlabelled* is a NULL `call_source` — the pre-attribution unknown, never read as automation (`LOG-128`); `untokened` rows carry no token counts at all (deterministic handler rows), so a large call count beside a small token sum is that, not a cheap model.

**Auditor's ledger** — *as of 2026-10-06 08:16Z (Oct 6, 3:16 AM CST).* What `public.audit_findings` (`AGT-70`) holds and what has left it for the board. Counts only, never a rate. Latest week 2026-W41: **137 findings (24 open · 0 resolved · 18 not a defect)** — **0 ruled** open findings (a ruled, open, `high` row is what `tripwire-to-backlog.js --from-ledger` files, at most 3 per ISO week); **0 filed** to the board from the ledger so far (`source_file = 'audit-ledger'`).

| fingerprint | kind | confidence | fact | ruled |
|---|---|---|---|---|
| `0d27f95d9c68f060` | other | high | Ticket Owner check delivered-unaccepted holds open judgment rows a capability m… | — |
| `349930ee7d1861a7` | other | high | Settle "acts or answers" with the beta prospect before any acting work is scope… | — |
| `5074b48424bc812c` | other | high | Taught knowledge stops being public: revoke the browser key's read on knowledge… | — |
| `51b071953dd36893` | other | high | build needed a fact the kickoff did not carry | — |
| `5765295afdf27494` | redundant | high | Since AGT-384 the Connect surface is /bench/connect?agent=<id>; /connect still… | — |
| `60b9db5c2fa6be7f` | contradiction | high | John, 2026-10-05 (session discovery-1005): no one should be able to run an 'ai'… | — |
| `6ec902914e951159` | stale-or-irrelevant | high | AGT-384 (v7.0.788) retired the Connect popup; the file now exports ConnectSteps… | — |
| `7009e42d707bc38d` | contradiction | high | session-setup.md 1b states OPENAI_API_KEY is read by name from runner_secrets f… | — |
| `7e54730517fb8a28` | other | high | ARCHITECTURE.md 19v and AGT-170: a regression claim is graded on the DELTA agai… | — |
| `86b2da89a5402103` | other | high | run-project.js stringifies a record_skip reason as [object Object], so the only… | — |
| `880668364aeea308` | other | high | Re-run AGT-364's cross-agent read against the current build and record the resu… | — |
| `c462bcb11dcba2ee` | contradiction | high | AGT-183: a pick path that moved on because this cycle holds the pick's claim is… | — |
| `c5990f4c7386b912` | other | high | assignment differs from the queue head | — |
| `c8b6bff7c7a3104a` | contradiction | high | session-setup.md step 4 says every attended close-out runs the sweep so a decis… | — |
| `de6b6c1f083a2e35` | other | high | kickoff carried no lane declaration on first assembly | — |
| `f70c3589b5200962` | other | high | agt-163's part E runs only when VITE_SUPABASE_ANON_KEY is in the environment (t… | — |
| `session:routine-review-1005:joint-repair-move-rule-unbuilt` | other | high | John ruled on 2026-10-05 that The Development Manager and Victoria Chen may joi… | — |
| `session:routine-review-1005:ship-bar-temporary-delta-unbuilt` | contradiction | high | John ruled on 2026-10-05 that a ship may pass on nothing-newly-red only until t… | — |
| `3f4dd0c03ec0e927` | other | medium | On /bench/connect, picking a team writes the team's MCP address into the ?agent… | — |
| `6e5335c6b856e198` | stale-or-irrelevant | medium | Since AGT-390 every customer agent holds two tools on its address (Knowledge an… | — |
| `7353dd9c8e997c9f` | other | medium | api/_lib/handlers/agent-teach.js logs feature 'agent-teach' (deterministic, no… | — |
| `session:routine-review-1005:promotion-bar-prize-unstated` | other | medium | John ratified the 20-assignment promotion bar on 2026-10-05 as twenty cycles in… | — |
| `session:routine-review-1005:test-db-free-lead-unchecked` | other | medium | John held the roughly $40/month separate test database on 2026-10-05 and asked… | — |
| `16b94a94e8b412c0` | other | low | The runbook cannot take a new header stamp without rotating the block and its p… | — |

- *A finding leaves this table only by John's ruling — `resolved`, `not-a-defect`, or ruled and left `open` to file. Candidates a run found but nobody ingested live in `docs/audits/<week>-candidates.json`, not here.*

**Ticket hygiene, last night** — *as of 2026-10-06 08:16Z (Oct 6, 3:16 AM CST).* What the Ticket Owner (`AGT-79`) left on the board: `public.ticket_owner_findings` open rows by check, the newest `hygiene` decision and the newest nightly cycle row. Counts only, never a rate. **241 open findings** across 9 check(s).

| check | open | oldest | nights open |
|---|---:|---|---:|
| `delivered-unaccepted` | 54 | Sep 12, 10:31 PM CST | 23 |
| `verdict-missing` | 47 | Sep 12, 10:31 PM CST | 23 |
| `type-off-taxonomy` | 42 | Sep 12, 10:31 PM CST | 23 |
| `designed-closed` | 40 | Sep 23, 7:50 PM CST | 12 |
| `size-missing` | 31 | Sep 12, 10:31 PM CST | 23 |
| `remainder-stranded` | 10 | Sep 18, 5:38 AM CST | 17 |
| `quote-missing` | 8 | Sep 12, 10:31 PM CST | 23 |
| `cycles-over-quote` | 6 | Sep 12, 10:31 PM CST | 23 |
| `claim-expired` | 3 | Oct 2, 1:57 AM CST | 4 |

- Last run: `d62c14bd` · shipped · Oct 6, 2:12 AM CST · 1089 rows · 266 findings (22 derivable · 244 judgment) · behind the fences: quote 476 · size 444 · cost 45 · verdict 97 · unrevalidated>30d 318 · attended-actual null 408 · revalidation 318 left (batch 25, carried 0) · retired 1 check / 148 rows · fixed 22 · proposed 3 · findings +22 ~219 −2 · decision ae4e559c-0943-4097-844d-a07d07b59a38 — reversible until 2026-10-09T07:12:14.879676+00:00 · judged 22/6/0 on claude-fable-5-1
- Judgment: **the newest night was judged** — 0 unjudged nights on top, over the newest 14 on record.
- Decision `ae4e559c` · open · Ticket Owner: 22 derivable cell fix(es) on 22 row(s) — cost 0 · claim 0 · type 0 · revalidation 22 · finalises Oct 9, 2:12 AM CST · `select public.reverse_decision('ae4e559c-0943-4097-844d-a07d07b59a38','John','<why>');`

**Victoria's lists, last Tuesday** — *as of 2026-10-06 08:16Z (Oct 6, 3:16 AM CST).* What the weekly list reorganization (`AGT-281`) ruled: the newest 2 ended `public.runner_cycles` rows whose `notes` carry `SCHEDULED-AGENT: victoria-reorg`, each printing its own run line. One row per LIST, so a Tuesday that ruled both lists shows two. **2 run(s)** on record.

- backlog-intake: 2 items into 1 needs, 1 turned down; top 3: ZAGTVIC-1022652a(4) · Oct 5, 6:28 PM CST
- backlog-intake: 2 items into 1 needs, 1 turned down; top 3: ZAGTVIC-2967046a(4) · Oct 3, 7:14 PM CST

- **2 ticket(s) turned down** across those run(s) — each one sits on `removal proposed` in John's waiting room under its own `removal-proposal` decision, and one `reverse_decision()` returns it to the drain. Nothing on this path ever writes `removed` (`SES-113`).

**Staff watch** — *as of 2026-10-06 08:16Z (Oct 6, 3:16 AM CST).* What the Development Manager (`SES-378`) recorded about the runner's own agents: `public.runner_staff_findings` rows per `agent_id`, with the distinct fingerprints and the distinct CYCLES behind them. Counts only, never a rate. **117 finding(s)** across 2 agent(s).

| agent | findings | distinct fingerprints | distinct cycles | newest |
|---|---:|---:|---:|---|
| `designer` | 103 | 33 | 78 | Oct 6, 2:12 AM CST |
| `devmanager` | 14 | 5 | 14 | Oct 6, 2:30 AM CST |

**Human gates** — *as of 2026-10-06 08:16Z (Oct 6, 3:16 AM CST).* The two reads that say whether anything is waiting on a human: open `backlog_items` carrying `design_status = 'needs-john'`, and `gated_before_build` `runner_items` left with `decision IS NULL` (`M6-01`). Board state, written by no code in this repo — which is why it is REPORTED here and not asserted as a gate by the regression suite. **1 open `needs-john` ticket(s)**, **4 undecided `gated_before_build` card(s)**.

- **`needs-john` (1):** `AGT-110`
- **Undecided gated cards (4):** `54b42eea-be4f-434d-963a-6707873bc137`, `b3d185e1-ef33-4e16-bb07-986751d5f928`, `307899a1-cdc7-4453-8564-bbc381c913ac`, `5d1f0891-4013-4f9c-80fd-6a3aa3a946c1`
- *Open is not wrong.* A card nobody has answered yet is a real board state; what it is NOT is a regression, so nothing in the suite goes red for it.

*Provenance: 1000 board rows, payload `sha256:9c2f428eaea68a56`, as of 2026-10-06 08:16Z (Oct 6, 3:16 AM CST). The stamp says when this was last read; the sha says whether it still matches the tables. `--check` compares the sha, never the stamp — a refreshed stamp over identical facts is not drift.*
<!-- END GENERATED — scripts/render-standing-brief.js -->

**Next session:** none required — the runner is live and works **John's automation queue** (canonical: `docs/RUNNER-GOV-0820-REQUIREMENTS.md`): the queue is the board's leading sort key, not a list to read (`automation_rank`, v7.0.133) — `ORDER BY queue` already honours it. Classes are always written named, **`P1 - Improves John's Skills` → `P10 - Tooling`**; outcomes as plain words (“did not run”, “gated before build”); budget is two-track (API dollars + token governor). John judges from the briefing page. Runner pause: disable `deepbench-runner` at claude.ai/code/routines. **Board census measured 2026-08-23T12:5xZ by runner cycle `363b5138`, taken from the board after its own close-out recompute rather than carried forward:** **561 open tickets, 561 numbered, 0 open-but-unnumbered**, 611 rows total, **the standing Automation drain now has a FIXED finish line** — from `v7.0.179` (`SES-142`) it works the **18 members John named** on directive `b74009ea`, stored as `runner_drain_scope` FK rows, and a ticket filed into the epic *after* that naming **never joins it**: it queues normally and waits for him. The live `now` tier had already drifted to 19 against his 18. `drain_epic_next()` retires when those 18 are `done`/`removed`, and returns the new outcome **`unscoped`** — never a live-tier fallback — for any future drain declared without a list. Queue/drain state as of **v7.0.196** (2026-08-23 ~17:00Z, `successional-review` close-out, 561 rows renumbered): `SES-140` — *the successor fire is refused by the platform* and `SES-151` — *the scheduler runs on John's clock grid* are both **`done`**; the drain's nearest open member `SES-84` — *the vision corpus* (`needs-john`) waits on John's briefing decisions, so cycles step past it (`SES-114`) and work the board (`SES-121` — *shrink the `.claude/`-mutable surface* went `done` at v7.0.198; procedure text now lives in `docs/runbooks/`, cycle-writable). **The board's `title` column is trustworthy for display for the first time** (`SES-91`, v7.0.177): 98 rows that held a bare priority-class string now carry a real authored title, and the only `^P[0-9]+ - ` title left is `ADM-1`, whose title is a real sentence behind a stale class prefix and is deliberately left for `SES-117` to **accommodate** rather than repair. `SES-119` is now `done` (v7.0.184 + v7.0.185): the briefing renders `public.backlog_display_title(title, description)` rather than the read-time `gist` workaround, and **`runner-cycle.md`'s Language block now requires a ticket's title wherever John reads its ID**. Step 5's `gist` expression deliberately stays — it is still correct for any future row filed the old way, and 50 of 562 open numbered tickets still fall back to it. **From v7.0.195 the chain runs IN-SESSION (`SES-140` FINAL)** — a cycle that actually ran one (`shipped`/`gated_before_build`/`reverted`) and whose drain still returns `pick` opens its next `runner_cycles` row (trigger `chained (drain continuation)`) **in the same session** and re-enters the runbook at step 1; session-spawning is retired as platform-unsupported (`runner-cycle.md` tail step (8) carries the evidence). A **wall-stopped cycle continues nothing**, which keeps the budget wall a brake rather than a metronome. Proven live 2026-08-23: cycles `1fcd687e` → `a11c94d2`, the first chained row in the runner's life. **The briefing-redesign epic is finished** — `SES-129`, its last member, shipped in cycle `ed1a5eb3`. **A new filing rule binds from this version:** `runner_items.backlog_id` takes a **bare** ticket id or NULL and is enforced by `ck_runner_items_backlog_id_bare`; the display string belongs in `display_ref`, and the briefing's id chip reads `coalesce(backlog_id, display_ref)` (`SES-116`, v7.0.174 — `runner-cycle.md` step 9). **`design_status` reads for selection (`SES-114`, v7.0.165); among OPEN tickets measured at the v7.0.198 close-out:** 16 `designed` (incl. `SES-101`, flipped from `needs-desktop` — its one remaining edit now lives in `docs/runbooks/session-setup.md` step 3c, cycle-writable), **0 `needs-desktop`**, **1 `needs-john`** (`SES-84`), 546 `NULL` = not yet triaged, deliberately not guessed to `auto`. Measured at the v7.0.198 close-out: **11 of John's 18 named members remain open** (`SES-121` retired from the list by going `done` this session); the only `needs-john` member is `SES-84` — the rest are buildable, the drain reaches them and can retire on them. **`CHI-89`** still holds its queue slot with its removal card undecided — visible to John and skipped by cycles, exactly as `SES-113` intended. **`SES-133` is still open at `partial`** — the other half of John's 2026-08-23 emergencies directive; it sits at queue 251 rather than at the top, because the drain reads the Automation epic's `now` tier in queue order and `SES-133` is not in that epic. **From v7.0.182 John's own switches govern the cadence** (`SES-143`): the briefing's **§2b Automation panel** carries a scheduler checkbox + an every-N-hours box (the generated block above is the only home for their live values — it renders `runner_settings` row 1 fresh each cycle, `SES-151`) and a drain checkbox, and `runner-cycle.md`'s **new step 1b** calls `public.scheduler_gate()` before anything else — a scheduled cycle arriving early closes `did_not_run` with *"paced by your scheduler setting"*, and with the scheduler off it closes *"scheduler off"*. **The cron is John's own routine switch** — a cycle cannot edit its own routine — and **from v7.0.196 (`SES-151`) the gate paces by John's clock grid**: a scheduled fire runs iff its row's `started_at` falls in an America/Chicago hour divisible by `runner_settings.interval_hours` — row 1, read live, never a number written here — and the routine's cron fires in that hour (DST-proof; the mixed-clock elapsed test that wrongly paced 3 of 9 hourly fires is dead, `q-hourly-interval-boundary` answered by ship). Two consequences worth knowing before reading a quiet night as a stall: the gate **fails open** on every unknown, and it governs **scheduled** fires only, so a standing drain's chained continuation cycles run regardless — while the Automation drain stands, **the chain and not the interval is what actually sets the pace**. A manual fire (off the cron grid) is never paced; whether that is what John wants is the one thing the spec leaves open, asked as `q-manual-fire-pacing`. **From v7.0.188 that gate actually fires** (`SES-146`): until then `scheduler_gate()` matched the trigger by exact equality against the bare word `scheduled`, so a cycle passing the verbatim line step 1b asks for — `trigger: scheduled` — fell through to *"not a scheduled cycle"* and skipped **both** the pacing branch and the `scheduler_on = false` branch, and the grid test compared `now()`-at-step-1b rather than the fire time against a hardcoded ±2. Both failed open, so the panel looked live and bound nothing. The trigger is now normalised, the grid is anchored to the cycle row's own `started_at`, and the tolerance is the column `runner_settings.grid_tolerance_min` (10). **Silence is not a “no”** on any open question. **From v7.0.183 the board's open status is `open`, never `missing`** (`SES-118`): `backlog_items_status_check` now allows exactly `('open','partial','done','removal proposed','removed')` and the retired value raises `23514` — 510 rows renamed, `updated_at` deliberately untouched so step 8c's 30-day revalidation sweep still sees the sinking tail. **That consequence closed at v7.0.189** (attended session `ses118-gated`, 2026-08-23): step 3c's INSERT now writes `'open'`, zero `'missing'` literals remain under `.claude/`, and `SES-118` is `done` — its gated card `76564dde` awaits John's decision on the briefing page.
