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
## Live board state — generated, do not hand-edit — *as of 2026-09-26 13:29Z (Sep 26, 8:29 AM CST)*

> Rendered from the tables by `scripts/render-standing-brief.js` at every ship. **Every number below is derived; nothing here is maintained by hand.** The judgment prose beneath this block is the opposite — hand-maintained, deliberately, and this script never writes outside these markers. Where the two disagree about a number, this block is right and the sentence below is stale: say so rather than reconciling them by hand.

**Board census** — *as of 2026-09-26 13:29Z (Sep 26, 8:29 AM CST).* **726 open tickets**, 698 numbered, **28 open-but-unnumbered**, 1000 rows total.

| `status` | rows | share of board |
|---|---:|---:|
| `open` | 575 | 57.5% |
| `done` | 259 | 25.9% |
| `delivered` | 56 | 5.6% |
| `removal proposed` | 51 | 5.1% |
| `partial` | 44 | 4.4% |
| `removed` | 15 | 1.5% |

**`design_status` among OPEN tickets** — *as of 2026-09-26 13:29Z (Sep 26, 8:29 AM CST).* Reads for selection (`SES-114`); `NULL` is *not* `auto`, it is not-yet-triaged and no cycle may backfill it.

| `design_status` | open rows | selection effect |
|---|---:|---|
| `NULL` | 639 | full ceremony — not yet triaged |
| `needs-decision` | 43 | — |
| `designed` | 35 | **not a skip** — build from `kickoff_link` (step 6 fast path) |
| `needs-desktop` | 7 | skipped, `record_skip()` — needs a session John attends (B39) |
| `auto` | 1 | full ceremony |
| `needs-john` | 1 | skipped, `record_skip()` — John decides on a card |

**Scheduler and automation settings** — *as of 2026-09-26 13:29Z (Sep 26, 8:29 AM CST).* §2b of the briefing, John's own switches, binding via `scheduler_gate()` at step 1b:

- Scheduler: **on**, every **1 hour** on John's clock grid (America/Chicago hours divisible by the interval — `SES-151`, DST-proof).
- Cron minute **40**, manual-fire tolerance **±10 min** (a start outside it is treated as a manual fire and is never paced).
- Standing daily max: **196M tokens**. This is rung 3 of five, **below** the 48h stale floor: a standing number must not defeat the staleness brake.

**Standing epic drain** — *as of 2026-09-26 13:29Z (Sep 26, 8:29 AM CST).* Created only by John; the runner may read one, never write one (`drain_epic_next()` property 5). The finish line is drawn from the members he **named** (`runner_drain_scope`), never the live `now` tier (`SES-142`) — and within that list it is the members a milestone **gate ruled required** (`milestone_required`, `SES-310`) whenever the list carries such a ruling, every named member otherwise.

- **No drain standing.** Selection is the class-sorted board exactly as it is with no drain declared.

**Open decisions** — *as of 2026-09-26 13:29Z (Sep 26, 8:29 AM CST).* Decisions made under `M6-02` that are still inside their reversal window (`runner_settings.reversal_window_hours` = 72h). Silence finalises them; to reverse one, run the line beside it (`docs/runbooks/session-setup.md` § Reversing a decision).

