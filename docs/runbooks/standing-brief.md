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
## Live board state — generated, do not hand-edit — *as of 2026-09-20 23:40Z (Sep 20, 6:40 PM CST)*

> Rendered from the tables by `scripts/render-standing-brief.js` at every ship. **Every number below is derived; nothing here is maintained by hand.** The judgment prose beneath this block is the opposite — hand-maintained, deliberately, and this script never writes outside these markers. Where the two disagree about a number, this block is right and the sentence below is stale: say so rather than reconciling them by hand.

**Board census** — *as of 2026-09-20 23:40Z (Sep 20, 6:40 PM CST).* **670 open tickets**, 642 numbered, **28 open-but-unnumbered**, 948 rows total.

| `status` | rows | share of board |
|---|---:|---:|
| `open` | 556 | 58.6% |
| `done` | 266 | 28.1% |
| `removal proposed` | 48 | 5.1% |
| `partial` | 46 | 4.9% |
| `delivered` | 20 | 2.1% |
| `removed` | 12 | 1.3% |

**`design_status` among OPEN tickets** — *as of 2026-09-20 23:40Z (Sep 20, 6:40 PM CST).* Reads for selection (`SES-114`); `NULL` is *not* `auto`, it is not-yet-triaged and no cycle may backfill it.

| `design_status` | open rows | selection effect |
|---|---:|---|
| `NULL` | 604 | full ceremony — not yet triaged |
| `needs-decision` | 44 | — |
| `designed` | 14 | **not a skip** — build from `kickoff_link` (step 6 fast path) |
| `needs-desktop` | 7 | skipped, `record_skip()` — needs a session John attends (B39) |
| `auto` | 1 | full ceremony |

**Scheduler and automation settings** — *as of 2026-09-20 23:40Z (Sep 20, 6:40 PM CST).* §2b of the briefing, John's own switches, binding via `scheduler_gate()` at step 1b:

- Scheduler: **on**, every **1 hour** on John's clock grid (America/Chicago hours divisible by the interval — `SES-151`, DST-proof).
- Cron minute **40**, manual-fire tolerance **±10 min** (a start outside it is treated as a manual fire and is never paced).
- Standing daily max: **196M tokens**. This is rung 3 of five, **below** the 48h stale floor: a standing number must not defeat the staleness brake.

**Standing epic drain** — *as of 2026-09-20 23:40Z (Sep 20, 6:40 PM CST).* Created only by John; the runner may read one, never write one (`drain_epic_next()` property 5). The finish line is drawn from the members he **named** (`runner_drain_scope`), never the live `now` tier (`SES-142`) — and within that list it is the members a milestone **gate ruled required** (`milestone_required`, `SES-310`) whenever the list carries such a ruling, every named member otherwise.

- **No drain standing.** Selection is the class-sorted board exactly as it is with no drain declared.