- `0432d1c6` · re-scope · `AGT-86` · AGT-86 build plan approved by John as nine slices; the Development Manager files one ticket per root cause with no cap… · finalises Sep 26, 2:23 PM CST · `select public.reverse_decision('0432d1c6-6410-4ac2-af1f-99ef2cff8481','John','<why>');`
- `aefd0627` · agent-row · `AGT-86` · AGT-86 slice 2a: review-audit-worklist capability, dm-audit-review-intent and six links for the Development Manager · finalises Sep 26, 3:27 PM CST · `select public.reverse_decision('aefd0627-f371-469d-a0a1-0fbac32db4bf','John','<why>');`
- `decbb801` · agent-row · `AGT-86` · AGT-86 slice 7: the Auditor's checklist (23 checks in 5 jobs) in au-behavior, nine homes and the sixth kind in au-knowl… · finalises Sep 26, 3:46 PM CST · `select public.reverse_decision('decbb801-5f99-4b85-a406-f29d1be0fcab','John','<why>');`
- `cb459466` · filing · — · Audit review 2026-W39: 63 findings → 11 tickets, 6 not-a-defect, 0 carried, 0 escalated · finalises Sep 26, 3:53 PM CST · `select public.reverse_decision('cb459466-937a-4432-9271-faf8d597b5d9','John','<why>');`
- `398dd7a5` · filing · `AGT-86` · Filed AGT-98..100 from AGT-86 build findings (leaked bypass secret in the public repo; Windows process.exit crash; untr… · finalises Sep 26, 4:13 PM CST · `select public.reverse_decision('398dd7a5-33ff-42a9-b85f-bd30b71d6c3c','John','<why>');`
- `bc9f90d1` · agent-row · `AGT-86` · AGT-86: re-pin dm-knowledge-cycle-card 6a1c240089cf096c → fe7dc3e8c674527a · finalises Sep 26, 4:14 PM CST · `select public.reverse_decision('bc9f90d1-b11d-41c9-996d-c0c25b422ad2','John','<why>');`
- `cd942b73` · agent-row · `AGT-86` · AGT-86 slice 9b: dm-audit-review-intent learns tighten, promote and checklist_edits · finalises Sep 26, 4:15 PM CST · `select public.reverse_decision('cd942b73-c0cf-49fe-aebd-5ce6a1ffea3d','John','<why>');`
- `09d78d30` · ticket-status · `AGT-86` · AGT-86 settles delivered: all nine planned slices shipped as 16 kickoffs (v7.0.542-557); verifier e4253c97 blocked on i… · finalises Sep 26, 4:45 PM CST · `select public.reverse_decision('09d78d30-3edd-4054-8ad8-f20a67925163','John','<why>');`
- `68209b78` · filing · `AGT-102` · Filed AGT-102: the Auditor checks the prompts the two routines actually run against their repo copies. · finalises Sep 26, 4:59 PM CST · `select public.reverse_decision('68209b78-be93-46a3-939b-14fbd110da9b','John','<why>');`
- `0c8446d9` · directive · — · Project Auditor Enhancements created and set executing as the builder's only project; AGT-87..97 (the Development Manag… · finalises Sep 26, 5:05 PM CST · `select public.reverse_decision('0c8446d9-cfbd-4541-a2fa-81611ce352a9','John','<why>');`
- `2a4a8a87` · filing · `AGT-103` · Filed AGT-103: every ticket the Development Manager files from an Auditor finding goes into the Auditor Enhancements pr… · finalises Sep 26, 5:05 PM CST · `select public.reverse_decision('2a4a8a87-0132-4e11-827f-623fdeea2993','John','<why>');`
- `ac846f9f` · agent-row · `AGT-102` · au-behavior gains check routine-prompt-drift (24 checks) · finalises Sep 26, 5:21 PM CST · `select public.reverse_decision('ac846f9f-893d-44dc-9b0b-51ea88974a99','John','<why>');`
- `12077e50` · filing · `AGT-104` · Filed AGT-104: run-project.js's refusal of a mutated state file omits the drift field agt-68 requires; the arm was dorm… · finalises Sep 26, 5:25 PM CST · `select public.reverse_decision('12077e50-f60e-4982-be93-a951c65dc3a1','John','<why>');`
- `f2015f3a` · ticket-status · `AGT-103` · AGT-103 delivered (v7.0.558, 8bb2ffb8) and AGT-102 partial (slice 1 v7.0.559, 3a62e719; slice 2 = the builder's own sta… · finalises Sep 26, 5:38 PM CST · `select public.reverse_decision('f2015f3a-95d7-4fdc-aab0-7a05be91502e','John','<why>');`
- `20e4130d` · scope · `AGT-82` · Jerry Maguire scope settled with John 2026-09-23: personal lane, closed store, ten Capabilities, tryout bar before the… · finalises Sep 26, 6:26 PM CST · `select public.reverse_decision('20e4130d-eb0d-494f-ade2-034f6b2640c6','John','<why>');`
- `be7bb00c` · resolve · `AGT-83` · AGT-83 done: 38 career records loaded over the MCP into public.career_records (3 target, 4 ladder_rung, 29 resume_fact,… · finalises Sep 26, 7:09 PM CST · `select public.reverse_decision('be7bb00c-dee5-41f3-bbe6-3182d2d3d9f3','John','<why>');`
- `a73e6712` · classification · — · board ordered: 14 ticket(s) given an automation_rank · finalises Sep 26, 7:55 PM CST · `select public.reverse_decision('a73e6712-b9cd-4c34-82e5-ff331ecc7a9f','John','<why>');`
- `68e118b9` · hygiene · `AGT-79` · Ticket Owner: 2 derivable cell fix(es) on 2 row(s) — cost 2 · claim 0 · type 0 · finalises Sep 26, 7:55 PM CST · `select public.reverse_decision('68e118b9-23a2-4a6d-a1ca-6a316d885444','John','<why>');`
- `5e9739d7` · scope · `AGT-105` · Salary recorded on every posting and a worth estimate per row (John 2026-09-23); the tryout watch list is graded by the… · finalises Sep 26, 8:14 PM CST · `select public.reverse_decision('5e9739d7-d524-429b-bbd3-212d0a84577a','John','<why>');`
- `684365e7` · directive · — · John hired Jerry Maguire: agents.is_active = true for agent jerry (2026-09-23, "turn him on"); the two schedules are cr… · finalises Sep 26, 8:19 PM CST · `select public.reverse_decision('684365e7-5141-4d9b-aa70-4000b5beaecc','John','<why>');`
- `0c237020` · ticket-status · `AGT-100` · Close-out: AGT-100 settles 'delivered' · finalises Sep 26, 8:26 PM CST · `select public.reverse_decision('0c237020-8c62-4459-9f1d-ce2036ecb899','John','<why>');`
- `e876c678` · rollback · — · Auto-rollback held: ci-red on 7bddd22 was not reverted (card-only) · finalises Sep 26, 8:28 PM CST · `select public.reverse_decision('e876c678-9683-42bc-9a24-eb370174e33e','John','<why>');`
- `e3cdfa80` · ticket-status · `AGT-101` · Close-out: AGT-101 settles 'delivered' · finalises Sep 26, 9:08 PM CST · `select public.reverse_decision('e3cdfa80-4f43-464c-91bb-2fd51c0aa466','John','<why>');`
- `6d8d673a` · rollback · — · Auto-rollback held: ci-red on 119ed08 was not reverted (card-only) · finalises Sep 26, 9:09 PM CST · `select public.reverse_decision('6d8d673a-5f7a-48c1-b981-094cf78c2245','John','<why>');`
- `c3b3693c` · agent-row · `AGT-102` · AGT-102: re-pin dm-knowledge-cycle-card fe7dc3e8c674527a → ee9fed6b41616262 · finalises Sep 26, 9:40 PM CST · `select public.reverse_decision('c3b3693c-7358-4a52-a8b9-b121e9a9c956','John','<why>');`
- `dcf8b8c4` · ticket-status · `AGT-102` · Close-out: AGT-102 settles 'delivered' · finalises Sep 26, 10:15 PM CST · `select public.reverse_decision('dcf8b8c4-fcd3-4d53-8056-238114df41dc','John','<why>');`
- `b2b89815` · rollback · — · Auto-rollback held: ci-red on 2671683 was not reverted (card-only) · finalises Sep 26, 10:15 PM CST · `select public.reverse_decision('b2b89815-5171-49e0-9c41-ede6629f79aa','John','<why>');`
- `20d6eaf9` · agent-row · `AGT-87` · AGT-87: re-pin dm-knowledge-cycle-card ee9fed6b41616262 → 724bf1ff091c715e · finalises Sep 26, 10:38 PM CST · `select public.reverse_decision('20d6eaf9-f034-4630-8691-0b2adfe51162','John','<why>');`
- `2a5b8a95` · agent-row · `AGT-87` · AGT-87: re-pin dm-knowledge-cycle-card 724bf1ff091c715e → fbe7fb2b340fd4f8 · finalises Sep 26, 10:40 PM CST · `select public.reverse_decision('2a5b8a95-a5a3-4c5a-bc7b-8de183fc9421','John','<why>');`
- `0dd23c82` · ticket-status · `AGT-87` · Close-out: AGT-87 settles 'delivered' · finalises Sep 26, 10:54 PM CST · `select public.reverse_decision('0dd23c82-6904-4b32-8841-ec61241d515f','John','<why>');`
- `f3eb1418` · rollback · — · Auto-rollback held: ci-red on 187df12 was not reverted (card-only) · finalises Sep 26, 10:55 PM CST · `select public.reverse_decision('f3eb1418-6fec-445b-a635-65e441e4edb7','John','<why>');`
- `e33a762c` · agent-row · `AGT-90` · AGT-90: set temperature = NULL on all claude-fable-* skill_profiles rows (39 rows carrying temperature = 0) · finalises Sep 26, 11:47 PM CST · `select public.reverse_decision('e33a762c-4812-4fc8-866f-9bcbba5d7800','John','<why>');`
- `e36f927b` · ticket-status · `AGT-89` · Close-out: AGT-89 settles 'delivered' · finalises Sep 27, 12:00 AM CST · `select public.reverse_decision('e36f927b-ada1-4394-a3b1-bf0094260b94','John','<why>');`
- `96b49176` · ticket-status · `AGT-90` · Close-out: AGT-90 settles 'delivered' · finalises Sep 27, 12:19 AM CST · `select public.reverse_decision('96b49176-79bb-4b4a-8c71-1e82f1dd39e4','John','<why>');`
- `7f63d6de` · rollback · — · Auto-rollback held: ci-red on 6d4d42c was not reverted (card-only) · finalises Sep 27, 12:20 AM CST · `select public.reverse_decision('7f63d6de-8015-46fe-9223-d5540c9fb126','John','<why>');`
- `7f25bb78` · governance · `AGT-91` · AGT-91 v7.0.569 -- re-point the four live governance_rules rows that cite retired homes: OD-42 and OD-19 (api/cron/rank… · finalises Sep 27, 12:24 AM CST · `select public.reverse_decision('7f25bb78-ff4a-4377-94ca-e174ef23f4dc','John','<why>');`
- `fea56399` · rule · `AGT-92` · AGT-92 — the scope-cap baseline gets ONE canonical home: docs/STANDARDS.md Section 2; CAP-SCOPE-FILES and OD-33 restate… · finalises Sep 27, 12:47 AM CST · `select public.reverse_decision('fea56399-ae1e-47d6-b390-d13b94e84a77','John','<why>');`
- `58058430` · ticket-status · `AGT-91` · Close-out: AGT-91 settles 'delivered' · finalises Sep 27, 12:50 AM CST · `select public.reverse_decision('58058430-a9cb-4dd9-baa1-d22894d386e0','John','<why>');`
- `111bf962` · ticket-status · `AGT-92` · Close-out: AGT-92 settles 'delivered' · finalises Sep 27, 1:11 AM CST · `select public.reverse_decision('111bf962-b70d-46e6-8e9d-03f89aee5f20','John','<why>');`
- `27cde6af` · rollback · — · Auto-rollback held: ci-red on 2a69541 was not reverted (card-only) · finalises Sep 27, 1:12 AM CST · `select public.reverse_decision('27cde6af-fafe-4005-bd4c-a03cc0503ab1','John','<why>');`
- `7cf7bc38` · ticket-status · `AGT-93` · Close-out: AGT-93 settles 'delivered' · finalises Sep 27, 1:37 AM CST · `select public.reverse_decision('7cf7bc38-b31d-4ca7-ba0a-e5dd385a159b','John','<why>');`
- `8b040f5a` · removal · `AGT-96` · AGT-96 removal proposed: its premise is dead — the dm-knowledge-cycle-card re-pin already writes the record_decision ro… · finalises Sep 27, 1:58 AM CST · `select public.reverse_decision('8b040f5a-461d-45c2-b5cb-163a6f444358','John','<why>');`
- `c1b8ac23` · hygiene · `AGT-79` · Ticket Owner: 11 derivable cell fix(es) on 11 row(s) — cost 11 · claim 0 · type 0 · finalises Sep 27, 1:59 AM CST · `select public.reverse_decision('c1b8ac23-1d11-49a7-99af-b65e97b5f7be','John','<why>');`
- `ba95a57f` · ticket-status · `AGT-95` · Close-out: AGT-95 settles 'delivered' · finalises Sep 27, 2:29 AM CST · `select public.reverse_decision('ba95a57f-3bbc-418e-add0-fa8c430ee783','John','<why>');`
- `8066233f` · agent-row · `AGT-97` · AGT-97: re-render the ds-knowledge-environment Skill row from docs/runbooks/environment-facts.md after correction 10 ad… · finalises Sep 27, 2:30 AM CST · `select public.reverse_decision('8066233f-b746-4d8d-ba54-f4bfb0038eb0','John','<why>');`
- `95e7170d` · ticket-status · `AGT-97` · Close-out: AGT-97 settles 'delivered' · finalises Sep 27, 2:50 AM CST · `select public.reverse_decision('95e7170d-d692-404d-aabf-6f4d4e41b448','John','<why>');`
- `f1dea170` · rollback · — · Auto-rollback held: ci-red on a3c4ac6 was not reverted (card-only) · finalises Sep 27, 2:51 AM CST · `select public.reverse_decision('f1dea170-ce1b-4d96-9290-3f756625cb0a','John','<why>');`
- `4e3495c4` · ticket-status · `AGT-107` · Close-out: AGT-107 settles 'delivered' · finalises Sep 27, 3:07 AM CST · `select public.reverse_decision('4e3495c4-3b7f-4c71-b2bb-00d1fa712500','John','<why>');`
- `76fdb91d` · agent-row · `AGT-112` · AGT-112: re-pin dm-knowledge-cycle-card fbe7fb2b340fd4f8 → 8e57fb17a0710310 · finalises Sep 27, 3:17 AM CST · `select public.reverse_decision('76fdb91d-a711-48fc-8b24-7057b5705087','John','<why>');`
- `31c89ff2` · ticket-status · `AGT-112` · Close-out: AGT-112 settles 'delivered' · finalises Sep 27, 3:41 AM CST · `select public.reverse_decision('31c89ff2-2cbc-4a9a-b8b9-56e556eed063','John','<why>');`
- `0e1f6785` · rollback · — · Auto-rollback held: ci-red on c1cbc3f was not reverted (card-only) · finalises Sep 27, 4:46 AM CST · `select public.reverse_decision('0e1f6785-8bd2-4513-b66c-065f480bf284','John','<why>');`
- `367fbec5` · ticket-status · `AGT-113` · AGT-113 settles 'removal proposed': its premise is dead, and the defect it names does not exist for this file · finalises Sep 27, 4:55 AM CST · `select public.reverse_decision('367fbec5-b946-4b6d-912e-250537838869','John','<why>');`
- `33872e89` · ticket-status · `AGT-108` · Close-out: AGT-108 settles 'delivered' · finalises Sep 27, 9:12 AM CST · `select public.reverse_decision('33872e89-d1de-464c-bbc9-34d6f26819d5','John','<why>');`
- `be02a775` · gate · `AGT-88` · AGT-88 gate card accepted: built in attended session auditor-unblock-0924 (v7.0.580) · finalises Sep 27, 9:37 AM CST · `select public.reverse_decision('be02a775-e694-4492-b4c9-bf221e0a73fd','John','<why>');`
- `86214575` · ticket-status · `AGT-88` · Close-out: AGT-88 settles 'partial' · finalises Sep 27, 9:38 AM CST · `select public.reverse_decision('86214575-05ac-4739-b730-4055636ac250','John','<why>');`
- `88b19762` · ticket-status · `AGT-109` · Swapped the dependency: AGT-109 no longer blocked by AGT-88; AGT-88 (partial, slice 1 shipped v7.0.580 push 2a08cac8) n… · finalises Sep 27, 9:39 AM CST · `select public.reverse_decision('88b19762-387a-4761-a2c7-f0027a296e0e','John','<why>');`
- `81c93191` · design-kickoff · `AGT-120` · Kickoff designed for AGT-120 (Nathan Laan, PMM): market_records closed table, ten pmm- Capabilities incl. John's job 11… · finalises Sep 27, 10:51 AM CST · `select public.reverse_decision('81c93191-bec2-4fc3-a5e1-a8791a623231','John','<why>');`
- `f172f6a0` · re-scope · `AGT-109` · Cleared AGT-109 design_status back to unset so the next cycle re-designs the QA instead of rebuilding against a void co… · finalises Sep 27, 11:17 AM CST · `select public.reverse_decision('f172f6a0-b7f2-4566-b7c8-6302a2094c90','John','<why>');`
- `724c0ee8` · ship · `AGT-120` · AGT-120 ships to dev as delivered (v7.0.581, push 414a50a0): Nathan Laan (MK-06, product, is_active false), eleven pmm-… · finalises Sep 27, 11:27 AM CST · `select public.reverse_decision('724c0ee8-f19c-4e11-86e0-8d1f02021eb4','John','<why>');`
- `c7398635` · design-kickoff · `AGT-121` · Kickoff designed for AGT-121 (Nathan Laan call path): sibling scripts/market-agent.js, docs/runbooks/market-agent.md, r… · finalises Sep 27, 11:36 AM CST · `select public.reverse_decision('c7398635-d0fc-47cf-8351-2cf3bd763752','John','<why>');`
- `247bcab1` · ticket-scope · `AGT-121` · AGT-121 patch in scope: --write exempts correction items from the copy-test requirement, and the /nathan loader says pr… · finalises Sep 27, 11:48 AM CST · `select public.reverse_decision('247bcab1-daa5-4e97-ad8c-ee0048ec6734','John','<why>');`
- `59a6c4ed` · ship · `AGT-121` · AGT-121 ships to dev as delivered (v7.0.583, push 502c7f7b): scripts/market-agent.js (render/write), docs/runbooks/mark… · finalises Sep 27, 11:56 AM CST · `select public.reverse_decision('59a6c4ed-f3ed-41bb-95c8-a9d9e668e3db','John','<why>');`
- `45273655` · filing · — · Filed AGT-123..126 from the Nathan Laan build: agt-82 test is_active pin, de-personalized postings export, shared call-… · finalises Sep 27, 11:56 AM CST · `select public.reverse_decision('45273655-0a3e-488f-bad6-a710137ebc55','John','<why>');`
- `5d5f89e6` · ticket-status · `AGT-109` · Stop card fa151f3b ruled REWORK: re-design AGT-109's QA, then build. · finalises Sep 27, 12:31 PM CST · `select public.reverse_decision('5d5f89e6-acbc-4441-9de8-725883aaa4ee','John','<why>');`
- `2541d24e` · ticket-status · `AGT-94` · Stop card dad80633 ruled RETIRED and AGT-94 moved to removal proposed: premise dead, same as AGT-113. · finalises Sep 27, 12:31 PM CST · `select public.reverse_decision('2541d24e-8a85-4784-9fc4-e440703e1e8d','John','<why>');`
- `725599fc` · directive · — · Final-day rest wall lifted 90 -> 100 for 2026-09 until the 1:00 AM CT reset (2026-09-25 06:00Z), then restored to 90 by… · finalises Sep 27, 2:24 PM CST · `select public.reverse_decision('725599fc-fc76-4924-9b74-116213c056bb','John','<why>');`
- `796c6d62` · ticket-status · `AGT-109` · Close-out: AGT-109 settles 'partial' · finalises Sep 27, 2:32 PM CST · `select public.reverse_decision('796c6d62-b95c-4b58-b287-aa329383a3a9','John','<why>');`
- `4a014dee` · agent-row · `AGT-127` · AGT-127: the Development Manager gains the decide-gated-card capability — 1 Intent Skill, 1 capability, 7 capability_sk… · finalises Sep 27, 3:07 PM CST · `select public.reverse_decision('4a014dee-b0eb-4a73-84e8-8c48dd833da3','John','<why>');`
- `0d6c0010` · agent-row · `AGT-127` · AGT-127: re-pin dm-knowledge-cycle-card 8e57fb17a0710310 → e16c0b75fa29cc58 · finalises Sep 27, 3:23 PM CST · `select public.reverse_decision('0d6c0010-1bd3-4c88-b123-641d13030e50','John','<why>');`
- `73607b05` · ticket-status · `AGT-127` · Close-out: AGT-127 settles 'delivered' · finalises Sep 27, 3:39 PM CST · `select public.reverse_decision('73607b05-ebcf-4a53-938e-8f4f445b17b3','John','<why>');`
- `e79115d3` · gate · — · Gate cards ruled by cycle bd14bfef-8437-4ae9-8674-5917bec323dd: 16 card(s) — {"john": 2, "accept": 7, "rework": 0, "ret… · finalises Sep 27, 5:03 PM CST · `select public.reverse_decision('e79115d3-6c68-48ad-9e48-0b59b95700f2','John','<why>');`
- `cf078adf` · ticket-status · `AGT-109` · AGT-109 partial -> delivered: settle-ship misread its kickoff. · finalises Sep 28, 9:51 AM CST · `select public.reverse_decision('cf078adf-54b3-4382-9419-1533970b0a1f','John','<why>');`
- `6dea3a9a` · classification · — · board ordered: 1 ticket(s) given an automation_rank · finalises Sep 28, 10:48 AM CST · `select public.reverse_decision('6dea3a9a-f1f2-41bb-9139-4ba0ea580e45','John','<why>');`
- `aa048a00` · hygiene · `AGT-79` · Ticket Owner: 14 derivable cell fix(es) on 12 row(s) — cost 5 · claim 9 · type 0 · finalises Sep 28, 10:58 AM CST · `select public.reverse_decision('aa048a00-d819-44c3-8266-0285c5412bd8','John','<why>');`
- `4324bbb2` · re-scope · — · Created project Security (planned, priority 7) and moved 8 security-type tickets into it: AGT-98, AGT-130, DAT-9, DAT-2… · finalises Sep 28, 10:58 AM CST · `select public.reverse_decision('4324bbb2-ca32-42d1-968b-51f4e6c14f8e','John','<why>');`
- `a763fca4` · ticket-scope · `AGT-128` · AGT-128 premise revalidated alive and its kickoff accepted: design_status designed, kickoff_link set to the v7.0.586 ki… · finalises Sep 28, 11:12 AM CST · `select public.reverse_decision('a763fca4-02fa-4dab-a489-0281e8bac98f','John','<why>');`
- `32091fdb` · re-scope · — · Created executing projects Dev Manager Capabilities (priority 2) and Agent Training (priority 3), shifted lower project… · finalises Sep 28, 11:26 AM CST · `select public.reverse_decision('32091fdb-fc44-4d54-9973-e927562d950b','John','<why>');`
- `f6044e9a` · re-scope · — · Pinned queue order AGT-129, AGT-131, AGT-137 so the pick honors project priority (Auditor Enhancements 1, Dev Manager C… · finalises Sep 28, 11:26 AM CST · `select public.reverse_decision('f6044e9a-a49a-4f1d-b738-d36eed66dcd2','John','<why>');`
- `75f90774` · directive · — · Hired Nathan Laan (MK-06, Product Marketing Manager): agents.is_active false -> true, on John's hire word. · finalises Sep 28, 11:45 AM CST · `select public.reverse_decision('75f90774-7550-403c-a86a-bc52a5d4b41e','John','<why>');`
- `1524aa89` · ticket-scope · `AGT-129` · AGT-129 premise revalidated alive and its kickoff accepted: design_status designed, kickoff_link set to the v7.0.587 ki… · finalises Sep 28, 12:00 PM CST · `select public.reverse_decision('1524aa89-6563-433b-9634-3ef6d979c449','John','<why>');`
- `34bb7ed0` · ticket-status · `AGT-129` · Close-out: AGT-129 settles 'partial' · finalises Sep 28, 12:31 PM CST · `select public.reverse_decision('34bb7ed0-4d93-47b4-b7fc-2547f4cb29e8','John','<why>');`
- `904d4e02` · ticket-status · `AGT-129` · AGT-129 corrected from partial to delivered: settle-ship read a conditional that never fired, which is the very defect… · finalises Sep 28, 12:32 PM CST · `select public.reverse_decision('904d4e02-644a-459a-8397-fc2ef374071f','John','<why>');`
- `4e2493fc` · design-kickoff · `AGT-142` · Kickoff designed for AGT-142 · finalises Sep 28, 1:37 PM CST · `select public.reverse_decision('4e2493fc-7482-47cf-adbc-9275ec0c97ed','John','<why>');`
- `1632c363` · design-kickoff · `AGT-143` · Kickoff designed for AGT-143; prose strip split to AGT-147 · finalises Sep 28, 1:46 PM CST · `select public.reverse_decision('1632c363-42c2-495d-b38a-f59d1e22e92b','John','<why>');`
- `55363b7e` · ship · `AGT-142` · AGT-142 delivered at 3a6ef707 (verifier block on standing reds) · finalises Sep 28, 2:01 PM CST · `select public.reverse_decision('55363b7e-acef-4e14-805b-250057d553a5','John','<why>');`
- `ae827412` · design-kickoff · `AGT-144` · Kickoff designed for AGT-144; trial runner split to AGT-148 · finalises Sep 28, 2:02 PM CST · `select public.reverse_decision('ae827412-6c18-4654-a3c9-6bda8633d7cd','John','<why>');`
- `60486619` · design-kickoff · `AGT-147` · Kickoff designed for AGT-147; three-doc remainder split to AGT-149 · finalises Sep 28, 2:10 PM CST · `select public.reverse_decision('60486619-4874-4eac-85e1-ad7caa69f5ba','John','<why>');`
- `5eac431e` · design-kickoff · `AGT-145` · Kickoff designed for AGT-145: attended routine pin sync with plan/verify/record/undo and a pending-sync record · finalises Sep 28, 2:10 PM CST · `select public.reverse_decision('5eac431e-20cf-463d-b815-1b575bf4dbdb','John','<why>');`
- `9382564d` · design-kickoff · `AGT-148` · Kickoff designed for AGT-148 (recorded-turn replay); AGT-144 harvest step 2 amended; driver split to AGT-150; build/orc… · finalises Sep 28, 2:12 PM CST · `select public.reverse_decision('9382564d-ee88-4818-b0a9-2ace03279a7b','John','<why>');`
- `8a47b82c` · ship · `AGT-143` · AGT-143 delivered at 97386afb (verifier block on standing reds) · finalises Sep 28, 2:20 PM CST · `select public.reverse_decision('8a47b82c-4855-48a7-a099-7723a6faefd8','John','<why>');`
- `b343342c` · design-kickoff · `AGT-146` · Kickoff designed for AGT-146; attended session will create two routines from the one block to keep John's approved Frid… · finalises Sep 28, 2:20 PM CST · `select public.reverse_decision('b343342c-8a41-4c5f-97b8-71e3ff99ad8d','John','<why>');`
- `09edc466` · learning · `SES-159` · class-loop learning claims for P3 - Investor Value · finalises Sep 28, 2:25 PM CST · `select public.reverse_decision('09edc466-cfdb-499f-bff4-7de7f0885a7e','John','<why>');`
- `dca8d972` · agent-row · `AGT-144` · AGT-144: the Development Manager gains the model-assignment capability — 3 Skills (2 Intent, 1 Knowledge), 1 capability… · finalises Sep 28, 2:32 PM CST · `select public.reverse_decision('dca8d972-e010-4539-a6d4-02cbb28c4fde','John','<why>');`
- `a72c08d1` · ship · `AGT-144` · AGT-144 delivered at d245dce7 (verifier block); defects filed as AGT-152 · finalises Sep 28, 2:48 PM CST · `select public.reverse_decision('a72c08d1-ed1e-4e93-b9f0-518c34788145','John','<why>');`
- `57576a9c` · ship · `AGT-148` · AGT-148 delivered at 815be48e (verifier block on standing reds) · finalises Sep 28, 3:16 PM CST · `select public.reverse_decision('57576a9c-bfa8-4eb6-bbdd-5199641b9f1f','John','<why>');`
- `c5682083` · design-kickoff · `AGT-153` · Kickoff designed for AGT-153: zero-dependency read-only IMAP client · finalises Sep 28, 3:16 PM CST · `select public.reverse_decision('c5682083-5633-44d9-ab5e-b8cd346bd4b5','John','<why>');`
- `ad1209ac` · design-kickoff · `AGT-152` · Kickoff designed for AGT-152; test/doc repair split to AGT-157 · finalises Sep 28, 3:16 PM CST · `select public.reverse_decision('ad1209ac-b6a3-43ab-858f-a79f611698a5','John','<why>');`
- `f8488e71` · ticket-status · `AGT-131` · Close-out: AGT-131 settles 'delivered' · finalises Sep 28, 3:20 PM CST · `select public.reverse_decision('f8488e71-3e76-48f2-a985-67bf342045d5','John','<why>');`
- `d71aef1a` · design-kickoff · `AGT-151` · Kickoff designed for AGT-151 (Builder-turn replay as the orchestrator-lane trial); verify-ship split to AGT-158 · finalises Sep 28, 3:25 PM CST · `select public.reverse_decision('d71aef1a-163d-4ee2-b47d-3240977e93d4','John','<why>');`
- `d69db1ec` · ship · `AGT-153` · AGT-153 delivered (verifier block on standing reds, no new red from this change) · finalises Sep 28, 3:44 PM CST · `select public.reverse_decision('d69db1ec-eef1-4e7d-9971-6248c507b49e','John','<why>');`
- `5a9950fc` · ship · `AGT-152` · AGT-152 delivered (verifier block on standing reds, no new red from this change) · finalises Sep 28, 3:44 PM CST · `select public.reverse_decision('5a9950fc-37ae-4729-b8ca-fb28f4c2f4fa','John','<why>');`
- `7c1f795d` · design-kickoff · `AGT-154` · Kickoff designed for AGT-154: career-linkedin-alerts capability on Jerry · finalises Sep 28, 3:44 PM CST · `select public.reverse_decision('7c1f795d-086b-4915-a38e-af3b47f60b29','John','<why>');`
- `d60e404b` · rollback · — · Auto-rollback held: ci-red on fced087 was not reverted (card-only) · finalises Sep 28, 4:00 PM CST · `select public.reverse_decision('d60e404b-54ce-4e6d-beea-e57cd38ff86b','John','<why>');`
- `60cfc0dc` · classification · — · board ordered: 6 ticket(s) given an automation_rank · finalises Sep 29, 1:51 AM CST · `select public.reverse_decision('60cfc0dc-4848-430c-93b7-9dca07f2953d','John','<why>');`
- `ed127bf1` · hygiene · `AGT-79` · Ticket Owner: 1 derivable cell fix(es) on 1 row(s) — cost 1 · claim 0 · type 0 · finalises Sep 29, 1:56 AM CST · `select public.reverse_decision('ed127bf1-cb7f-40c4-8a1c-bd9301265e5e','John','<why>');`
- `f38d0291` · agent-row · `AGT-137` · AGT-137: re-pin dm-knowledge-cycle-card e16c0b75fa29cc58 → f5444ac51be95df0 · finalises Sep 29, 2:14 AM CST · `select public.reverse_decision('f38d0291-2259-4473-a12b-721a2e9d0bea','John','<why>');`
- `a12f2d93` · ticket-status · `AGT-137` · Close-out: AGT-137 settles 'delivered' · finalises Sep 29, 2:43 AM CST · `select public.reverse_decision('a12f2d93-6c2b-48cf-ad15-ba31f01ae81c','John','<why>');`
- `66fdc55d` · rule · `AGT-135` · AGT-135: filed John's seven rulings of 2026-09-25 as governance_rules rows JOHN-0925-* with his verbatim words · finalises Sep 29, 3:24 AM CST · `select public.reverse_decision('66fdc55d-0436-4b2b-89ac-14ab6fe3b205','John','<why>');`
- `69e1947c` · agent-row · `AGT-135` · AGT-135: carried the same rulings into the Designer, Auditor and Researcher Skill rows (ds-guardrails, au-knowledge-hom… · finalises Sep 29, 3:24 AM CST · `select public.reverse_decision('69e1947c-810e-40a8-8ee3-a3c8824eec6f','John','<why>');`
- `d9bf449e` · ticket-status · `AGT-135` · Close-out: AGT-135 settles 'delivered' · finalises Sep 29, 3:49 AM CST · `select public.reverse_decision('d9bf449e-f601-4528-a8f8-0ee9b4eba13b','John','<why>');`
- `59e5e346` · agent-row · `AGT-140` · AGT-140: re-pin dm-knowledge-cycle-card f5444ac51be95df0 → 2ba263050860812c · finalises Sep 29, 4:49 AM CST · `select public.reverse_decision('59e5e346-172d-4117-b404-0185044d48b4','John','<why>');`
- `ea1c27fc` · ticket-status · `AGT-140` · Close-out: AGT-140 settles 'delivered' · finalises Sep 29, 5:10 AM CST · `select public.reverse_decision('ea1c27fc-f5c5-4ecf-9098-38ddaa985612','John','<why>');`
- `9d259d44` · design · `AGT-132` · AGT-132's premise is alive and its kickoff is docs/kickoffs/v7.0.605-AGT-132-finding-routes.md — slice 1 of 2, five tas… · finalises Sep 29, 5:11 AM CST · `select public.reverse_decision('9d259d44-903f-4f59-a433-584633243dfc','John','<why>');`
- `6de16905` · agent-row · `AGT-132` · AGT-132: the review intent learns source, type and routing · finalises Sep 29, 5:27 AM CST · `select public.reverse_decision('6de16905-f4c3-485a-93c3-848f18eae937','John','<why>');`
- `1523d576` · ticket-status · `AGT-132` · Close-out: AGT-132 settles 'partial' · finalises Sep 29, 5:51 AM CST · `select public.reverse_decision('1523d576-9dcb-4a61-809b-0346799c5c45','John','<why>');`
- `01355a51` · learning · `SES-159` · class-loop learning claims for P3 - Investor Value · finalises Sep 29, 5:59 AM CST · `select public.reverse_decision('01355a51-a8fa-4b84-8134-2b94f2cfbe0e','John','<why>');`
- `a905ce0e` · design · `AGT-138` · AGT-138's premise is alive and its kickoff is docs/kickoffs/v7.0.608-AGT-138-researcher-weekly-routine.md — nine tasks… · finalises Sep 29, 6:44 AM CST · `select public.reverse_decision('a905ce0e-9e9c-4e64-a6b3-3cd261a3f573','John','<why>');`
- `2800fb74` · agent-row · `AGT-132` · AGT-132 slice 2: the runner-chain guardrail moves to the run-project Intent · finalises Sep 29, 6:45 AM CST · `select public.reverse_decision('2800fb74-d700-4a95-b04b-cdf403f0f010','John','<why>');`
- `c2318e42` · agent-row · `AGT-138` · AGT-138: re-pin dm-knowledge-cycle-card 2ba263050860812c → 10917f0a49bc2b0b · finalises Sep 29, 6:58 AM CST · `select public.reverse_decision('c2318e42-befa-4787-a78b-1f0a85edbcc5','John','<why>');`
- `2ddefc51` · ticket · `AGT-138` · AGT-138: supersede SES-369 and SES-430 — step 4b's invention pass is retired from the cycle, so the filing gate they de… · finalises Sep 29, 7:07 AM CST · `select public.reverse_decision('2ddefc51-bd0f-4148-b689-2783994fc01e','John','<why>');`
- `a8778f93` · ticket-status · `AGT-132` · Close-out: AGT-132 settles 'delivered' · finalises Sep 29, 7:16 AM CST · `select public.reverse_decision('a8778f93-2dd8-4aec-b838-f340d1e9488d','John','<why>');`
- `80d986f9` · ticket-status · `AGT-138` · Close-out: AGT-138 settles 'partial' · finalises Sep 29, 7:31 AM CST · `select public.reverse_decision('80d986f9-57d7-45ed-a5e2-09aabc6268d1','John','<why>');`
- `736279b4` · agent-row · `AGT-134` · AGT-134: dm-audit-review-intent.method gains the upkeep paragraph — routine-prompt drift is the manager's own ruling, r… · finalises Sep 29, 8:16 AM CST · `select public.reverse_decision('736279b4-9f93-48d1-a573-3e582dc66923','John','<why>');`
- `216358e9` · design · `AGT-136` · AGT-136's premise is alive and its kickoff is docs/kickoffs/v7.0.611-AGT-136-designer-ruling-desk.md — seven tasks over… · finalises Sep 29, 8:29 AM CST · `select public.reverse_decision('216358e9-8c5a-496c-8fb1-fada635870a8','John','<why>');`

**91 final this week, 0 reversed this week** — *this week* is a **rolling 7 days** back from the stamp, not a calendar week and not a Friday-07:00Z reset: no such weekly-reset helper exists in this file or anywhere in `scripts/`, so a rolling window is what is used and is labelled as one. A reversal is the strongest negative signal the ladder takes (`M6-07`), so the second number is the one to read first.

**Decided for you** — *as of 2026-09-26 13:29Z (Sep 26, 8:29 AM CST).* What the runner DECIDED on your behalf, by CST day (`governance_rules.MANAGER-DECIDES-BY-DEFAULT`: *a daily list of what was decided, not questions*), with the questions that reached you anyway counted beside it — target zero. Not the `Open decisions` group above: that one is the undo list and drops a decision the moment it finalises; this one is the record of the day and keeps it. **21 decided on 2026-09-26**; **2 question(s) reached you in the last 7 days — target zero**; 19 still open.

| CST day | decided | reversed | questions to you |
|---|---:|---:|---:|
| `2026-09-26` | 21 | 0 | 0 |
| `2026-09-25` | 32 | 0 | 0 |
| `2026-09-24` | 39 | 0 | 2 |
| `2026-09-23` | 32 | 0 | 0 |
| `2026-09-22` | 0 | 0 | 0 |
| `2026-09-21` | 2 | 0 | 0 |
| `2026-09-20` | 29 | 0 | 0 |

**The 21 decided on 2026-09-26** — newest first.

- `216358e9` · design · `AGT-136` · AGT-136's premise is alive and its kickoff is docs/kickoffs/v7.0.611-AGT-136-designer-ruling-desk.md — seven tasks over… · open
- `736279b4` · agent-row · `AGT-134` · AGT-134: dm-audit-review-intent.method gains the upkeep paragraph — routine-prompt drift is the manager's own ruling, r… · open
- `80d986f9` · ticket-status · `AGT-138` · Close-out: AGT-138 settles 'partial' · open
- `a8778f93` · ticket-status · `AGT-132` · Close-out: AGT-132 settles 'delivered' · open
- `2ddefc51` · ticket · `AGT-138` · AGT-138: supersede SES-369 and SES-430 — step 4b's invention pass is retired from the cycle, so the filing gate they de… · open
- `c2318e42` · agent-row · `AGT-138` · AGT-138: re-pin dm-knowledge-cycle-card 2ba263050860812c → 10917f0a49bc2b0b · open
- `2800fb74` · agent-row · `AGT-132` · AGT-132 slice 2: the runner-chain guardrail moves to the run-project Intent · open
- `a905ce0e` · design · `AGT-138` · AGT-138's premise is alive and its kickoff is docs/kickoffs/v7.0.608-AGT-138-researcher-weekly-routine.md — nine tasks… · open
- `01355a51` · learning · `SES-159` · class-loop learning claims for P3 - Investor Value · open
- `1523d576` · ticket-status · `AGT-132` · Close-out: AGT-132 settles 'partial' · open
- `6de16905` · agent-row · `AGT-132` · AGT-132: the review intent learns source, type and routing · open
- `9d259d44` · design · `AGT-132` · AGT-132's premise is alive and its kickoff is docs/kickoffs/v7.0.605-AGT-132-finding-routes.md — slice 1 of 2, five tas… · open
- `ea1c27fc` · ticket-status · `AGT-140` · Close-out: AGT-140 settles 'delivered' · open
- `59e5e346` · agent-row · `AGT-140` · AGT-140: re-pin dm-knowledge-cycle-card f5444ac51be95df0 → 2ba263050860812c · open
- `d9bf449e` · ticket-status · `AGT-135` · Close-out: AGT-135 settles 'delivered' · open
- `69e1947c` · agent-row · `AGT-135` · AGT-135: carried the same rulings into the Designer, Auditor and Researcher Skill rows (ds-guardrails, au-knowledge-hom… · open
- `66fdc55d` · rule · `AGT-135` · AGT-135: filed John's seven rulings of 2026-09-25 as governance_rules rows JOHN-0925-* with his verbatim words · open
- `a12f2d93` · ticket-status · `AGT-137` · Close-out: AGT-137 settles 'delivered' · open
- `f38d0291` · agent-row · `AGT-137` · AGT-137: re-pin dm-knowledge-cycle-card e16c0b75fa29cc58 → f5444ac51be95df0 · open
- `ed127bf1` · hygiene · `AGT-79` · Ticket Owner: 1 derivable cell fix(es) on 1 row(s) — cost 1 · claim 0 · type 0 · open
- `60cfc0dc` · classification · — · board ordered: 6 ticket(s) given an automation_rank · open

**Judgment classes** — *as of 2026-09-26 13:29Z (Sep 26, 8:29 AM CST).* What the corpus currently holds per pull test, live from `public.judgment_class_census` (`SES-84`; the same view `SES-159` reads). Ratification is a standing metric (John, 2026-08-23: a class is never finished being learned), never a finish line.

| class | ratified | proposed | rejected | total |
|---|---:|---:|---:|---:|
| `P1 - Improves John's Skills` | 7 | 31 | 6 | 44 |
| `P2 - Inventive` | 0 | 95 | 16 | 111 |
| `P3 - Investor Value` | 0 | 67 | 7 | 74 |
| `P4 - New Customers` | 1 | 37 | 3 | 41 |
| `neutral` | 0 | 83 | 30 | 113 |

- Newest proposed root claim for P1: *no proposed root claim*.
- Newest proposed root claim for P2: `VC-SYN-002` — Inventive features are the least-tested product goal because the bar John set — something competitors cannot easily copy — he has never applied to a real featu…
- Newest proposed root claim for P3: `VC-SYN-001` — Investor value is the least-defined product goal because nobody has yet said what an investor would check. The drafts agree on one reading: the buyer is a skep…
- Newest proposed root claim for P4: `VC-ROOT-004` — New features that win new customers. The bar is buy-pull — functionality that makes a customer say "I have to buy this." Administrative capability (accounts, b…

- **FLAG: 4 live claims still `unclassed`** — after `SES-84` this is zero by construction; a non-zero here is drift (a claim inserted without a classing decision) and needs one recorded decision, never a default.

**John-model** — *as of 2026-09-26 13:29Z (Sep 26, 8:29 AM CST).* How often a decision that leaned on a standing pattern of John's stood unreversed through its window, live from `public.john_model_signal` (`SES-004`; the criteria are `public.decision_patterns`, exported from `docs/JOHN-DECISION-PATTERNS.md`). A rate binds only from 30 finalised-or-reversed decisions (M7 gate, ruling iii).

- **99.6% agreement** over 271 finalised-or-reversed decisions (270 finalised unreversed, 1 reversed; 98 still open, 369 citing in total). A reversal is the strongest negative signal the ladder takes, so the second number is the one to read first.

| criterion | citing | final unreversed | reversed | open | rate |
|---|---:|---:|---:|---:|---:|
| `pattern:0` No standing pattern applied -- new judgment. | 189 | 127 | 0 | 62 | 100% |
| `pattern:137` P1–P4 are pull tests, not category labels — administrative expectations never q… | 77 | 77 | 0 | 0 | 100% |
| `pattern:85` Don't gate small, reversible calls on his approval — decide and flag. | 50 | 47 | 1 | 2 | 97.9% |
| `pattern:96` When a gap surfaces outside the session's scope, log it with its own ID rather… | 20 | 12 | 0 | 8 | — |
| `pattern:2` Data-driven over code — hardcoding is the platform's premise to remove, not a c… | 18 | 0 | 0 | 18 | — |

- A per-pattern `—` is not a zero: that criterion has not reached 30 finalised-or-reversed citations of its own, so it carries counts and no rate.

**Invention in use** — *as of 2026-09-26 13:29Z (Sep 26, 8:29 AM CST).* Criterion 7 (`docs/SELFBUILD-CHARTER.md`): at least one platform-originated feature — the Bench Report Card judge (`LOG-143`) — is measurably used by real visitors, live from `public.report_card_usage`. Counts only, never a rate.

- **7d:** 0 judge runs, 0 by real visitors (0 distinct).
- **30d:** 3 judge runs, 0 by real visitors (0 distinct).
- **all:** 3 judge runs, 0 by real visitors (0 distinct).

- *no real-visitor use yet.*

**Board by served class** — *as of 2026-09-26 13:29Z (Sep 26, 8:29 AM CST).* Which class each open ticket SERVES under the served-class test (`VC-MISSION-033`), ruled by The Prioritizer's `classify-ticket` and stored on `backlog_items.supports_class` — a ticket's own class is a different question and is not restated here.

| serves | open tickets |
|---|---:|
| `P1 - Improves John's Skills` | 82 |
| `P2 - Inventive` | 11 |
| `P3 - Investor Value` | 5 |
| `P4 - New Customers` | 2 |
| `P7 - Agent Creation` | 1 |
| *serves none* | 533 |

- *Negative ranks are John's own automation queue, seeded to sort ahead of anything assigned later (`SES-86`). The nightly re-rank writes 1..N and therefore sits below them — intended precedence, not a re-rank that failed.*

- **Top 5 by `automation_rank`:**
  -35. `SES-288` — A schema-range red can never be auto-reverted: one refused down-migration disables rollba… *(serves none)*
  1. `AGT-128` — settle-ship.js marks a finished ticket partial when its STOP LINE mentions another ticket… *(serves none)*
  3. `AGT-141` — Six active product agents have no Capability, so nothing can ever call them: Robyn Castel… *(serves none)*
  4. `SES-337` — The Verifier agent must reproduce the last 30 recorded verdicts before it grades a ship,… *(serves P1 - Improves John's Skills)*
  5. `SES-392` — The meter reader fails silently: exit 2 from 13:15 CT to 19:20 CT on 2026-09-12 with no l… *(serves P2 - Inventive)*

- Last scheduled re-rank: Sep 26, 1:50 AM CST.

**Governance agents, last 7 days** — *as of 2026-09-26 13:29Z (Sep 26, 8:29 AM CST).* Whether the platform's own agents (`agents.lane = 'governance'`) are doing the development work, live from `public.governance_agent_usage` and `public.ship_handoff_census` (`SES-360`). A **rolling 7 days** back from render time, like the decision counts above. Counts and token sums only, never a rate.

| role | source | calls | input tokens | output tokens |
|---|---|---:|---:|---:|
| Governance — Development Manager | `session` | 32 (17 untokened) | 622861 | 264865 |
| Governance — Researcher | `session` | 2 (2 untokened) | 0 | 0 |
| Governance — Prioritizer | `session` | 11 (6 untokened) | 166114 | 3053 |
| Governance — Prioritizer | *unlabelled* | 307 (307 untokened) | 0 | 0 |
| Governance — Designer | `session` | 68 (56 untokened) | 1309762 | 195000 |
| Governance — Builder | `session` | 41 (34 untokened) | 1178256 | 138000 |
| Governance — Verifier | *no calls in the window* | 0 | — | — |
| Governance — Auditor | `session` | 19 (7 untokened) | 524196 | 88663 |
| Governance — Ticket Owner | `session` | 6 | 0 | 0 |

- **Ships with all four handoff rows: 14 of 28** ships in the window (`SES-345`'s four: `automation_rank`, `kickoff_link`, a per-ticket push sha, a verdict row). Missing per leg: kickoff_link 1, per-ticket sha 1, automation_rank 14, verdict 1.
- *unlabelled* is a NULL `call_source` — the pre-attribution unknown, never read as automation (`LOG-128`); `untokened` rows carry no token counts at all (deterministic handler rows), so a large call count beside a small token sum is that, not a cheap model.

**Auditor's ledger** — *as of 2026-09-26 13:29Z (Sep 26, 8:29 AM CST).* What `public.audit_findings` (`AGT-70`) holds and what has left it for the board. Counts only, never a rate. Latest week 2026-W39: **100 findings (66 open · 1 resolved · 4 not a defect)** — **0 ruled** open findings (a ruled, open, `high` row is what `tripwire-to-backlog.js --from-ledger` files, at most 3 per ISO week); **0 filed** to the board from the ledger so far (`source_file = 'audit-ledger'`).

| fingerprint | kind | confidence | fact | ruled |
|---|---|---|---|---|
| `04059a049757e346` | stale-or-irrelevant | high | public.runner_cycles has no gate_failed column; the three gates live on runner_… | — |
| `0644e721c006eac7` | stale-or-irrelevant | high | An open backlog row older than the unrevalidated-days fence that has never been… | — |
| `0b97a0130c6b56d5` | other | high | secret_assignment must not appear in a public repo | — |
| `0fee32d1db004611` | contradiction | high | Whether a cycle can record the Development Manager's assignment through the dri… | — |
| `148f008332025cd8` | other | high | personal_path must not appear in a public repo | — |
| `152f40a224e3ccdf` | other | high | personal_path must not appear in a public repo | — |
| `18880c908aff8f68` | other | high | personal_email must not appear in a public repo | — |
| `18963eb44fd184ff` | other | high | vercel_bypass must not appear in a public repo | — |
| `1941f78ebe983471` | contradiction | high | Which version the regenerated CLAUDE-STATE.md names as in dev: the run says it… | — |
| `1ad6ed4df8689ad0` | contradiction | high | How many rows public.finding_routes holds: five since this ship, while agt-132-… | — |
| `1af79d1dac15e3a0` | other | high | A ticket the runner has cycled at least chain_max_noship_streak times without r… | — |
| `1e95ccde9ee38c6f` | contradiction | high | How long the serial tail can take against a 10-minute publish-lease TTL: (7c) a… | — |
| `1f0bd21fae63bc44` | contradiction | high | audit_findings holds exactly two rows from this cycle and neither is the staff-… | — |
| `2186a662fa7abc8f` | other | high | Ticket Owner check cycles-over-quote holds open judgment rows a capability must… | — |
| `243913269c869ac0` | other | high | personal_path must not appear in a public repo | — |
| `26a97f3b91333c3b` | other | high | secret_assignment must not appear in a public repo | — |
| `2a434286868f4488` | other | high | personal_path must not appear in a public repo | — |
| `324011fa0e532b01` | other | high | The hold on a CI red is recorded as a runner_decisions kind='rollback' row; the… | — |
| `32da6396be5e06ad` | other | high | Ticket Owner check type-off-taxonomy holds open judgment rows a capability must… | — |
| `33e539b3646db01b` | contradiction | high | the live routine prompt must equal its repo block (the repo is the source) | — |
| `376c6e18df1b387a` | stale-or-irrelevant | high | How many capability assignments the Auditor holds: ALL_ASSIGNMENTS lists seven… | — |
| `397cdb89a0da1318` | other | high | Ticket Owner check size-missing holds open judgment rows a capability must deci… | — |
| `3bbbb6c2bca6bf01` | other | high | personal_path must not appear in a public repo | — |
| `40e7fdd6ec773619` | other | high | runner_lease still names this closed cycle as holder with released_at NULL, aft… | — |
| `45429d5db65dd50c` | other | high | Ticket Owner check cost-snapshot-missing holds open judgment rows a capability… | — |
| `4feda382d8537b0b` | other | high | Which component enforces step 4c's one-re-rank-per-Chicago-day precondition: sc… | — |
| `50cec657f351bab0` | contradiction | high | A token half the caller could not measure is stored NULL, never 0; ai_activity_… | — |
| `5c1183cf316e9c13` | other | high | No finding_routes row matches source 'runner', and the same cycle left two open… | — |
| `683413067f763697` | other | high | Ticket Owner check verdict-missing holds open judgment rows a capability must d… | — |
| `6b21d5a6f8d92049` | other | high | Whether a cycle can record a staff-watch finding: --record exits 2 on a JSON pa… | — |
| `6d0dd95e379424bc` | other | high | personal_path must not appear in a public repo | — |
| `78c2259b6307b892` | contradiction | high | public.finding_routes gained a live row at 11:58:57Z while supabase_migrations… | — |
| `8a7ff8d8ffcd699a` | other | high | personal_path must not appear in a public repo | — |
| `8b5104bceb520cef` | other | high | secret_assignment must not appear in a public repo | — |
| `8bdc4d01f449ed45` | stale-or-irrelevant | high | The ticket that tracks agt-70-auditor's standing red is AGT-108; AGT-119 has be… | — |
| `921c9d1500e3640d` | other | high | A ticket the runner has cycled at least chain_max_noship_streak times without r… | — |
| `928e873d7a454242` | contradiction | high | Whether SES-418's remaining ask — a per-row-tolerant insert or a batch validate… | — |
| `961caae922b0381a` | other | high | Which model the orchestrator lane runs and what it costs: the lane row names cl… | — |
| `9da758976854c095` | stale-or-irrelevant | high | Which project a cycle passes to run-project.js: step 5(b) says the one executin… | — |
| `afa61ca383385e4a` | contradiction | high | Why AGT-132 is absent from the live queue: its blocked_by resolves to AGT-131,… | — |
| `b071de1cdc80850f` | contradiction | high | Whether a builder cycle runs step 4b, gated only by public.invention_due(), whi… | — |
| `b14e25e62a9a3fae` | other | high | personal_path must not appear in a public repo | — |
| `b21f540cdbe014da` | other | high | personal_email must not appear in a public repo | — |
| `b2a8e5751044dd23` | contradiction | high | A backlog row marked done whose latest runner verdict is block was closed over… | — |
| `b2c6e7547528017c` | contradiction | high | How many bytes step 4b's removal took out of runner-cycle.md: the file fell 10,… | — |
| `b4a79dd4bbaff09b` | other | high | secret_assignment must not appear in a public repo | — |
| `b508e0bc46f0a9d1` | other | high | Ticket Owner check actual-unknown holds open judgment rows a capability must de… | — |
| `b5791188425c8167` | other | high | Whether a promoted staff-watch fingerprint asks John once or once per cycle: --… | — |
| `b7ab5ea9e6270608` | other | high | A ticket the runner has cycled at least chain_max_noship_streak times without r… | — |
| `b9a1eff544a353c1` | other | high | Ticket Owner check delivered-unaccepted holds open judgment rows a capability m… | — |
| `be357147648b9773` | other | high | Ticket Owner check remainder-stranded holds open judgment rows a capability mus… | — |
| `c0235363de641431` | other | high | Ticket Owner check designed-closed holds open judgment rows a capability must d… | — |
| `c032db785757a1ce` | contradiction | high | shared/ai-patterns.js SERVICE_CATALOG carries no audit-run-review slug, so the… | — |
| `cd074976f89a0196` | other | high | An open or partial backlog row with no epic, or whose epic has no project, can… | — |
| `d7d67bd521cb1667` | contradiction | high | A blocker the record says predates AGT-132 is carried only as AGT-132's remaind… | — |
| `daf4de7eb3741deb` | contradiction | high | Whether a pre-output refusal is billed: the executor writes billed:false and co… | — |
| `e2c2c390f2a15ef7` | other | high | Ticket Owner check quote-missing holds open judgment rows a capability must dec… | — |
| `e4d79e646fca8ff5` | other | high | personal_path must not appear in a public repo | — |
| `ee201e55a264626f` | other | high | How many runner_decisions rows AGT-135 holds: three (rule 66fdc55d, agent-row 6… | — |
| `fdda0cbd404388fc` | other | high | Ticket Owner check claim-on-closed holds open judgment rows a capability must d… | — |
| `087e52a3e12b5a95` | other | medium | The runner was refused 13 times this week by weekly_pace and stopped 4 times by… | — |
| `26939874d2745c04` | contradiction | medium | 'partial' is a backlog_items status, never a runner_cycles outcome — runner_cyc… | — |
| `4845b12563eb1150` | other | medium | How many reversible decisions this cycle wrote for AGT-140: two (agent-row 59e5… | — |
| `6328dcd20ca39da9` | contradiction | medium | How many regression tests passed at graded_sha c98be850: the cycle row and the… | — |
| `68670c38dbb03a81` | contradiction | medium | Which commits on dev hold this cycle's research doc and kickoff: c13086db and e… | — |
| `d51d16ad16aac1d6` | other | medium | Whether a change to the functions that decide every pick can steer a peer cycle… | — |

- *A finding leaves this table only by John's ruling — `resolved`, `not-a-defect`, or ruled and left `open` to file. Candidates a run found but nobody ingested live in `docs/audits/<week>-candidates.json`, not here.*

**Ticket hygiene, last night** — *as of 2026-09-26 13:29Z (Sep 26, 8:29 AM CST).* What the Ticket Owner (`AGT-79`) left on the board: `public.ticket_owner_findings` open rows by check, the newest `hygiene` decision and the newest nightly cycle row. Counts only, never a rate. **247 open findings** across 11 check(s).

| check | open | oldest | nights open |
|---|---:|---|---:|
| `actual-unknown` | 89 | Sep 12, 10:31 PM CST | 13 |
| `verdict-missing` | 45 | Sep 12, 10:31 PM CST | 13 |
| `size-missing` | 31 | Sep 12, 10:31 PM CST | 13 |
| `delivered-unaccepted` | 22 | Sep 12, 10:31 PM CST | 13 |
| `type-off-taxonomy` | 17 | Sep 12, 10:31 PM CST | 13 |
| `designed-closed` | 12 | Sep 23, 7:50 PM CST | 2 |
| `remainder-stranded` | 8 | Sep 18, 5:38 AM CST | 8 |
| `claim-on-closed` | 7 | Sep 26, 1:51 AM CST | 0 |
| `quote-missing` | 7 | Sep 12, 10:31 PM CST | 13 |
| `cost-snapshot-missing` | 6 | Sep 26, 1:51 AM CST | 0 |
| `cycles-over-quote` | 3 | Sep 12, 10:31 PM CST | 13 |

- Last run: `68d6790b` · shipped · Sep 26, 1:56 AM CST · 959 rows · 248 findings (1 derivable · 247 judgment) · behind the fences: quote 525 · size 493 · cost 45 · verdict 97 · unrevalidated>30d 440 · attended-actual null 319 · fixed 1 · findings +26 ~221 −1 · decision ed127bf1-cb7f-40c4-8a1c-bd9301265e5e — reversible until 2026-09-29T06:56:28.929429+00:00 · judged 1/13/0 on claude-fable-5-1
- Judgment: **the newest night was judged** — 0 unjudged nights on top, over the newest 13 on record.
- Decision `ed127bf1` · open · Ticket Owner: 1 derivable cell fix(es) on 1 row(s) — cost 1 · claim 0 · type 0 · finalises Sep 29, 1:56 AM CST · `select public.reverse_decision('ed127bf1-cb7f-40c4-8a1c-bd9301265e5e','John','<why>');`

**Staff watch** — *as of 2026-09-26 13:29Z (Sep 26, 8:29 AM CST).* What the Development Manager (`SES-378`) recorded about the runner's own agents: `public.runner_staff_findings` rows per `agent_id`, with the distinct fingerprints and the distinct CYCLES behind them. Counts only, never a rate. **22 finding(s)** across 2 agent(s).

| agent | findings | distinct fingerprints | distinct cycles | newest |
|---|---:|---:|---:|---|
| `designer` | 18 | 5 | 17 | Sep 26, 7:15 AM CST |
| `devmanager` | 4 | 4 | 4 | Sep 24, 3:00 AM CST |

**Human gates** — *as of 2026-09-26 13:29Z (Sep 26, 8:29 AM CST).* The two reads that say whether anything is waiting on a human: open `backlog_items` carrying `design_status = 'needs-john'`, and `gated_before_build` `runner_items` left with `decision IS NULL` (`M6-01`). Board state, written by no code in this repo — which is why it is REPORTED here and not asserted as a gate by the regression suite. **1 open `needs-john` ticket(s)**, **5 undecided `gated_before_build` card(s)**.

- **`needs-john` (1):** `AGT-110`
- **Undecided gated cards (5):** `54b42eea-be4f-434d-963a-6707873bc137`, `2d5441c7-5133-4b21-9768-7921dce0c409`, `98fc7845-dd55-426d-8d89-895385e04248`, `e8fdfaee-667c-4d45-9f45-c759a134fffb`, `03bad3ed-4c4d-4312-850d-67fc03f467d2`
- *Open is not wrong.* A card nobody has answered yet is a real board state; what it is NOT is a regression, so nothing in the suite goes red for it.

*Provenance: 1000 board rows, payload `sha256:dc8d9692884eb57b`, as of 2026-09-26 13:29Z (Sep 26, 8:29 AM CST). The stamp says when this was last read; the sha says whether it still matches the tables. `--check` compares the sha, never the stamp — a refreshed stamp over identical facts is not drift.*
<!-- END GENERATED — scripts/render-standing-brief.js -->

**Next session:** none required — the runner is live and works **John's automation queue** (canonical: `docs/RUNNER-GOV-0820-REQUIREMENTS.md`): the queue is the board's leading sort key, not a list to read (`automation_rank`, v7.0.133) — `ORDER BY queue` already honours it. Classes are always written named, **`P1 - Improves John's Skills` → `P10 - Tooling`**; outcomes as plain words (“did not run”, “gated before build”); budget is two-track (API dollars + token governor). John judges from the briefing page. Runner pause: disable `deepbench-runner` at claude.ai/code/routines. **Board census measured 2026-08-23T12:5xZ by runner cycle `363b5138`, taken from the board after its own close-out recompute rather than carried forward:** **561 open tickets, 561 numbered, 0 open-but-unnumbered**, 611 rows total, **the standing Automation drain now has a FIXED finish line** — from `v7.0.179` (`SES-142`) it works the **18 members John named** on directive `b74009ea`, stored as `runner_drain_scope` FK rows, and a ticket filed into the epic *after* that naming **never joins it**: it queues normally and waits for him. The live `now` tier had already drifted to 19 against his 18. `drain_epic_next()` retires when those 18 are `done`/`removed`, and returns the new outcome **`unscoped`** — never a live-tier fallback — for any future drain declared without a list. Queue/drain state as of **v7.0.196** (2026-08-23 ~17:00Z, `successional-review` close-out, 561 rows renumbered): `SES-140` — *the successor fire is refused by the platform* and `SES-151` — *the scheduler runs on John's clock grid* are both **`done`**; the drain's nearest open member `SES-84` — *the vision corpus* (`needs-john`) waits on John's briefing decisions, so cycles step past it (`SES-114`) and work the board (`SES-121` — *shrink the `.claude/`-mutable surface* went `done` at v7.0.198; procedure text now lives in `docs/runbooks/`, cycle-writable). **The board's `title` column is trustworthy for display for the first time** (`SES-91`, v7.0.177): 98 rows that held a bare priority-class string now carry a real authored title, and the only `^P[0-9]+ - ` title left is `ADM-1`, whose title is a real sentence behind a stale class prefix and is deliberately left for `SES-117` to **accommodate** rather than repair. `SES-119` is now `done` (v7.0.184 + v7.0.185): the briefing renders `public.backlog_display_title(title, description)` rather than the read-time `gist` workaround, and **`runner-cycle.md`'s Language block now requires a ticket's title wherever John reads its ID**. Step 5's `gist` expression deliberately stays — it is still correct for any future row filed the old way, and 50 of 562 open numbered tickets still fall back to it. **From v7.0.195 the chain runs IN-SESSION (`SES-140` FINAL)** — a cycle that actually ran one (`shipped`/`gated_before_build`/`reverted`) and whose drain still returns `pick` opens its next `runner_cycles` row (trigger `chained (drain continuation)`) **in the same session** and re-enters the runbook at step 1; session-spawning is retired as platform-unsupported (`runner-cycle.md` tail step (8) carries the evidence). A **wall-stopped cycle continues nothing**, which keeps the budget wall a brake rather than a metronome. Proven live 2026-08-23: cycles `1fcd687e` → `a11c94d2`, the first chained row in the runner's life. **The briefing-redesign epic is finished** — `SES-129`, its last member, shipped in cycle `ed1a5eb3`. **A new filing rule binds from this version:** `runner_items.backlog_id` takes a **bare** ticket id or NULL and is enforced by `ck_runner_items_backlog_id_bare`; the display string belongs in `display_ref`, and the briefing's id chip reads `coalesce(backlog_id, display_ref)` (`SES-116`, v7.0.174 — `runner-cycle.md` step 9). **`design_status` reads for selection (`SES-114`, v7.0.165); among OPEN tickets measured at the v7.0.198 close-out:** 16 `designed` (incl. `SES-101`, flipped from `needs-desktop` — its one remaining edit now lives in `docs/runbooks/session-setup.md` step 3c, cycle-writable), **0 `needs-desktop`**, **1 `needs-john`** (`SES-84`), 546 `NULL` = not yet triaged, deliberately not guessed to `auto`. Measured at the v7.0.198 close-out: **11 of John's 18 named members remain open** (`SES-121` retired from the list by going `done` this session); the only `needs-john` member is `SES-84` — the rest are buildable, the drain reaches them and can retire on them. **`CHI-89`** still holds its queue slot with its removal card undecided — visible to John and skipped by cycles, exactly as `SES-113` intended. **`SES-133` is still open at `partial`** — the other half of John's 2026-08-23 emergencies directive; it sits at queue 251 rather than at the top, because the drain reads the Automation epic's `now` tier in queue order and `SES-133` is not in that epic. **From v7.0.182 John's own switches govern the cadence** (`SES-143`): the briefing's **§2b Automation panel** carries a scheduler checkbox + an every-N-hours box (the generated block above is the only home for their live values — it renders `runner_settings` row 1 fresh each cycle, `SES-151`) and a drain checkbox, and `runner-cycle.md`'s **new step 1b** calls `public.scheduler_gate()` before anything else — a scheduled cycle arriving early closes `did_not_run` with *"paced by your scheduler setting"*, and with the scheduler off it closes *"scheduler off"*. **The cron is John's own routine switch** — a cycle cannot edit its own routine — and **from v7.0.196 (`SES-151`) the gate paces by John's clock grid**: a scheduled fire runs iff its row's `started_at` falls in an America/Chicago hour divisible by `runner_settings.interval_hours` — row 1, read live, never a number written here — and the routine's cron fires in that hour (DST-proof; the mixed-clock elapsed test that wrongly paced 3 of 9 hourly fires is dead, `q-hourly-interval-boundary` answered by ship). Two consequences worth knowing before reading a quiet night as a stall: the gate **fails open** on every unknown, and it governs **scheduled** fires only, so a standing drain's chained continuation cycles run regardless — while the Automation drain stands, **the chain and not the interval is what actually sets the pace**. A manual fire (off the cron grid) is never paced; whether that is what John wants is the one thing the spec leaves open, asked as `q-manual-fire-pacing`. **From v7.0.188 that gate actually fires** (`SES-146`): until then `scheduler_gate()` matched the trigger by exact equality against the bare word `scheduled`, so a cycle passing the verbatim line step 1b asks for — `trigger: scheduled` — fell through to *"not a scheduled cycle"* and skipped **both** the pacing branch and the `scheduler_on = false` branch, and the grid test compared `now()`-at-step-1b rather than the fire time against a hardcoded ±2. Both failed open, so the panel looked live and bound nothing. The trigger is now normalised, the grid is anchored to the cycle row's own `started_at`, and the tolerance is the column `runner_settings.grid_tolerance_min` (10). **Silence is not a “no”** on any open question. **From v7.0.183 the board's open status is `open`, never `missing`** (`SES-118`): `backlog_items_status_check` now allows exactly `('open','partial','done','removal proposed','removed')` and the retired value raises `23514` — 510 rows renamed, `updated_at` deliberately untouched so step 8c's 30-day revalidation sweep still sees the sinking tail. **That consequence closed at v7.0.189** (attended session `ses118-gated`, 2026-08-23): step 3c's INSERT now writes `'open'`, zero `'missing'` literals remain under `.claude/`, and `SES-118` is `done` — its gated card `76564dde` awaits John's decision on the briefing page.