**Open decisions** — *as of 2026-09-20 23:40Z (Sep 20, 6:40 PM CST).* Decisions made under `M6-02` that are still inside their reversal window (`runner_settings.reversal_window_hours` = 72h). Silence finalises them; to reverse one, run the line beside it (`docs/runbooks/session-setup.md` § Reversing a decision).

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
- `4c1e633e` · ticket-scope · `SES-418` · Narrowed SES-418 to its remaining half: the constraint it was filed for was widened by a peer while this session ran, s… · finalises Sep 21, 5:51 AM CST · `select public.reverse_decision('4c1e633e-da77-4609-8f71-b9ca31acccda','John','<why>');`
- `7a57750b` · agent-row · `SES-385` · re-pin dm-knowledge-cycle-card (SES-385 slice 2) · finalises Sep 21, 5:59 AM CST · `select public.reverse_decision('7a57750b-c5ae-4376-bf75-680e477b9db7','John','<why>');`
- `1806fab1` · ticket-status · `SES-385` · clear designed on 50 closed rows · finalises Sep 21, 6:00 AM CST · `select public.reverse_decision('1806fab1-9408-41f5-8dae-17e28bc382d3','John','<why>');`
- `c75c5db0` · ticket-status · `SES-413` · Close-out: SES-413 settles 'partial' · finalises Sep 21, 6:00 AM CST · `select public.reverse_decision('c75c5db0-32ce-4a3f-a67a-9da8cd2904a4','John','<why>');`
- `090aadba` · ticket-status · `SES-415` · Close-out: SES-415 settles 'partial' · finalises Sep 21, 6:00 AM CST · `select public.reverse_decision('090aadba-c087-4f40-9469-8e5374dfbd50','John','<why>');`
- `2bfe3689` · agent-row · `SES-385` · re-pin dm-knowledge-cycle-card (SES-385 slice 2) · finalises Sep 21, 6:08 AM CST · `select public.reverse_decision('2bfe3689-9014-4d7d-af6d-83d5c4999a4e','John','<why>');`
- `4e6db963` · ticket-status · `SES-385` · Close-out: SES-385 settles 'partial' · finalises Sep 21, 6:16 AM CST · `select public.reverse_decision('4e6db963-066a-404a-a540-9efeeb1ccbca','John','<why>');`
- `65317a1e` · rollback · — · Auto-rollback held: ci-red on e7e4a0e was not reverted (card-only) · finalises Sep 21, 6:22 AM CST · `select public.reverse_decision('65317a1e-6da1-4d66-8da4-e68274ec9946','John','<why>');`
- `01e061ac` · agent-row · `SES-378` · re-pin dm-knowledge-cycle-card (slice 8) · finalises Sep 21, 6:30 AM CST · `select public.reverse_decision('01e061ac-5bcf-4332-b07f-b7bca2a665eb','John','<why>');`
- `fd6fca83` · ticket-status · `SES-378` · Close-out: SES-378 settles 'partial' · finalises Sep 21, 6:52 AM CST · `select public.reverse_decision('fd6fca83-2213-4e69-b7f8-8485ea8a5889','John','<why>');`
- `7210e3cc` · settings · `SES-415` · Re-exported the decision-pattern library so public.decision_patterns and docs/JOHN-DECISION-PATTERNS.md agree again: ev… · finalises Sep 21, 7:17 AM CST · `select public.reverse_decision('7210e3cc-52be-4ff2-9775-2dad3fcdce26','John','<why>');`
- `1401cb4f` · rollback · — · Auto-rollback held: ci-red on 70b5ab1 was not reverted (card-only) · finalises Sep 21, 7:18 AM CST · `select public.reverse_decision('1401cb4f-90d5-467c-a318-3cbe69a7025d','John','<why>');`
- `106f5338` · agent-row · `SES-287` · SES-287 slice 2 re-pins dm-knowledge-cycle-card after the step-4a runbook edit re-renders the cycle card · finalises Sep 21, 8:04 AM CST · `select public.reverse_decision('106f5338-00f6-435e-a307-88fafc308a98','John','<why>');`
- `bea937ad` · ticket-scope · `SES-421` · Filed SES-421: the decision-pattern drift guard compares a per-row version stamp for equality, so any ship that bumps t… · finalises Sep 21, 8:10 AM CST · `select public.reverse_decision('bea937ad-23cd-478c-aab6-94e85698d1db','John','<why>');`
- `3732c7ea` · ticket-status · `SES-385` · Close-out: SES-385 settles 'partial' · finalises Sep 21, 8:13 AM CST · `select public.reverse_decision('3732c7ea-4b56-4c35-ad96-f007cb631dc7','John','<why>');`
- `3e81220c` · agent-row · `SES-413` · re-pin dm-knowledge-cycle-card (SES-413 slice 4) · finalises Sep 21, 8:22 AM CST · `select public.reverse_decision('3e81220c-77c4-43c3-aa3e-e44976bffde0','John','<why>');`
- `3f78ccb5` · ticket-status · `SES-287` · Close-out: SES-287 settles 'partial' · finalises Sep 21, 8:39 AM CST · `select public.reverse_decision('3f78ccb5-d2e1-430a-a151-128d341d950d','John','<why>');`
- `810d85e6` · ticket-status · `SES-413` · Close-out: SES-413 settles 'partial' · finalises Sep 21, 8:44 AM CST · `select public.reverse_decision('810d85e6-abbc-433c-88c6-6f87b3118ae1','John','<why>');`
- `e25a5055` · rollback · — · Auto-rollback held: ci-red on fe6a30f was not reverted (card-only) · finalises Sep 21, 8:45 AM CST · `select public.reverse_decision('e25a5055-410f-47a1-971c-b9fe50d1ebd7','John','<why>');`
- `1c9056d5` · classification · — · board ordered: 3 ticket(s) given an automation_rank · finalises Sep 22, 1:49 AM CST · `select public.reverse_decision('1c9056d5-21f0-49b3-bf2c-32a986ad9a2a','John','<why>');`
- `fe7ee29f` · ticket-status · `SES-422` · Close-out: SES-422 settles 'partial' · finalises Sep 22, 2:18 AM CST · `select public.reverse_decision('fe7ee29f-0b86-4415-9676-beb62de31242','John','<why>');`
- `536e40b8` · repair · `SES-422` · Repair: 422 backlog_items before-images re-keyed from backlog_id text to the row uuid (SES-407) · finalises Sep 22, 2:45 AM CST · `select public.reverse_decision('536e40b8-22bb-4724-82ac-0ab842edde57','John','<why>');`
- `28c73bd7` · ticket-status · `SES-422` · Close-out: SES-422 settles 'partial' · finalises Sep 22, 3:07 AM CST · `select public.reverse_decision('28c73bd7-c5a5-4aa4-bbed-487131466309','John','<why>');`
- `00d83e5a` · ticket-status · `SES-422` · Close-out: SES-422 settles 'partial' · finalises Sep 22, 3:56 AM CST · `select public.reverse_decision('00d83e5a-ef1a-4040-9a04-036bf436604a','John','<why>');`
- `76adbe52` · ticket-status · `SES-422` · SES-422 finished: the last remainder was measured closed, so the ticket moves partial -> delivered · finalises Sep 22, 4:06 AM CST · `select public.reverse_decision('76adbe52-332f-4485-888c-ca58b15ca4a4','John','<why>');`
- `10a7acad` · backlog-file · `SES-425` · Filed SES-425 — the auto-rollback engine is permanently card-only because step 4a never passes --range-shas · finalises Sep 22, 4:07 AM CST · `select public.reverse_decision('10a7acad-8c43-4735-8998-345c4ab8b450','John','<why>');`
- `27479ed2` · ticket-status · `SES-423` · Close-out: SES-423 settles 'partial' · finalises Sep 22, 4:53 AM CST · `select public.reverse_decision('27479ed2-b0a7-46a5-b8ac-cbbcc91d3e5b','John','<why>');`
- `73ae941e` · agent-row · `SES-423` · SES-423 slice 2: re-pin dm-knowledge-cycle-card to the re-rendered docs/runbooks/cycle-card.md (dc0aa46175d7e210 -> 800… · finalises Sep 23, 2:21 AM CST · `select public.reverse_decision('73ae941e-ffe1-45e6-a6fe-8d37fcea2219','John','<why>');`
- `596fa7c3` · agent-row · `SES-423` · SES-423 slice 2: re-pin dm-knowledge-cycle-card to the re-rendered docs/runbooks/cycle-card.md (800d821aeff8a638 -> 519… · finalises Sep 23, 2:24 AM CST · `select public.reverse_decision('596fa7c3-2f5c-4edf-98bd-c9610670afef','John','<why>');`
- `06bd3e74` · agent-row · `SES-423` · SES-423 slice 2: re-pin dm-knowledge-cycle-card to the re-rendered docs/runbooks/cycle-card.md (5195a73c2f36bdf0 -> f75… · finalises Sep 23, 2:32 AM CST · `select public.reverse_decision('06bd3e74-3464-4ad2-8e02-d8b6efb669c8','John','<why>');`
- `31bf255d` · ticket-status · `SES-423` · Close-out: SES-423 settles 'partial' · finalises Sep 23, 2:45 AM CST · `select public.reverse_decision('31bf255d-255c-4051-9aa2-01b8340c54ab','John','<why>');`
- `ab0a0526` · agent-row · `SES-423` · SES-423 slice 3 (v7.0.532): re-pin dm-knowledge-cycle-card.traits.source_sha256 to the re-rendered cycle-card.md (f7508… · finalises Sep 23, 3:18 AM CST · `select public.reverse_decision('ab0a0526-d3fe-454f-91ab-ebbe80d26f10','John','<why>');`
- `afc26f77` · agent-row · `SES-423` · SES-423 slice 3 (v7.0.532): re-pin dm-knowledge-cycle-card.traits.source_sha256 to the re-rendered cycle-card.md digest… · finalises Sep 23, 3:19 AM CST · `select public.reverse_decision('afc26f77-c45f-4540-8531-725e5cb484e6','John','<why>');`
- `d70ce071` · agent-row · `SES-423` · SES-423 slice 3 (v7.0.532): re-pin dm-knowledge-cycle-card.method to the re-rendered docs/runbooks/cycle-card.md (8470… · finalises Sep 23, 3:25 AM CST · `select public.reverse_decision('d70ce071-ad8f-477b-b22c-625891446109','John','<why>');`
- `bd7e5ecc` · ticket-status · `SES-423` · Close-out: SES-423 settles 'delivered' · finalises Sep 23, 3:37 AM CST · `select public.reverse_decision('bd7e5ecc-655d-4701-9470-b4490e93dcc7','John','<why>');`
- `dbb3067d` · removal · `SES-380` · SES-380 reported dead: SES-381 (v7.0.470) retired the whole-file <6000 B bar the ticket was filed against, and CLAUDE-S… · finalises Sep 23, 3:39 AM CST · `select public.reverse_decision('dbb3067d-a80c-43ff-b132-c8d5ac158fac','John','<why>');`
- `5962d2b2` · removal · `SES-385` · SES-385 reported dead: settle-ship.js (v7.0.519) and its census (v7.0.524) shipped, and no done or delivered row carrie… · finalises Sep 23, 3:39 AM CST · `select public.reverse_decision('5962d2b2-6a2f-4721-a8fd-ad217d8b3daf','John','<why>');`
- `129e0860` · ticket-status · `SES-424` · Close-out: SES-424 settles 'partial' · finalises Sep 23, 4:15 AM CST · `select public.reverse_decision('129e0860-cb3c-4bb6-92d2-349deb5ff9fa','John','<why>');`
- `b84e133d` · rule · `SES-424` · Filed governance rule MANAGER-AUTHORITY-MATRIX: the decision authority matrix by kind, whose row 1 gives the dm-knowled… · finalises Sep 23, 4:43 AM CST · `select public.reverse_decision('b84e133d-4d41-4f87-a657-dd5b83060469','John','<why>');`
- `d2e55f26` · ticket-status · `SES-424` · Close-out: SES-424 settles 'partial' · finalises Sep 23, 4:58 AM CST · `select public.reverse_decision('d2e55f26-5d21-4405-8362-9ae70df05a00','John','<why>');`
- `4666c6bd` · agent-row · `SES-424` · SES-424 slice 3 (v7.0.535): re-pin dm-knowledge-cycle-card to the re-rendered docs/runbooks/cycle-card.md — traits.sour… · finalises Sep 23, 5:27 AM CST · `select public.reverse_decision('4666c6bd-9426-4bc8-a314-f1c22fd7949b','John','<why>');`
- `5999b8e9` · ticket-status · `SES-424` · Close-out: SES-424 settles 'partial' · finalises Sep 23, 5:55 AM CST · `select public.reverse_decision('5999b8e9-a8a2-4d3d-b38c-d40eaab1c85d','John','<why>');`
- `4112721f` · agent-row · `SES-424` · SES-424 slice 4: ds-/bd-/dm-knowledge-patterns rows and links — agents read the patterns tagged for their role · finalises Sep 23, 6:23 AM CST · `select public.reverse_decision('4112721f-a529-41b2-ae53-530348a61962','John','<why>');`
- `2c6ebf6c` · gate · `SES-424` · Retire card 489e7554 (SES-415): its question is answered · finalises Sep 23, 6:28 AM CST · `select public.reverse_decision('2c6ebf6c-f4bc-4a3a-9f9a-7842554e40a2','John','<why>');`
- `bcd25fbe` · ticket-status · `SES-424` · Close-out: SES-424 settles 'partial' · finalises Sep 23, 6:40 AM CST · `select public.reverse_decision('bcd25fbe-bbda-4d7a-96cd-51ef17ad6220','John','<why>');`
- `333fb368` · classification · — · board ordered: 1 ticket(s) given an automation_rank · finalises Sep 23, 4:50 PM CST · `select public.reverse_decision('333fb368-8b07-4f1f-a2f6-262c7935ecf6','John','<why>');`
- `2d9085b6` · hygiene · `AGT-79` · Ticket Owner: 1 derivable cell fix(es) on 1 row(s) — cost 0 · claim 1 · type 0 · finalises Sep 23, 4:57 PM CST · `select public.reverse_decision('2d9085b6-ad41-4b44-aaff-110426092629','John','<why>');`
- `8e5e6a82` · agent-row · `SES-424` · SES-424 slice 5: patterns_applied on ds-kickoff-intent, bd-build-intent, dm-run-intent — every governance answer names… · finalises Sep 23, 5:21 PM CST · `select public.reverse_decision('8e5e6a82-caa7-439c-842a-e3f5f3d2f773','John','<why>');`
- `48d7fcce` · ticket-status · `SES-424` · Close-out: SES-424 settles 'partial' · finalises Sep 23, 5:46 PM CST · `select public.reverse_decision('48d7fcce-9e27-4c6a-98fa-6ce854bf75a8','John','<why>');`
- `d712d5a8` · agent-row · `SES-424` · SES-424: re-pin dm-knowledge-cycle-card 04144e4dd059e9a7 → 6a1c240089cf096c · finalises Sep 23, 6:25 PM CST · `select public.reverse_decision('d712d5a8-d2e3-4cd5-86f3-564b200d5e0e','John','<why>');`
- `62d963aa` · ticket-status · `SES-424` · Close-out: SES-424 settles 'partial' · finalises Sep 23, 6:38 PM CST · `select public.reverse_decision('62d963aa-e526-45d5-9156-f9341efc3f64','John','<why>');`

**187 final this week, 0 reversed this week** — *this week* is a **rolling 7 days** back from the stamp, not a calendar week and not a Friday-07:00Z reset: no such weekly-reset helper exists in this file or anywhere in `scripts/`, so a rolling window is what is used and is labelled as one. A reversal is the strongest negative signal the ladder takes (`M6-07`), so the second number is the one to read first.

**Decided for you** — *as of 2026-09-20 23:40Z (Sep 20, 6:40 PM CST).* What the runner DECIDED on your behalf, by CST day (`governance_rules.MANAGER-DECIDES-BY-DEFAULT`: *a daily list of what was decided, not questions*), with the questions that reached you anyway counted beside it — target zero. Not the `Open decisions` group above: that one is the undo list and drops a decision the moment it finalises; this one is the record of the day and keeps it. **24 decided on 2026-09-20**; **0 question(s) reached you in the last 7 days — target zero**; 17 still open.

| CST day | decided | reversed | questions to you |
|---|---:|---:|---:|
| `2026-09-20` | 24 | 0 | 0 |
| `2026-09-19` | 8 | 0 | 0 |
| `2026-09-18` | 35 | 0 | 0 |
| `2026-09-17` | 0 | 0 | 0 |
| `2026-09-16` | 31 | 0 | 0 |
| `2026-09-15` | 38 | 0 | 0 |
| `2026-09-14` | 19 | 0 | 0 |

**The 24 decided on 2026-09-20** — newest first.

- `62d963aa` · ticket-status · `SES-424` · Close-out: SES-424 settles 'partial' · open
- `d712d5a8` · agent-row · `SES-424` · SES-424: re-pin dm-knowledge-cycle-card 04144e4dd059e9a7 → 6a1c240089cf096c · open
- `48d7fcce` · ticket-status · `SES-424` · Close-out: SES-424 settles 'partial' · open
- `8e5e6a82` · agent-row · `SES-424` · SES-424 slice 5: patterns_applied on ds-kickoff-intent, bd-build-intent, dm-run-intent — every governance answer names… · open
- `2d9085b6` · hygiene · `AGT-79` · Ticket Owner: 1 derivable cell fix(es) on 1 row(s) — cost 0 · claim 1 · type 0 · open
- `333fb368` · classification · — · board ordered: 1 ticket(s) given an automation_rank · open
- `bcd25fbe` · ticket-status · `SES-424` · Close-out: SES-424 settles 'partial' · open
- `2c6ebf6c` · gate · `SES-424` · Retire card 489e7554 (SES-415): its question is answered · open
- `4112721f` · agent-row · `SES-424` · SES-424 slice 4: ds-/bd-/dm-knowledge-patterns rows and links — agents read the patterns tagged for their role · open
- `5999b8e9` · ticket-status · `SES-424` · Close-out: SES-424 settles 'partial' · open
- `4666c6bd` · agent-row · `SES-424` · SES-424 slice 3 (v7.0.535): re-pin dm-knowledge-cycle-card to the re-rendered docs/runbooks/cycle-card.md — traits.sour… · open
- `d2e55f26` · ticket-status · `SES-424` · Close-out: SES-424 settles 'partial' · open
- `b84e133d` · rule · `SES-424` · Filed governance rule MANAGER-AUTHORITY-MATRIX: the decision authority matrix by kind, whose row 1 gives the dm-knowled… · open
- `129e0860` · ticket-status · `SES-424` · Close-out: SES-424 settles 'partial' · open
- `dbb3067d` · removal · `SES-380` · SES-380 reported dead: SES-381 (v7.0.470) retired the whole-file <6000 B bar the ticket was filed against, and CLAUDE-S… · open
- `5962d2b2` · removal · `SES-385` · SES-385 reported dead: settle-ship.js (v7.0.519) and its census (v7.0.524) shipped, and no done or delivered row carrie… · open
- `bd7e5ecc` · ticket-status · `SES-423` · Close-out: SES-423 settles 'delivered' · open
- `d70ce071` · agent-row · `SES-423` · SES-423 slice 3 (v7.0.532): re-pin dm-knowledge-cycle-card.method to the re-rendered docs/runbooks/cycle-card.md (8470… · open
- `afc26f77` · agent-row · `SES-423` · SES-423 slice 3 (v7.0.532): re-pin dm-knowledge-cycle-card.traits.source_sha256 to the re-rendered cycle-card.md digest… · open
- `ab0a0526` · agent-row · `SES-423` · SES-423 slice 3 (v7.0.532): re-pin dm-knowledge-cycle-card.traits.source_sha256 to the re-rendered cycle-card.md (f7508… · open
- `31bf255d` · ticket-status · `SES-423` · Close-out: SES-423 settles 'partial' · open
- `06bd3e74` · agent-row · `SES-423` · SES-423 slice 2: re-pin dm-knowledge-cycle-card to the re-rendered docs/runbooks/cycle-card.md (5195a73c2f36bdf0 -> f75… · open
- `596fa7c3` · agent-row · `SES-423` · SES-423 slice 2: re-pin dm-knowledge-cycle-card to the re-rendered docs/runbooks/cycle-card.md (800d821aeff8a638 -> 519… · open
- `73ae941e` · agent-row · `SES-423` · SES-423 slice 2: re-pin dm-knowledge-cycle-card to the re-rendered docs/runbooks/cycle-card.md (dc0aa46175d7e210 -> 800… · open

**Judgment classes** — *as of 2026-09-20 23:40Z (Sep 20, 6:40 PM CST).* What the corpus currently holds per pull test, live from `public.judgment_class_census` (`SES-84`; the same view `SES-159` reads). Ratification is a standing metric (John, 2026-08-23: a class is never finished being learned), never a finish line.

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

**John-model** — *as of 2026-09-20 23:40Z (Sep 20, 6:40 PM CST).* How often a decision that leaned on a standing pattern of John's stood unreversed through its window, live from `public.john_model_signal` (`SES-004`; the criteria are `public.decision_patterns`, exported from `docs/JOHN-DECISION-PATTERNS.md`). A rate binds only from 30 finalised-or-reversed decisions (M7 gate, ruling iii).

- **99.5% agreement** over 216 finalised-or-reversed decisions (215 finalised unreversed, 1 reversed; 49 still open, 265 citing in total). A reversal is the strongest negative signal the ladder takes, so the second number is the one to read first.

| criterion | citing | final unreversed | reversed | open | rate |
|---|---:|---:|---:|---:|---:|
| `pattern:0` No standing pattern applied -- new judgment. | 124 | 76 | 0 | 48 | 100% |
| `pattern:137` P1–P4 are pull tests, not category labels — administrative expectations never q… | 76 | 76 | 0 | 0 | 100% |
| `pattern:85` Don't gate small, reversible calls on his approval — decide and flag. | 48 | 47 | 1 | 0 | 97.9% |
| `pattern:96` When a gap surfaces outside the session's scope, log it with its own ID rather… | 11 | 11 | 0 | 0 | — |
| `pattern:86` Process, tooling, and hygiene mechanics are fully delegated — decide and execut… | 9 | 9 | 0 | 0 | — |

- A per-pattern `—` is not a zero: that criterion has not reached 30 finalised-or-reversed citations of its own, so it carries counts and no rate.

**Invention in use** — *as of 2026-09-20 23:40Z (Sep 20, 6:40 PM CST).* Criterion 7 (`docs/SELFBUILD-CHARTER.md`): at least one platform-originated feature — the Bench Report Card judge (`LOG-143`) — is measurably used by real visitors, live from `public.report_card_usage`. Counts only, never a rate.

- **7d:** 0 judge runs, 0 by real visitors (0 distinct).
- **30d:** 3 judge runs, 0 by real visitors (0 distinct).
- **all:** 3 judge runs, 0 by real visitors (0 distinct).

- *no real-visitor use yet.*

**Board by served class** — *as of 2026-09-20 23:40Z (Sep 20, 6:40 PM CST).* Which class each open ticket SERVES under the served-class test (`VC-MISSION-033`), ruled by The Prioritizer's `classify-ticket` and stored on `backlog_items.supports_class` — a ticket's own class is a different question and is not restated here.

| serves | open tickets |
|---|---:|
| `P1 - Improves John's Skills` | 82 |
| `P2 - Inventive` | 11 |
| `P3 - Investor Value` | 5 |
| `P4 - New Customers` | 2 |
| `P7 - Agent Creation` | 1 |
| *serves none* | 501 |

- *Negative ranks are John's own automation queue, seeded to sort ahead of anything assigned later (`SES-86`). The nightly re-rank writes 1..N and therefore sits below them — intended precedence, not a re-rank that failed.*

- **Top 5 by `automation_rank`:**
  -35. `SES-288` — A schema-range red can never be auto-reverted: one refused down-migration disables rollba… *(serves none)*
  1. `SES-424` — The Development Manager's decision authority and the reasoning pipeline that feeds it are… *(serves none)*
  4. `SES-337` — The Verifier agent must reproduce the last 30 recorded verdicts before it grades a ship,… *(serves P1 - Improves John's Skills)*
  5. `SES-392` — The meter reader fails silently: exit 2 from 13:15 CT to 19:20 CT on 2026-09-12 with no l… *(serves P2 - Inventive)*
  21. `SES-342` — Runbook shrink phase 2: the harvest, selection-beyond-the-pick and sweep rules get agents… *(serves none)*

- Last scheduled re-rank: Sep 20, 4:49 PM CST.

**Governance agents, last 7 days** — *as of 2026-09-20 23:40Z (Sep 20, 6:40 PM CST).* Whether the platform's own agents (`agents.lane = 'governance'`) are doing the development work, live from `public.governance_agent_usage` and `public.ship_handoff_census` (`SES-360`). A **rolling 7 days** back from render time, like the decision counts above. Counts and token sums only, never a rate.

| role | source | calls | input tokens | output tokens |
|---|---|---:|---:|---:|
| Governance — Development Manager | `session` | 31 (2 untokened) | 5839596 | 57444 |
| Governance — Researcher | *no calls in the window* | 0 | — | — |
| Governance — Prioritizer | `session` | 7 (1 untokened) | 66383 | 1 |
| Governance — Prioritizer | *unlabelled* | 373 (373 untokened) | 0 | 0 |
| Governance — Designer | `session` | 48 (8 untokened) | 151456035 | 636745 |
| Governance — Builder | `session` | 42 (5 untokened) | 129024860 | 482134 |
| Governance — Verifier | *no calls in the window* | 0 | — | — |
| Governance — Auditor | `session` | 12 | 1075095 | 88395 |
| Governance — Ticket Owner | `session` | 5 | 0 | 0 |

- **Ships with all four handoff rows: 19 of 25** ships in the window (`SES-345`'s four: `automation_rank`, `kickoff_link`, a per-ticket push sha, a verdict row). Missing per leg: kickoff_link 0, per-ticket sha 0, automation_rank 6, verdict 0.
- *unlabelled* is a NULL `call_source` — the pre-attribution unknown, never read as automation (`LOG-128`); `untokened` rows carry no token counts at all (deterministic handler rows), so a large call count beside a small token sum is that, not a cheap model.

**Auditor's ledger** — *as of 2026-09-20 23:40Z (Sep 20, 6:40 PM CST).* What `public.audit_findings` (`AGT-70`) holds and what has left it for the board. Counts only, never a rate. Latest week 2026-W37: **6 findings (4 open · 2 resolved · 0 not a defect)** — **0 ruled** open findings (a ruled, open, `high` row is what `tripwire-to-backlog.js --from-ledger` files, at most 3 per ISO week); **0 filed** to the board from the ledger so far (`source_file = 'audit-ledger'`).

| fingerprint | kind | confidence | fact | ruled |
|---|---|---|---|---|
| `4637961d21e1076a` | contradiction | high | the order of the board's ranking keys | — |
| `4ef228c361f9a904` | stale-or-irrelevant | high | temperature stored for a model whose API rejects temperature | — |
| `b057c6f102845074` | stale-or-irrelevant | high | whether the Selfbuild has started executing | — |
| `e141f20a37d1fbe9` | contradiction | high | the runner's scheduling interval in hours | — |

- *A finding leaves this table only by John's ruling — `resolved`, `not-a-defect`, or ruled and left `open` to file. Candidates a run found but nobody ingested live in `docs/audits/<week>-candidates.json`, not here.*

**Ticket hygiene, last night** — *as of 2026-09-20 23:40Z (Sep 20, 6:40 PM CST).* What the Ticket Owner (`AGT-79`) left on the board: `public.ticket_owner_findings` open rows by check, the newest `hygiene` decision and the newest nightly cycle row. Counts only, never a rate. **186 open findings** across 8 check(s).

| check | open | oldest | nights open |
|---|---:|---|---:|
| `actual-unknown` | 82 | Sep 12, 10:31 PM CST | 7 |
| `verdict-missing` | 43 | Sep 12, 10:31 PM CST | 7 |
| `size-missing` | 21 | Sep 12, 10:31 PM CST | 7 |
| `delivered-unaccepted` | 16 | Sep 12, 10:31 PM CST | 7 |
| `type-off-taxonomy` | 13 | Sep 12, 10:31 PM CST | 7 |
| `remainder-stranded` | 6 | Sep 18, 5:38 AM CST | 2 |
| `quote-missing` | 3 | Sep 12, 10:31 PM CST | 7 |
| `cycles-over-quote` | 2 | Sep 12, 10:31 PM CST | 7 |

- Last run: `eb5679c2` · shipped · Sep 20, 4:57 PM CST · 885 rows · 187 findings (1 derivable · 186 judgment) · behind the fences: quote 525 · size 493 · cost 45 · verdict 97 · unrevalidated>30d 426 · attended-actual null 286 · fixed 1 · findings +8 ~178 −0 · decision 2d9085b6-ad41-4b44-aaff-110426092629 — reversible until 2026-09-23T21:57:48.684485+00:00 · judged 1/0/0 on claude-fable-5-1
- Judgment: **the newest night was judged** — 0 unjudged nights on top, over the newest 8 on record.
- Decision `2d9085b6` · open · Ticket Owner: 1 derivable cell fix(es) on 1 row(s) — cost 0 · claim 1 · type 0 · finalises Sep 23, 4:57 PM CST · `select public.reverse_decision('2d9085b6-ad41-4b44-aaff-110426092629','John','<why>');`

**Staff watch** — *as of 2026-09-20 23:40Z (Sep 20, 6:40 PM CST).* What the Development Manager (`SES-378`) recorded about the runner's own agents: `public.runner_staff_findings` rows per `agent_id`, with the distinct fingerprints and the distinct CYCLES behind them. Counts only, never a rate. **11 finding(s)** across 2 agent(s).

| agent | findings | distinct fingerprints | distinct cycles | newest |
|---|---:|---:|---:|---|
| `designer` | 9 | 5 | 8 | Sep 20, 6:32 PM CST |
| `devmanager` | 2 | 2 | 2 | Sep 18, 7:45 AM CST |

**Human gates** — *as of 2026-09-20 23:40Z (Sep 20, 6:40 PM CST).* The two reads that say whether anything is waiting on a human: open `backlog_items` carrying `design_status = 'needs-john'`, and `gated_before_build` `runner_items` left with `decision IS NULL` (`M6-01`). Board state, written by no code in this repo — which is why it is REPORTED here and not asserted as a gate by the regression suite. **0 open `needs-john` ticket(s)**, **10 undecided `gated_before_build` card(s)**.

- **Undecided gated cards (10):** `449826c5-7d9e-46ea-80df-ce8785adeaa8`, `ba7390e0-f506-4269-be1b-990e792528a1`, `2d5441c7-5133-4b21-9768-7921dce0c409`, `82f5dfba-f775-413a-9a85-f8b3a435b79d`, `52c9e635-dade-4cc0-8c84-490d8a63b99c` …and 5 more
- *Open is not wrong.* A card nobody has answered yet is a real board state; what it is NOT is a regression, so nothing in the suite goes red for it.

*Provenance: 948 board rows, payload `sha256:b033504c355d9936`, as of 2026-09-20 23:40Z (Sep 20, 6:40 PM CST). The stamp says when this was last read; the sha says whether it still matches the tables. `--check` compares the sha, never the stamp — a refreshed stamp over identical facts is not drift.*
<!-- END GENERATED — scripts/render-standing-brief.js -->

**Next session:** none required — the runner is live and works **John's automation queue** (canonical: `docs/RUNNER-GOV-0820-REQUIREMENTS.md`): the queue is the board's leading sort key, not a list to read (`automation_rank`, v7.0.133) — `ORDER BY queue` already honours it. Classes are always written named, **`P1 - Improves John's Skills` → `P10 - Tooling`**; outcomes as plain words (“did not run”, “gated before build”); budget is two-track (API dollars + token governor). John judges from the briefing page. Runner pause: disable `deepbench-runner` at claude.ai/code/routines. **Board census measured 2026-08-23T12:5xZ by runner cycle `363b5138`, taken from the board after its own close-out recompute rather than carried forward:** **561 open tickets, 561 numbered, 0 open-but-unnumbered**, 611 rows total, **the standing Automation drain now has a FIXED finish line** — from `v7.0.179` (`SES-142`) it works the **18 members John named** on directive `b74009ea`, stored as `runner_drain_scope` FK rows, and a ticket filed into the epic *after* that naming **never joins it**: it queues normally and waits for him. The live `now` tier had already drifted to 19 against his 18. `drain_epic_next()` retires when those 18 are `done`/`removed`, and returns the new outcome **`unscoped`** — never a live-tier fallback — for any future drain declared without a list. Queue/drain state as of **v7.0.196** (2026-08-23 ~17:00Z, `successional-review` close-out, 561 rows renumbered): `SES-140` — *the successor fire is refused by the platform* and `SES-151` — *the scheduler runs on John's clock grid* are both **`done`**; the drain's nearest open member `SES-84` — *the vision corpus* (`needs-john`) waits on John's briefing decisions, so cycles step past it (`SES-114`) and work the board (`SES-121` — *shrink the `.claude/`-mutable surface* went `done` at v7.0.198; procedure text now lives in `docs/runbooks/`, cycle-writable). **The board's `title` column is trustworthy for display for the first time** (`SES-91`, v7.0.177): 98 rows that held a bare priority-class string now carry a real authored title, and the only `^P[0-9]+ - ` title left is `ADM-1`, whose title is a real sentence behind a stale class prefix and is deliberately left for `SES-117` to **accommodate** rather than repair. `SES-119` is now `done` (v7.0.184 + v7.0.185): the briefing renders `public.backlog_display_title(title, description)` rather than the read-time `gist` workaround, and **`runner-cycle.md`'s Language block now requires a ticket's title wherever John reads its ID**. Step 5's `gist` expression deliberately stays — it is still correct for any future row filed the old way, and 50 of 562 open numbered tickets still fall back to it. **From v7.0.195 the chain runs IN-SESSION (`SES-140` FINAL)** — a cycle that actually ran one (`shipped`/`gated_before_build`/`reverted`) and whose drain still returns `pick` opens its next `runner_cycles` row (trigger `chained (drain continuation)`) **in the same session** and re-enters the runbook at step 1; session-spawning is retired as platform-unsupported (`runner-cycle.md` tail step (8) carries the evidence). A **wall-stopped cycle continues nothing**, which keeps the budget wall a brake rather than a metronome. Proven live 2026-08-23: cycles `1fcd687e` → `a11c94d2`, the first chained row in the runner's life. **The briefing-redesign epic is finished** — `SES-129`, its last member, shipped in cycle `ed1a5eb3`. **A new filing rule binds from this version:** `runner_items.backlog_id` takes a **bare** ticket id or NULL and is enforced by `ck_runner_items_backlog_id_bare`; the display string belongs in `display_ref`, and the briefing's id chip reads `coalesce(backlog_id, display_ref)` (`SES-116`, v7.0.174 — `runner-cycle.md` step 9). **`design_status` reads for selection (`SES-114`, v7.0.165); among OPEN tickets measured at the v7.0.198 close-out:** 16 `designed` (incl. `SES-101`, flipped from `needs-desktop` — its one remaining edit now lives in `docs/runbooks/session-setup.md` step 3c, cycle-writable), **0 `needs-desktop`**, **1 `needs-john`** (`SES-84`), 546 `NULL` = not yet triaged, deliberately not guessed to `auto`. Measured at the v7.0.198 close-out: **11 of John's 18 named members remain open** (`SES-121` retired from the list by going `done` this session); the only `needs-john` member is `SES-84` — the rest are buildable, the drain reaches them and can retire on them. **`CHI-89`** still holds its queue slot with its removal card undecided — visible to John and skipped by cycles, exactly as `SES-113` intended. **`SES-133` is still open at `partial`** — the other half of John's 2026-08-23 emergencies directive; it sits at queue 251 rather than at the top, because the drain reads the Automation epic's `now` tier in queue order and `SES-133` is not in that epic. **From v7.0.182 John's own switches govern the cadence** (`SES-143`): the briefing's **§2b Automation panel** carries a scheduler checkbox + an every-N-hours box (live values: **on, 3 hours** — John's order 2026-08-23: the runner runs at **12/3/6/9 on his clock**, `SES-151`) and a drain checkbox, and `runner-cycle.md`'s **new step 1b** calls `public.scheduler_gate()` before anything else — a scheduled cycle arriving early closes `did_not_run` with *"paced by your scheduler setting"*, and with the scheduler off it closes *"scheduler off"*. **The cron stays hourly permanently by design** — a cycle cannot edit its own routine — and **from v7.0.196 (`SES-151`) the gate paces by John's clock grid**: a scheduled fire runs iff its row's `started_at` falls in an America/Chicago hour divisible by `interval_hours` (3 → **12/3/6/9 AM/PM his clock**, DST-proof; the mixed-clock elapsed test that wrongly paced 3 of 9 hourly fires is dead, `q-hourly-interval-boundary` answered by ship). Two consequences worth knowing before reading a quiet night as a stall: the gate **fails open** on every unknown, and it governs **scheduled** fires only, so a standing drain's chained continuation cycles run regardless — while the Automation drain stands, **the chain and not the interval is what actually sets the pace**. A manual fire (off the cron grid) is never paced; whether that is what John wants is the one thing the spec leaves open, asked as `q-manual-fire-pacing`. **From v7.0.188 that gate actually fires** (`SES-146`): until then `scheduler_gate()` matched the trigger by exact equality against the bare word `scheduled`, so a cycle passing the verbatim line step 1b asks for — `trigger: scheduled` — fell through to *"not a scheduled cycle"* and skipped **both** the pacing branch and the `scheduler_on = false` branch, and the grid test compared `now()`-at-step-1b rather than the fire time against a hardcoded ±2. Both failed open, so the panel looked live and bound nothing. The trigger is now normalised, the grid is anchored to the cycle row's own `started_at`, and the tolerance is the column `runner_settings.grid_tolerance_min` (10). **Silence is not a “no”** on any open question. **From v7.0.183 the board's open status is `open`, never `missing`** (`SES-118`): `backlog_items_status_check` now allows exactly `('open','partial','done','removal proposed','removed')` and the retired value raises `23514` — 510 rows renamed, `updated_at` deliberately untouched so step 8c's 30-day revalidation sweep still sees the sinking tail. **That consequence closed at v7.0.189** (attended session `ses118-gated`, 2026-08-23): step 3c's INSERT now writes `'open'`, zero `'missing'` literals remain under `.claude/`, and `SES-118` is `done` — its gated card `76564dde` awaits John's decision on the briefing page.
