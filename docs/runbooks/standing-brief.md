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
## Live board state — generated, do not hand-edit — *as of 2026-11-19 23:29Z (Nov 19, 5:29 PM CST)*

> Rendered from the tables by `scripts/render-standing-brief.js` at every ship. **Every number below is derived; nothing here is maintained by hand.** The judgment prose beneath this block is the opposite — hand-maintained, deliberately, and this script never writes outside these markers. Where the two disagree about a number, this block is right and the sentence below is stale: say so rather than reconciling them by hand.

**Board census** — *as of 2026-11-19 23:29Z (Nov 19, 5:29 PM CST).* **599 open tickets**, 574 numbered, **25 open-but-unnumbered**, 1000 rows total.

| `status` | rows | share of board |
|---|---:|---:|
| `done` | 312 | 31.2% |
| `open` | 299 | 29.9% |
| `removal proposed` | 143 | 14.3% |
| `delivered` | 133 | 13.3% |
| `removed` | 89 | 8.9% |
| `partial` | 24 | 2.4% |

**`design_status` among OPEN tickets** — *as of 2026-11-19 23:29Z (Nov 19, 5:29 PM CST).* Reads for selection (`SES-114`); `NULL` is *not* `auto`, it is not-yet-triaged and no cycle may backfill it.

| `design_status` | open rows | selection effect |
|---|---:|---|
| `NULL` | 523 | full ceremony — not yet triaged |
| `designed` | 35 | **not a skip** — build from `kickoff_link` (step 6 fast path) |
| `needs-decision` | 25 | — |
| `needs-desktop` | 15 | skipped, `record_skip()` — needs a session John attends (B39) |
| `needs-john` | 1 | skipped, `record_skip()` — John decides on a card |

**Scheduler and automation settings** — *as of 2026-11-19 23:29Z (Nov 19, 5:29 PM CST).* §2b of the briefing, John's own switches, binding via `scheduler_gate()` at step 1b:

- Scheduler: **on**, every **1 hour** on John's clock grid (America/Chicago hours divisible by the interval — `SES-151`, DST-proof).
- Cron minute **40**, manual-fire tolerance **±10 min** (a start outside it is treated as a manual fire and is never paced).
- Standing daily max: **196M tokens**. This is rung 3 of five, **below** the 48h stale floor: a standing number must not defeat the staleness brake.

**Standing epic drain** — *as of 2026-11-19 23:29Z (Nov 19, 5:29 PM CST).* Created only by John; the runner may read one, never write one (`drain_epic_next()` property 5). The finish line is drawn from the members he **named** (`runner_drain_scope`), never the live `now` tier (`SES-142`) — and within that list it is the members a milestone **gate ruled required** (`milestone_required`, `SES-310`) whenever the list carries such a ruling, every named member otherwise.

- **No drain standing.** Selection is the class-sorted board exactly as it is with no drain declared.

**Proposed projects** — *as of 2026-11-19 23:29Z (Nov 19, 5:29 PM CST).* A project whose batch finished proposes the next one (`AGT-240`): The Auditor grades what it built, The Development Manager proposes ONE project with its tickets and why. Its tickets are normal backlog rows the runner does not pick until you say yes. **1 proposed.**

- **`trusted-audit-checks`** — Trusted Audit Checks: **5 ticket(s)** (2 P10 - Tooling, 3 P9 - Bug Fixes), 12 predicted cycle(s), proposed Nov 14, 6:57 AM CST. Why: Today you cannot tell whether the platform's own checks are telling you anything: only 2 of the 319 cycle rows in the last seven days produced a run review, the one failing CI job has been red since 2026-08-31 and has never been filed because its evidence is mixed, the unclosed-delivery check flags 166 of 170 delivered rows from a column the ship never touches, and a model setting the family reje…
- **Your yes starts it** — in a session, with your words verbatim: `select public.start_proposed_project('<slug>', '<your words>', '<session name>');` It flips the project to `executing` and locks its list; only a session can run it.

**Open decisions** — *as of 2026-11-19 23:29Z (Nov 19, 5:29 PM CST).* Decisions made under `M6-02` that are still inside their reversal window (`runner_settings.reversal_window_hours` = 72h). Silence finalises them; to reverse one, run the line beside it (`docs/runbooks/session-setup.md` § Reversing a decision).

- `199f27ef` · ship · `AGT-281` · AGT-281 shipped at v7.0.741 (b33e89492cd2bf2f875ee00b16921bbd5bc4ab90) on verdict 94e15346-ebcd-4887-9a3a-21004122e93f · finalises Oct 5, 4:25 AM CST · `select public.reverse_decision('199f27ef-218c-4e56-991c-98992aaea425','John','<why>');`
- `669ac20f` · ship · `AGT-642` · AGT-642 shipped at v7.0.1004 (52ea169f) attended: a blocked ticket stops the line · finalises Nov 14, 1:08 PM CST · `select public.reverse_decision('669ac20f-61c9-4f2f-ab92-040213bee765','John','<why>');`
- `44cdbab0` · gate · — · Gate cards ruled by cycle e2ea2888-31ff-4be8-93f3-5120d24f94d0: 1 card(s) — {"john": 0, "accept": 0, "rework": 1, "reti… · finalises Nov 20, 1:55 AM CST · `select public.reverse_decision('44cdbab0-aeba-42f9-8043-c1c1a40e67ac','John','<why>');`
- `3581d572` · ticket-status · `SES-349` · Close-out: SES-349 settles 'partial' · finalises Nov 20, 3:29 AM CST · `select public.reverse_decision('3581d572-69fc-4f52-b04d-050f1996b347','John','<why>');`
- `9cc9e824` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Nov 20, 3:29 AM CST · `select public.reverse_decision('9cc9e824-5d4a-401c-99fa-294064ffe45c','John','<why>');`
- `99773f18` · card-retire · — · Stale ship cards retired as receipts: 2 card(s) -- 2 on done, 0 on removed. · finalises Nov 20, 3:29 AM CST · `select public.reverse_decision('99773f18-096a-4fb0-b361-363338f2ca67','John','<why>');`
- `2f9077ef` · synthesis · — · Three cycles went silent at step 3e (attended build) — stalled 14h33m, reported once, not closed · finalises Nov 20, 3:45 AM CST · `select public.reverse_decision('2f9077ef-be99-4dbf-aa42-cb2eb3fe7a81','John','<why>');`
- `15aa38d3` · ticket-scope · `DAT-29` · cap ruling: waive DAT-29 for one build · finalises Nov 20, 3:59 AM CST · `select public.reverse_decision('15aa38d3-6fe2-4716-86f4-86a787d8abc2','John','<why>');`
- `6c12cdcd` · gate · — · Gate cards ruled by cycle a2976724-7700-4a13-8c27-5bfc23319e9f: 1 card(s) — {"john": 0, "accept": 0, "rework": 1, "reti… · finalises Nov 20, 4:51 AM CST · `select public.reverse_decision('6c12cdcd-f8fb-4384-82ac-a7519fd5fb29','John','<why>');`
- `873f444f` · requirement-check · `AGT-699` · Both board checks re-fingerprint an unchanged cluster every week, so a recurring board defect never matures · finalises Nov 20, 4:56 AM CST · `select public.reverse_decision('873f444f-4fcd-45d3-ba13-d9051e3d22c3','John','<why>');`
- `4a4d1139` · requirement-check · `AGT-700` · AGT-564 re-pointed five of its twenty-six live-census arms and closed delivered, so twenty-one still grade the world · finalises Nov 20, 4:56 AM CST · `select public.reverse_decision('4a4d1139-b67a-4d2b-8229-389a576280b9','John','<why>');`
- `3cd91bd7` · requirement-check · `AGT-701` · A regression arm's live read is capped at 1,000 rows, so a well-formed board reads as a defect · finalises Nov 20, 4:56 AM CST · `select public.reverse_decision('3cd91bd7-3d81-45bb-8fb6-131a5780f964','John','<why>');`
- `24c33ec5` · requirement-check · `AGT-702` · Three pick-order arms still grade leverage-first across the whole queue after a migration put project priority first · finalises Nov 20, 4:56 AM CST · `select public.reverse_decision('24c33ec5-f314-45ac-94cd-59f682aaffc3','John','<why>');`
- `693988f9` · requirement-check · `AGT-703` · Audit cleanup 2026-W47: 15 one-line fixes · finalises Nov 20, 4:56 AM CST · `select public.reverse_decision('693988f9-11a8-4ae3-8f27-8cb8c911e439','John','<why>');`
- `3ca378b0` · requirement-check · `AGT-704` · No lane can move to a cheaper current model, because the trial harness cannot grade the replay the move needs · finalises Nov 20, 4:56 AM CST · `select public.reverse_decision('3ca378b0-12d1-4e20-b2a9-96a0955b6186','John','<why>');`
- `91772136` · requirement-check · `AGT-706` · A re-grade's record names neither the verdict it supersedes nor the test that was red · finalises Nov 20, 4:56 AM CST · `select public.reverse_decision('91772136-f17c-467d-8718-521e62ee9a2c','John','<why>');`
- `15637567` · requirement-check · `AGT-710` · A routine that stops firing leaves no record, so the model watch has been silent for ten days unnoticed · finalises Nov 20, 4:56 AM CST · `select public.reverse_decision('15637567-ca99-4696-8546-5a670b3fb419','John','<why>');`
- `ffed4f7a` · requirement-check · `AGT-711` · Two delivered tickets ship less than their own text asks, and the remainder is recorded as a decision instead of a row · finalises Nov 20, 4:56 AM CST · `select public.reverse_decision('ffed4f7a-0757-41ee-aff5-842e8b53a6ab','John','<why>');`
- `658ecd13` · requirement-check · `AGT-705` · The live Auditor routine prompt and its canonical repo block disagree on the STEP 0 weekly meter stop · finalises Nov 20, 4:58 AM CST · `select public.reverse_decision('658ecd13-e4fc-4f20-bdd3-ed0187574368','John','<why>');`
- `4eb09123` · requirement-check · `AGT-707` · Two runbooks still describe the old finish line after AGT-291 shipped its sensor · finalises Nov 20, 4:58 AM CST · `select public.reverse_decision('4eb09123-fc54-4b6a-a910-dec921ba274c','John','<why>');`
- `011a9d16` · requirement-check · `AGT-708` · The redesign door has the cycle mark itself first, which makes the pickup skip the ticket it was told to take · finalises Nov 20, 4:58 AM CST · `select public.reverse_decision('011a9d16-8eae-4afe-8aee-42083c5c0f57','John','<why>');`
- `afe6951a` · requirement-check · `AGT-709` · The two capabilities every build cycle runs have no catalog entry, so their mandatory log row is refused · finalises Nov 20, 4:58 AM CST · `select public.reverse_decision('afe6951a-2423-4252-bcf6-63eb1df6706f','John','<why>');`
- `9640c601` · classification · — · board ordered: 60 ticket(s) given an automation_rank · finalises Nov 20, 5:49 AM CST · `select public.reverse_decision('9640c601-916f-4344-a16e-3d6e73d52513','John','<why>');`
- `9b0be882` · design-ruling · `AGT-136` · Open questions ruled by cycle 6441c3b6-d3bf-47aa-bd44-38fe92c5eb57: 1 question(s) — {"no": 0, "yes": 0, "john": 1, "wit… · finalises Nov 20, 6:02 AM CST · `select public.reverse_decision('9b0be882-88a9-4b9a-b549-88507fc7556e','John','<why>');`
- `88d59695` · filing · — · Audit review 2026-W47: 10 findings → 0 tickets, 0 not-a-defect, 1 carried, 0 escalated · finalises Nov 20, 6:12 AM CST · `select public.reverse_decision('88d59695-38e4-4141-a6b8-aeaddf55cde3','John','<why>');`
- `194d79c5` · ticket-status · `AGT-317` · Close-out: AGT-317 settles 'delivered' · finalises Nov 20, 7:18 AM CST · `select public.reverse_decision('194d79c5-e669-4e85-8e1d-f28f75592791','John','<why>');`
- `98c40049` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Nov 20, 7:18 AM CST · `select public.reverse_decision('98c40049-1d2d-4295-96ed-97ed8e8fb822','John','<why>');`
- `cbd1f5a4` · ship · `AGT-317` · AGT-317 shipped at v7.0.1049 (e1b45ccdc6a339ae2d8f1066093d8cbb001dcb3b) on verdict a59e2df3-da1c-4e93-91bf-58570d2d6f44 · finalises Nov 20, 7:18 AM CST · `select public.reverse_decision('cbd1f5a4-bc4b-4507-a295-33881cd8d45c','John','<why>');`
- `8e8bb437` · concurrency · `AGT-317` · Close-out: AGT-317's claim released by this cycle · finalises Nov 20, 7:23 AM CST · `select public.reverse_decision('8e8bb437-c6be-4a84-ae33-b3b53ef3ff0c','John','<why>');`
- `706a8f2c` · design-ruling · `AGT-136` · Open questions ruled by cycle 29ddc7d2-d65a-4745-8f0b-3b46842ed518: 1 question(s) — {"no": 0, "yes": 0, "john": 1, "wit… · finalises Nov 20, 7:29 AM CST · `select public.reverse_decision('706a8f2c-eced-4ab0-8447-578918c20cfe','John','<why>');`
- `f96ed57c` · filing · — · Audit review 2026-W47: 6 findings → 4 tickets, 0 not-a-defect, 1 carried, 0 escalated · finalises Nov 20, 7:37 AM CST · `select public.reverse_decision('f96ed57c-71dc-48da-a7ee-24d46bb1260a','John','<why>');`
- `21f735bf` · concurrency · `AGT-637` · Close-out: AGT-637's claim released by this cycle · finalises Nov 20, 8:23 AM CST · `select public.reverse_decision('21f735bf-04de-441e-98d1-7e9cf6aec517','John','<why>');`
- `a04d4d5d` · filing · — · Audit review 2026-W47: 4 findings → 0 tickets, 0 not-a-defect, 1 carried, 0 escalated · finalises Nov 20, 8:41 AM CST · `select public.reverse_decision('a04d4d5d-7f47-46af-a6f6-00430c669998','John','<why>');`
- `e1858f98` · gate · — · Gate cards ruled by cycle 34f63045-3277-4273-ba0f-64723d97b767: 1 card(s) — {"john": 0, "accept": 0, "rework": 1, "reti… · finalises Nov 20, 8:53 AM CST · `select public.reverse_decision('e1858f98-89c2-4f74-9133-e2c5b52de571','John','<why>');`
- `56cea3ed` · synthesis · — · Stall tripwire: cycle 2555f5f1 went quiet 53 minutes ago at "step 3e — verifier approve; QA spot check PASS" · finalises Nov 20, 10:49 AM CST · `select public.reverse_decision('56cea3ed-3feb-4714-8dcc-0cefe372383a','John','<why>');`
- `ba5e65a5` · ticket-status · `AGT-637` · Close-out: AGT-637 settles 'delivered' · finalises Nov 20, 10:55 AM CST · `select public.reverse_decision('ba5e65a5-bfcb-4f54-975f-c891edee45cc','John','<why>');`
- `f68fecdf` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Nov 20, 10:55 AM CST · `select public.reverse_decision('f68fecdf-e0fd-48c6-b9d7-fec7fcfa2a30','John','<why>');`
- `a2a541e1` · card-retire · — · Stale ship cards retired as receipts: 1 card(s) -- 1 on done, 0 on removed. · finalises Nov 20, 10:55 AM CST · `select public.reverse_decision('a2a541e1-2e6e-44be-af3b-515bf50990bd','John','<why>');`
- `e42b0548` · ship · `AGT-637` · AGT-637 shipped at v7.0.1050 (a00ae893a74db14ff111134508d55531c42f68e6) on verdict 08dbf375-d3d0-407a-8294-4ab88f767ad3 · finalises Nov 20, 10:56 AM CST · `select public.reverse_decision('e42b0548-9707-40d3-a259-b2b787c9c500','John','<why>');`
- `4ef9cab0` · concurrency · `AGT-637` · Close-out: AGT-637's claim released by this cycle · finalises Nov 20, 10:56 AM CST · `select public.reverse_decision('4ef9cab0-d45e-46d0-ac41-e8493bd665c1','John','<why>');`
- `f5b9cb33` · design-ruling · `AGT-136` · Open questions ruled by cycle 785d7b9b-d11d-45a9-b155-5614ef7f538c: 1 question(s) — {"no": 0, "yes": 0, "john": 1, "wit… · finalises Nov 20, 11:20 AM CST · `select public.reverse_decision('f5b9cb33-1cd0-4e9f-9198-870e8676f220','John','<why>');`
- `0ed3528d` · filing · — · Audit review 2026-W47: 16 findings → 1 tickets, 2 not-a-defect, 1 carried, 0 escalated · finalises Nov 20, 11:35 AM CST · `select public.reverse_decision('0ed3528d-0fd8-49f1-835a-c1c05dd6d1ed','John','<why>');`
- `f229084b` · john-ruling · — · John named Laura (CW-01, she/her), a personal-lane Career Writer for LinkedIn & resume: walkthrough Q1-Q5 approved 2026… · finalises Nov 20, 4:55 PM CST · `select public.reverse_decision('f229084b-37f4-4708-bbb0-7bba47d5ad49','John','<why>');`
- `ed11cb7b` · requirement-check · `AGT-721` · Laura (CW-01) and her store: writing_records table and the agent seed, switched off · finalises Nov 20, 4:58 PM CST · `select public.reverse_decision('ed11cb7b-b72b-44ba-89f9-240b913dcf8a','John','<why>');`
- `8561539c` · requirement-check · `AGT-722` · Laura's call path: writing store in personal-agent.js, the write guard, the career-writer runbook with three routine bl… · finalises Nov 20, 4:58 PM CST · `select public.reverse_decision('8561539c-5b65-4ae3-a3a2-628fa9d2274a','John','<why>');`
- `19b806ab` · requirement-check · `AGT-723` · Laura's first monthly trade-press watch and the Career Desk page (attended) · finalises Nov 20, 4:58 PM CST · `select public.reverse_decision('19b806ab-2659-47b6-95da-4ebeb95b6010','John','<why>');`
- `28639e62` · requirement-check · `AGT-724` · Laura's blind tryout (attended): three writing tasks against plain Claude with the same items · finalises Nov 20, 4:58 PM CST · `select public.reverse_decision('28639e62-44dd-4cdf-ab90-2fbb3adc8677','John','<why>');`
- `92b3ef1b` · john-ruling · `AGT-724` · John hired Laura (CW-01) after her blind tryout ("Yes, hire Laura", 2026-11-17): agents.is_active = true and her three… · finalises Nov 20, 7:07 PM CST · `select public.reverse_decision('92b3ef1b-a59d-48df-819d-71b741e9c955','John','<why>');`
- `cc8f011b` · requirement-check · `AGT-725` · Laura always reads the confirmed facts, the current LinkedIn text and the master resume in full, outside the ranked Lib… · finalises Nov 20, 7:15 PM CST · `select public.reverse_decision('cc8f011b-0267-4b24-b5a7-047ac0efce66','John','<why>');`
- `3138b758` · classification · — · board ordered: 60 ticket(s) given an automation_rank · finalises Nov 21, 1:48 AM CST · `select public.reverse_decision('3138b758-2fff-4df5-a22d-bbfe1ff36a8e','John','<why>');`
- `e4e37a32` · learning · `SES-159` · class-loop learning claims for P3 - Investor Value · finalises Nov 21, 2:06 AM CST · `select public.reverse_decision('e4e37a32-f4c8-44b8-aaa6-4e0af1f40252','John','<why>');`
- `952f9c58` · design-ruling · `AGT-136` · Open questions ruled by cycle c162d8c3-4d64-4bfd-a1d7-dc08cf362825: 1 question(s) — {"no": 0, "yes": 0, "john": 1, "wit… · finalises Nov 21, 2:09 AM CST · `select public.reverse_decision('952f9c58-2325-48fc-a943-beb0b5a5a057','John','<why>');`
- `7f1dc43f` · filing · — · Audit review 2026-W47: 14 findings → 5 tickets, 1 not-a-defect, 1 carried, 0 escalated · finalises Nov 21, 2:37 AM CST · `select public.reverse_decision('7f1dc43f-9c05-4652-9ca5-559e9e1ee971','John','<why>');`
- `cb488f5d` · gate · — · Gate cards ruled by cycle f61c82ab-6383-4e4d-a83d-5c4992ea447e: 1 card(s) — {"john": 1, "accept": 0, "rework": 0, "reti… · finalises Nov 21, 2:57 AM CST · `select public.reverse_decision('cb488f5d-a701-447e-a6b2-8e4ba079f55e','John','<why>');`
- `c268993c` · ticket-status · `AGT-673` · Close-out: AGT-673 settles 'delivered' · finalises Nov 21, 4:19 AM CST · `select public.reverse_decision('c268993c-e8a2-4ed3-848a-06882d193a2c','John','<why>');`
- `31b1f7df` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Nov 21, 4:19 AM CST · `select public.reverse_decision('31b1f7df-6a55-457a-bca1-167566b810e7','John','<why>');`
- `a3c2f4ad` · card-retire · — · Stale ship cards retired as receipts: 1 card(s) -- 1 on done, 0 on removed. · finalises Nov 21, 4:19 AM CST · `select public.reverse_decision('a3c2f4ad-c165-4ba3-8525-a4fd7a8e0f33','John','<why>');`
- `17f41c0c` · synthesis · — · A peer went silent at the very step this cycle just fixed, and CI's red on this ship was disproved as this ship's fault. · finalises Nov 21, 4:22 AM CST · `select public.reverse_decision('17f41c0c-8826-4a2c-975c-5e626fede133','John','<why>');`
- `3d10f392` · requirement-check · `AGT-728` · Two arms of flow-nothing-produced can never clear: 'done' is counted from a phrase no writer writes, and a delivered dr… · finalises Nov 21, 4:53 AM CST · `select public.reverse_decision('3d10f392-2e0d-408e-9a79-3bd751ee8651','John','<why>');`
- `68d34239` · requirement-check · `AGT-716` · A cycle spends 55 tool calls and 422 seconds before it claims its ticket: steps 1-5 re-derive by hand what one call alr… · finalises Nov 21, 4:56 AM CST · `select public.reverse_decision('68d34239-5194-4e7d-a614-80bbd7e92462','John','<why>');`
- `6386699c` · requirement-check · `AGT-717` · No stored number says what a run's output tokens were: the sweep keeps the total and throws the text away · finalises Nov 21, 4:56 AM CST · `select public.reverse_decision('6386699c-6cb9-43ab-af94-29fb3009a594','John','<why>');`
- `fa800062` · requirement-check · `AGT-718` · A finding handed through a harvest reaches nothing: no step between kickoff and close-out checks that it was filed into… · finalises Nov 21, 4:56 AM CST · `select public.reverse_decision('fa800062-bdbd-4d74-add8-871bfdbd541b','John','<why>');`
- `bbf078f7` · requirement-check · `AGT-719` · ai_activity_log names the lane's model, not the model that served the turn: 248 rows say claude-fable-5-1 and no stored… · finalises Nov 21, 4:56 AM CST · `select public.reverse_decision('bbf078f7-f31a-476c-840a-9d32fa3f96ac','John','<why>');`
- `81f9e10f` · requirement-check · `AGT-720` · Step 7's kickoff check supersedes an uncredentialed BASELINE block but refuses a credentialed one that is merely narrow… · finalises Nov 21, 4:56 AM CST · `select public.reverse_decision('81f9e10f-9bc1-4b95-9c41-8e01a2359eba','John','<why>');`
- `9dea592c` · requirement-check · `AGT-732` · Time-boxed trial: run one capability of one agent on an off-the-shelf agent harness and measure it against the runner · finalises Nov 21, 4:56 AM CST · `select public.reverse_decision('9dea592c-b5b8-4b4a-afed-4e1f16967daa','John','<why>');`
- `26196513` · fit-stamp · `AGT-729` · AGT-729 fits no active project (charters 5152dbd35fb269f5399602544fc90338) · finalises Nov 21, 4:56 AM CST · `select public.reverse_decision('26196513-eced-4f5e-9078-c59c5dc6b5b2','John','<why>');`
- `458b29ba` · fit-stamp · `AGT-730` · AGT-730 fits no active project (charters 5152dbd35fb269f5399602544fc90338) · finalises Nov 21, 4:56 AM CST · `select public.reverse_decision('458b29ba-8cf4-4d89-8296-8b90d9885685','John','<why>');`
- `e8ead7b3` · fit-stamp · `AGT-731` · AGT-731 fits no active project (charters 5152dbd35fb269f5399602544fc90338) · finalises Nov 21, 4:56 AM CST · `select public.reverse_decision('e8ead7b3-a9ad-4386-8c75-5a5e214c3e4a','John','<why>');`
- `e8ca1750` · placement · `AGT-731` · One agent, many clients: nothing partitions an owner's agent by client, and the Library's by-id read drops the tenant f… · finalises Nov 21, 4:56 AM CST · `select public.reverse_decision('e8ca1750-a03d-4088-a1ab-97ccb8b1ec0d','John','<why>');`
- `084eac64` · synthesis · — · victoria-daily-20261114: 25 new waiting tickets named, 23 put to a turn across 3 lists, 14 passes / 9 no-fit / 0 turned… · finalises Nov 21, 5:09 AM CST · `select public.reverse_decision('084eac64-6b21-4160-910e-7a7ed4b718f9','John','<why>');`
- `fb18b38b` · synthesis · — · Three defects in how this platform grades its own work, each hit live this cycle and none of them AGT-367's. · finalises Nov 21, 5:14 AM CST · `select public.reverse_decision('fb18b38b-68a7-462c-991b-3fec07383f60','John','<why>');`
- `a75484f1` · ticket-status · `AGT-680` · Close-out: AGT-680 settles 'delivered' · finalises Nov 21, 5:40 AM CST · `select public.reverse_decision('a75484f1-f6f1-4501-9987-810444c6e3db','John','<why>');`
- `a90e5c35` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Nov 21, 5:40 AM CST · `select public.reverse_decision('a90e5c35-db8a-41ec-a3e6-76e8f386b6ea','John','<why>');`
- `5b439571` · concurrency · `AGT-680` · Close-out: AGT-680's claim released by this cycle · finalises Nov 21, 5:46 AM CST · `select public.reverse_decision('5b439571-413f-4cdd-81b8-bf4058a17942','John','<why>');`
- `74164d06` · ticket-status · `AGT-625` · Close-out: AGT-625 settles 'delivered' · finalises Nov 21, 6:16 AM CST · `select public.reverse_decision('74164d06-3856-4ba5-b2fb-afa1ef44b887','John','<why>');`
- `1c98ea65` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Nov 21, 6:16 AM CST · `select public.reverse_decision('1c98ea65-17ba-4db7-8530-6ba68f61bfb0','John','<why>');`
- `453c5af3` · concurrency · `AGT-625` · Close-out: AGT-625's claim released by this cycle · finalises Nov 21, 6:19 AM CST · `select public.reverse_decision('453c5af3-9e28-45e5-a850-7a7e9708ecc0','John','<why>');`
- `b94f8368` · ship · `SES-401` · SES-401 shipped at v7.0.497 (ea337053d734c387bb2670db31034f6e8b45ba6f) on verdict f85470f8-20f0-41ef-a131-9bb69a28cfe0 · finalises Nov 21, 6:25 AM CST · `select public.reverse_decision('b94f8368-beae-4272-b005-a5d8ccab8fff','John','<why>');`
- `7108a3ad` · learning · `SES-159` · class-loop learning claims for P2 - Inventive · finalises Nov 22, 2:10 AM CST · `select public.reverse_decision('7108a3ad-7565-436c-866f-fd050e00bf16','John','<why>');`
- `db01fa65` · synthesis · — · AGT-017 build: the Builder's one in-span comment replacement ruled fix-now, not a capture · finalises Nov 22, 2:26 AM CST · `select public.reverse_decision('db01fa65-ef16-4b24-a880-ca7ff2b30a9a','John','<why>');`
- `6fac5a3b` · classification · — · board ordered: 60 ticket(s) given an automation_rank · finalises Nov 22, 3:48 AM CST · `select public.reverse_decision('6fac5a3b-8d51-446b-815c-d2a90390745f','John','<why>');`
- `e41535d2` · removal-proposal · `ZFIX-64653` · ZFIX-64653 removal proposed: Premise is empty and names no work; title 'ses-424g dependent', null type and a filed_at o… · finalises Nov 22, 3:50 AM CST · `select public.reverse_decision('e41535d2-2e66-405d-a7e6-1201846024d5','John','<why>');`
- `1947658a` · ticket-status · `AGT-522` · Close-out: AGT-522 settles 'partial' · finalises Nov 22, 4:09 AM CST · `select public.reverse_decision('1947658a-0568-4158-a5c6-2561beabf50b','John','<why>');`
- `536aed6f` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Nov 22, 4:09 AM CST · `select public.reverse_decision('536aed6f-e336-4e1a-b32a-e39559ba2460','John','<why>');`
- `6ec0fe88` · card-retire · — · Stale ship cards retired as receipts: 1 card(s) -- 1 on done, 0 on removed. · finalises Nov 22, 4:09 AM CST · `select public.reverse_decision('6ec0fe88-327d-4c5d-9cb1-9e1df87c5d8e','John','<why>');`
- `baf6e4e0` · ticket-scope · `AGT-471` · cap ruling: waive AGT-471 for one build · finalises Nov 22, 4:54 AM CST · `select public.reverse_decision('baf6e4e0-2647-454c-8b60-1d66d3b89e28','John','<why>');`
- `850bf503` · synthesis · — · dev-mgr-findings (--new-only): 3 new waiting tickets graded — AGT-690 (4), AGT-689 (2), AGT-691 (2); 0 turned down, 0 m… · finalises Nov 22, 4:55 AM CST · `select public.reverse_decision('850bf503-c81b-49a3-8b10-36c807209644','John','<why>');`
- `df77281c` · agent-row · `AGT-734` · Created agent Paul (paul-dy86jo) active and public, with two model-running capabilities, under John's 2026-11-19 ruling · finalises Nov 22, 3:24 PM CST · `select public.reverse_decision('df77281c-217f-4aa6-ad0f-afb4828abb2b','John','<why>');`
- `9838d8d6` · rollback · — · Auto-rollback held: ci-red on 369060e was not reverted (card-only) · finalises Nov 22, 5:14 PM CST · `select public.reverse_decision('9838d8d6-b104-44c5-85da-14b355cf0ca0','John','<why>');`
- `5a7a0c49` · rollback · — · Auto-rollback held: ci-red on 369060e was not reverted (card-only) · finalises Nov 22, 5:16 PM CST · `select public.reverse_decision('5a7a0c49-c1b3-4676-9762-d58d69b0f079','John','<why>');`
- `c3401798` · agent-row · `AGT-738` · Added three TRIAL match capabilities to Paul (paul-dy86jo) for John's matching test; paul-match-contracts untouched · finalises Nov 22, 5:18 PM CST · `select public.reverse_decision('c3401798-d9c4-459b-9fde-c5ba7b602865','John','<why>');`
- `fc70736d` · leverage · — · AGT-238 leverage first: AGT-552, AGT-328, AGT-331, AGT-617, AGT-620, AGT-672 marked as leverage -- outranks project ord… · finalises Nov 22, 5:20 PM CST · `select public.reverse_decision('fc70736d-2c04-40e3-a868-14cde106be30','John','<why>');`
- `26d05021` · concurrency · — · AGT-238 concurrency from the corpus: 2 project(s) executing in the order dev-manager-capabilities, tooling, pausing gov… · finalises Nov 22, 5:20 PM CST · `select public.reverse_decision('26d05021-4192-4abc-b110-143bdfd61a3d','John','<why>');`
- `2f929760` · agent-row · `AGT-739` · Added permanent capability paul-match-contracts-fit to Paul and removed trial capabilities paul-match-trial-mid and pau… · finalises Nov 22, 5:24 PM CST · `select public.reverse_decision('2f929760-c3e7-459b-95be-96e5a5a36b30','John','<why>');`
- `170443c6` · agent-row · `AGT-739` · Removed the last AGT-738 trial capability paul-match-fit-trial-mid after paul-match-contracts-fit was proven · finalises Nov 22, 5:24 PM CST · `select public.reverse_decision('170443c6-1f10-477b-b7dc-c97febc3e4c2','John','<why>');`
- `85c46c0a` · synthesis · — · victoria-daily 2026-11-16: new_waiting arm — graded the 5 new dev-mgr-findings tickets (5 passes, 0 turned down), homed… · finalises Nov 23, 4:56 AM CST · `select public.reverse_decision('85c46c0a-9731-499f-a230-3f95fe9c87f2','John','<why>');`
- `9b3d68c6` · synthesis · — · Daily check: 13 new waiting tickets graded across auditor-findings (9) and dev-mgr-findings (4), 0 turned down, 0 moved… · finalises Nov 24, 4:59 AM CST · `select public.reverse_decision('9b3d68c6-721f-412a-90ef-1439a6ab99b8','John','<why>');`
- `ebfce315` · synthesis · — · No list door run: both executing projects were already above the floor of ten countable tickets scored 3 or greater, so… · finalises Nov 24, 5:06 AM CST · `select public.reverse_decision('ebfce315-13d7-4c62-8c15-370e20ec5039','John','<why>');`
- `74f72358` · synthesis · — · Victoria daily 2026-11-18: graded all 10 new waiting tickets across auditor-findings (1) and dev-mgr-findings (9); 7 pa… · finalises Nov 25, 4:57 AM CST · `select public.reverse_decision('74f72358-54b5-4a5e-9cbd-d2593786663e','John','<why>');`
- `b5ddbc6b` · gated-before-build · `AGT-160` · AGT-160 redesign attempt 1 designed and committed, build gated: it would answer John's own unanswered card 98137400 by… · finalises Nov 27, 11:09 AM CST · `select public.reverse_decision('b5ddbc6b-b2f4-43e3-a7aa-93d8fb791106','John','<why>');`
- `517b6ebe` · routine · — · Created and enabled routine victoria-daily-check (trig_01M1rsFP6HHYxELMr8JdhDg5), daily 10:50Z = 4:50 AM CST, under Joh… · finalises Dec 3, 8:55 AM CST · `select public.reverse_decision('517b6ebe-b75f-437d-b285-9c9770d1c9c1','John','<why>');`
- `cca362ab` · synthesis · — · AGT-610 attempt 1 refused by a consent prompt on apply_migration — the clause-5 refusal data, recorded here because the… · finalises Dec 7, 6:29 AM CST · `select public.reverse_decision('cca362ab-69a4-4b30-85e1-b2312ff7d23d','John','<why>');`

**1000 final this week, 250 reversed this week** — *this week* is a **rolling 7 days** back from the stamp, not a calendar week and not a Friday-07:00Z reset: no such weekly-reset helper exists in this file or anywhere in `scripts/`, so a rolling window is what is used and is labelled as one. A reversal is the strongest negative signal the ladder takes (`M6-07`), so the second number is the one to read first.

**Decided for you** — *as of 2026-11-19 23:29Z (Nov 19, 5:29 PM CST).* What the runner DECIDED on your behalf, by CST day (`governance_rules.MANAGER-DECIDES-BY-DEFAULT`: *a daily list of what was decided, not questions*), with the questions that reached you anyway counted beside it — target zero. Not the `Open decisions` group above: that one is the undo list and drops a decision the moment it finalises; this one is the record of the day and keeps it. **71 decided on 2026-11-19**; **2 question(s) reached you in the last 7 days — target zero**; 2 still open.

| CST day | decided | reversed | questions to you |
|---|---:|---:|---:|
| `2026-11-19` | 71 | 27 | 0 |
| `2026-11-18` | 117 | 45 | 1 |
| `2026-11-17` | 119 | 36 | 0 |
| `2026-11-16` | 66 | 13 | 0 |
| `2026-11-15` | 79 | 18 | 0 |
| `2026-11-14` | 96 | 18 | 0 |
| `2026-11-13` | 222 | 93 | 1 |

- *2 decision(s) were read but fall outside the table:* the read window is a rolling 7×24h back from the stamp, the table is the seven CST days ending `2026-11-19`, and any render after CST midnight sees the gap between them. They are in no column above.

**The 71 decided on 2026-11-19** — newest first.

- `8aba70a3` · john-ruling · — · Limits lifted until midnight CT (John 2026-11-19 ~5:24 PM CT: "lift everything until 12 am, then set everything back to… · final
- `170443c6` · agent-row · `AGT-739` · Removed the last AGT-738 trial capability paul-match-fit-trial-mid after paul-match-contracts-fit was proven · open
- `2f929760` · agent-row · `AGT-739` · Added permanent capability paul-match-contracts-fit to Paul and removed trial capabilities paul-match-trial-mid and pau… · open
- `26d05021` · concurrency · — · AGT-238 concurrency from the corpus: 2 project(s) executing in the order dev-manager-capabilities, tooling, pausing gov… · open
- `fc70736d` · leverage · — · AGT-238 leverage first: AGT-552, AGT-328, AGT-331, AGT-617, AGT-620, AGT-672 marked as leverage -- outranks project ord… · open
- `c3401798` · agent-row · `AGT-738` · Added three TRIAL match capabilities to Paul (paul-dy86jo) for John's matching test; paul-match-contracts untouched · open
- `5a7a0c49` · rollback · — · Auto-rollback held: ci-red on 369060e was not reverted (card-only) · open
- `9838d8d6` · rollback · — · Auto-rollback held: ci-red on 369060e was not reverted (card-only) · open
- `8a615e35` · john-ruling · — · max_lanes 1 -> 4 (John 2026-11-19 ~5:07 PM CT: "kick off all the routines that generally wait until there is room. Allo… · final
- `df77281c` · agent-row · `AGT-734` · Created agent Paul (paul-dy86jo) active and public, with two model-running capabilities, under John's 2026-11-19 ruling · open
- `baf6e4e0` · ticket-scope · `AGT-471` · cap ruling: waive AGT-471 for one build · open
- `a90010c7` · reversal · `ZAGTVL-1` · reversal of requirement-check decision 0acfb3a0-50d7-47c4-9e27-108d98b6dd17 -- applied: 1 restored, 0 restored-unverifi… · final
- `741f54e0` · reversal · `ZAGTVL-1` · reversal of ticket-validation decision 28321c64-a5bc-4322-9912-9f301a113d3b -- applied: 1 restored, 0 restored-unverifi… · final
- `b8b7e365` · reversal · `ZAGTVL-1` · reversal of placement decision dc4a40fa-268f-4817-b0cb-68c0bf8ec919 -- applied: 1 restored, 0 restored-unverified, 0 re… · final
- `9eaa129e` · reversal · `ZAGTVL-2` · reversal of requirement-check decision b5b7850e-3e99-454c-b04c-90e047d864fb -- applied: 1 restored, 0 restored-unverifi… · final
- `179b3bed` · reversal · `ZAGTVL-2` · reversal of ticket-validation decision 5c15e675-9055-4fa8-bf62-bcbf2acc5aa6 -- applied: 1 restored, 0 restored-unverifi… · final
- `fefb1fa2` · reversal · `ZAGTVL-3` · reversal of ticket-validation decision d517046d-f53b-4163-9ef7-9f6dbf8e3222 -- applied: 1 restored, 0 restored-unverifi… · final
- `d517046d` · ticket-validation · `ZAGTVL-3` · ZAGTVL-3 validated: not-real · reversed
- `5c15e675` · ticket-validation · `ZAGTVL-2` · ZAGTVL-2 validated: revised · reversed
- `b5b7850e` · requirement-check · `ZAGTVL-2` · AGT-493 validation probe 2 · reversed
- `dc4a40fa` · placement · `ZAGTVL-1` · AGT-493 validation probe 1 · reversed
- `28321c64` · ticket-validation · `ZAGTVL-1` · ZAGTVL-1 validated: confirmed · reversed
- `0acfb3a0` · requirement-check · `ZAGTVL-1` · AGT-493 validation probe 1 · reversed
- `1b5de89b` · reversal · `ZAGTPK-1` · reversal of requirement-check decision 679880f8-f149-4797-8ad7-c909256c3061 -- applied: 1 restored, 0 restored-unverifi… · final
- `679880f8` · requirement-check · `ZAGTPK-1` · AGT-490 parked-home probe 1 · reversed
- …and 46 more decided that day · `select id, kind, backlog_id, summary, status from public.runner_decisions where (decided_at at time zone 'America/Chicago')::date = '2026-11-19' order by decided_at desc;`

**Judgment classes** — *as of 2026-11-19 23:29Z (Nov 19, 5:29 PM CST).* What the corpus currently holds per pull test, live from `public.judgment_class_census` (`SES-84`; the same view `SES-159` reads). Ratification is a standing metric (John, 2026-08-23: a class is never finished being learned), never a finish line.

| class | ratified | proposed | rejected | total |
|---|---:|---:|---:|---:|
| `P1 - Improves John's Skills` | 7 | 31 | 6 | 44 |
| `P2 - Inventive` | 0 | 151 | 16 | 167 |
| `P3 - Investor Value` | 0 | 148 | 7 | 155 |
| `P4 - New Customers` | 1 | 37 | 3 | 41 |
| `neutral` | 0 | 87 | 30 | 117 |

- Newest proposed root claim for P1: *no proposed root claim*.
- Newest proposed root claim for P2: `VC-SYN-002` — Inventive features are the least-tested product goal because the bar John set — something competitors cannot easily copy — he has never applied to a real featu…
- Newest proposed root claim for P3: `VC-SYN-001` — Investor value is the least-defined product goal because nobody has yet said what an investor would check. The drafts agree on one reading: the buyer is a skep…
- Newest proposed root claim for P4: `VC-ROOT-004` — New features that win new customers. The bar is buy-pull — functionality that makes a customer say "I have to buy this." Administrative capability (accounts, b…

**John-model** — *as of 2026-11-19 23:29Z (Nov 19, 5:29 PM CST).* How often a decision that leaned on a standing pattern of John's stood unreversed through its window, live from `public.john_model_signal` (`SES-004`; the criteria are `public.decision_patterns`, exported from `docs/JOHN-DECISION-PATTERNS.md`). A rate binds only from 30 finalised-or-reversed decisions (M7 gate, ruling iii).

- **99.6% agreement** over 1925 finalised-or-reversed decisions (1917 finalised unreversed, 8 reversed; 49 still open, 1974 citing in total). A reversal is the strongest negative signal the ladder takes, so the second number is the one to read first.

| criterion | citing | final unreversed | reversed | open | rate |
|---|---:|---:|---:|---:|---:|
| `pattern:0` No standing pattern applied -- new judgment. | 996 | 975 | 2 | 19 | 99.8% |
| `pattern:9` Never spend a model call where a deterministic mechanism serves. | 337 | 319 | 1 | 17 | 99.7% |
| `pattern:14` When two code paths compute the same thing, build one shared core they both cal… | 277 | 270 | 0 | 7 | 100% |
| `pattern:162` A check grades the change, never the live world. | 211 | 208 | 1 | 2 | 99.5% |
| `pattern:167` The staff decide (fix now / later with a home / drop with evidence); John keeps… | 210 | 203 | 1 | 6 | 99.5% |

- A per-pattern `—` is not a zero: that criterion has not reached 30 finalised-or-reversed citations of its own, so it carries counts and no rate.

**Invention in use** — *as of 2026-11-19 23:29Z (Nov 19, 5:29 PM CST).* Criterion 7 (`docs/SELFBUILD-CHARTER.md`): at least one platform-originated feature — the Bench Report Card judge (`LOG-143`) — is measurably used by real visitors, live from `public.report_card_usage`. Counts only, never a rate.

- **7d:** 0 judge runs, 0 by real visitors (0 distinct).
- **30d:** 0 judge runs, 0 by real visitors (0 distinct).
- **all:** 3 judge runs, 0 by real visitors (0 distinct).

- *no real-visitor use yet.*

**Board by served class** — *as of 2026-11-19 23:29Z (Nov 19, 5:29 PM CST).* Which class each open ticket SERVES under the served-class test (`VC-MISSION-033`), ruled by The Prioritizer's `classify-ticket` and stored on `backlog_items.supports_class` — a ticket's own class is a different question and is not restated here.

| serves | open tickets |
|---|---:|
| `P1 - Improves John's Skills` | 56 |
| `P2 - Inventive` | 9 |
| `P3 - Investor Value` | 3 |
| `P4 - New Customers` | 1 |
| `P7 - Agent Creation` | 1 |
| *serves none* | 577 |

- *Negative ranks are John's own automation queue, seeded to sort ahead of anything assigned later (`SES-86`). The nightly re-rank writes 1..N and therefore sits below them — intended precedence, not a re-rank that failed.*

- **Top 5 by `automation_rank`:**
  -35. `SES-288` — A schema-range red can never be auto-reverted: one refused down-migration disables rollba… *(serves none)*
  1. `AGT-498` — You retype the same morning ask every day because the run-report-and-queue view has no sa… *(serves none)*
  1. `AGT-340` — A private agent's MCP address answers "what were you taught about X?" lookups and logs th… *(serves none)*
  1. `AGT-439` — Three market objections and the acts-or-answers question are answered with nobody: the mi… *(serves none)*
  1. `AGT-308` — A ticket gated at step 5 with no card and no design_status stays at queue #1 and is re-pi… *(serves none)*

- Last scheduled re-rank: Nov 19, 3:46 AM CST.

**Governance agents, last 7 days** — *as of 2026-11-19 23:29Z (Nov 19, 5:29 PM CST).* Whether the platform's own agents (`agents.lane = 'governance'`) are doing the development work, live from `public.governance_agent_usage` and `public.ship_handoff_census` (`SES-360`). A **rolling 7 days** back from render time, like the decision counts above. Counts and token sums only, never a rate.

| role | source | calls | input tokens | output tokens |
|---|---|---:|---:|---:|
| Governance — Development Manager | `session` | 21 (21 untokened) | 0 | 0 |
| Governance — Researcher | `session` | 1 (1 untokened) | 0 | 0 |
| Governance — Prioritizer | `session` | 15 (8 untokened) | 0 | 0 |
| Governance — Prioritizer | *unlabelled* | 27 (27 untokened) | 0 | 0 |
| Governance — Designer | `session` | 60 (58 untokened) | 197492 | 342402 |
| Governance — Builder | `session` | 19 (19 untokened) | 0 | 0 |
| Governance — Verifier | `session` | 1 (1 untokened) | 0 | 0 |
| Governance — Auditor | `session` | 18 (5 untokened) | 138017 | 40745 |
| Governance — Ticket Owner | `session` | 7 | 0 | 0 |
| Governance — Architect | `session` | 18 (17 untokened) | 278321 | 0 |

- **Ships with all four handoff rows: 16 of 28** ships in the window (`SES-345`'s four: `automation_rank`, `kickoff_link`, a per-ticket push sha, a verdict row). Missing per leg: kickoff_link 0, per-ticket sha 1, automation_rank 12, verdict 0.
- *unlabelled* is a NULL `call_source` — the pre-attribution unknown, never read as automation (`LOG-128`); `untokened` rows carry no token counts at all (deterministic handler rows), so a large call count beside a small token sum is that, not a cheap model.

**Auditor's ledger** — *as of 2026-11-19 23:29Z (Nov 19, 5:29 PM CST).* What `public.audit_findings` (`AGT-70`) holds and what has left it for the board. Counts only, never a rate. Latest week 2026-W47: **199 findings (28 open · 0 resolved · 13 not a defect)** — **0 ruled** open findings (a ruled, open, `high` row is what `tripwire-to-backlog.js --from-ledger` files, at most 3 per ISO week); **0 filed** to the board from the ledger so far (`source_file = 'audit-ledger'`).

| fingerprint | kind | confidence | fact | ruled |
|---|---|---|---|---|
| `147a90b8209a0105` | contradiction | high | The live briefing page's build date is stated two ways in one record: PAGE_BUIL… | — |
| `1674a31c5714720e` | other | high | The procurement lane cannot be entered without a login and an upload, and the a… | — |
| `247ac4ce3f4affde` | contradiction | high | tests/regression/agt-642-blocked-first.test.mjs ends with selfRun(import.meta.u… | — |
| `3a2e629ddafa8dac` | other | high | Ticket Owner check type-off-taxonomy holds open judgment rows a capability must… | — |
| `53bde7329f0f46de8339af1fbda3e8bc` | other | high | Measured 2026-11-19 against the live Anthropic API. MODELS.SONNET is claude-son… | — |
| `64cbf82da79fe010` | contradiction | high | A chained continuation cannot boot while max_lanes is 1, because the pre-boot g… | — |
| `7909fb35ed1cb194` | other | high | No reference a buyer can check: one client-shareable record of one real run is… | — |
| `7c91f56e4b72a22a` | other | high | build needed a fact the kickoff did not carry | — |
| `7fbbc8422ad01916` | stale-or-irrelevant | high | docs/design/agt-570-own-row-exemption.sql claims it was applied by a cycle, and… | — |
| `7fe82f421577b215` | other | high | Per-answer cost is a missing unit, not a broken measurement: the session lane p… | — |
| `886f5ba98d23aede` | contradiction | high | scripts/redesign-pickup.js:267 prescribes the Designer's mandatory Layer-3 log… | — |
| `8e28674045c808fb4f38ceaab57b050b` | other | high | A caller key's spend cap is a lifetime total, not a monthly one. A site that is… | — |
| `8ee9c2d1fa8db142` | other | high | The platform cannot say what one answer cost: every priced log row is an embedd… | — |
| `95ab59bde213340d` | other | high | There is no tenant boundary to prove: the one visibility check is dormant becau… | — |
| `b111251c6cc5d19a` | contradiction | high | This cycle claimed v7.0.1054 and labelled its commit with it, yet the version f… | — |
| `b771d81c1dfe5f97` | other | high | build needed a fact the kickoff did not carry | — |
| `bd5b056a3141be1e` | other | high | A procurement flag recommends action on an unsourced 15-25% claim typed into th… | — |
| `c088d60e038b9eb4` | duplicate | high | The door (d) marker-order defect this run filed as new is already ticketed: AGT… | — |
| `c9674a521959ac4d` | other | high | A day with nothing pickable, no drain retiring, no ticket done and no builder c… | — |
| `ce510fe5c1aa2493` | other | high | A taught entry can be edited or deleted with nothing recorded and nothing to re… | — |
| `d3e5bdb553ebfe5d` | other | high | baseline block header named a script path before the instrument line, so the pr… | — |
| `d90bbbacefbea9d9` | stale-or-irrelevant | high | The AGT-570 migration file says it was applied, and the database holds no such… | — |
| `e2f31fda5d2edb30` | contradiction | high | The 24-hour redesign cooldown lives only in runner_cycles.last_step, and this c… | — |
| `fbac8ed20e28abc8` | other | high | An agent has a mouth and no hands: no outbound action path and nowhere to hold… | — |
| `295f70353af18811` | contradiction | medium | The close-out commit 439ec59 changed only the backlog snapshot; CLAUDE-STATE.md… | — |
| `9ac53354228a326c` | contradiction | medium | One of AGT-250's two redesign attempts is now recorded against a ticket that wa… | — |
| `e80105d31b2d6f86` | duplicate | medium | AGT-250's gate card 22f4bd43 was accepted on 2026-10-03 for an attended build;… | — |
| `fee45a54250e14ee` | stale-or-irrelevant | medium | A claim from 2026-09-27 still sits on a removed ticket and is returned by every… | — |

- *A finding leaves this table only by John's ruling — `resolved`, `not-a-defect`, or ruled and left `open` to file. Candidates a run found but nobody ingested live in `docs/audits/<week>-candidates.json`, not here.*

**Ticket hygiene, last night** — *as of 2026-11-19 23:29Z (Nov 19, 5:29 PM CST).* What the Ticket Owner (`AGT-79`) left on the board: `public.ticket_owner_findings` open rows by check, the newest `hygiene` decision and the newest nightly cycle row. Counts only, never a rate. **377 open findings** across 10 check(s).

| check | open | oldest | nights open |
|---|---:|---|---:|
| `verdict-missing` | 90 | Sep 12, 10:31 PM CST | 67 |
| `delivered-unaccepted` | 77 | Sep 12, 10:31 PM CST | 67 |
| `pick-blocked-field` | 60 | Nov 7, 1:46 AM CST | 12 |
| `designed-closed` | 50 | Sep 23, 7:50 PM CST | 56 |
| `type-off-taxonomy` | 50 | Sep 12, 10:31 PM CST | 67 |
| `size-missing` | 23 | Sep 12, 10:31 PM CST | 67 |
| `remainder-stranded` | 11 | Sep 18, 5:38 AM CST | 62 |
| `cycles-over-quote` | 9 | Sep 12, 10:31 PM CST | 67 |
| `quote-missing` | 4 | Sep 21, 10:50 AM CST | 59 |
| `claim-expired` | 3 | Oct 2, 1:57 AM CST | 48 |

- Last run: `48619ee4` · shipped · Nov 19, 3:50 AM CST · 1193 rows · 378 findings (0 derivable · 378 judgment) · behind the fences: quote 334 · size 309 · cost 45 · verdict 97 · unrevalidated>30d 1 · attended-actual null 547 · revalidation 1 left (batch 1, carried 0) · retired 1 check / 257 rows · fixed 0 · proposed 1 · findings +4 ~373 −1 · no decision (nothing to fix) · judged 0/11/0 on claude-fable-5-1
- Judgment: **the newest night was judged** — 0 unjudged nights on top, over the newest 14 on record.
- Decision `58ec087d` · final · Ticket Owner: 7 derivable cell fix(es) on 7 row(s) — cost 1 · claim 5 · type 0 · revalidation 1 · scope rationale 0 · finalises Nov 17, 1:49 AM CST · `select public.reverse_decision('58ec087d-d761-41de-9b6a-2e8aa7ad967c','John','<why>');`

**Victoria's lists, last Tuesday** — *as of 2026-11-19 23:29Z (Nov 19, 5:29 PM CST).* What the weekly list reorganization (`AGT-281`) ruled: the newest 2 ended `public.runner_cycles` rows whose `notes` carry `SCHEDULED-AGENT: victoria-reorg`, each printing its own run line. One row per LIST, so a Tuesday that ruled both lists shows two. **2 run(s)** on record.

- dev-mgr-findings: 9 items into 5 needs, 0 turned down; top 3: AGT-716(4), AGT-718(4), AGT-719(3) · Nov 18, 4:56 AM CST
- auditor-findings: 1 items into 1 needs, 0 turned down; top 3: AGT-728(3) · Nov 18, 4:53 AM CST

- **0 ticket(s) turned down** across those run(s) — each one sits on `removal proposed` in John's waiting room under its own `removal-proposal` decision, and one `reverse_decision()` returns it to the drain. Nothing on this path ever writes `removed` (`SES-113`).

**Staff watch** — *as of 2026-11-19 23:29Z (Nov 19, 5:29 PM CST).* What the Development Manager (`SES-378`) recorded about the runner's own agents: `public.runner_staff_findings` rows per `agent_id`, with the distinct fingerprints and the distinct CYCLES behind them. Counts only, never a rate. **322 finding(s)** across 2 agent(s).

| agent | findings | distinct fingerprints | distinct cycles | newest |
|---|---:|---:|---:|---|
| `designer` | 293 | 123 | 170 | Nov 19, 4:10 AM CST |
| `devmanager` | 29 | 7 | 29 | Nov 8, 4:41 AM CST |

**Stalled cycles** — *as of 2026-11-19 23:29Z (Nov 19, 5:29 PM CST).* The permission-stalls step 0b's tripwire (`SES-103`) claimed into `runner_cycles.stall_notified_at` — a ROW, never a push (`JOHN-0925-NOTIFICATIONS-OFF`). `frozen since` is `coalesce(heartbeat_at, started_at)`, the same basis the 20-minute detector and `stall_watchdog()` use (`SES-104`), so a cycle that never reported a heartbeat still reads as a time rather than a blank. **10 reported stall(s)**, 0 still open.

| cycle | ticket | last step | frozen since | reported | state |
|---|---|---|---|---|---|
| `2555f5f1` | AGT-665 | step 3e — verifier approve; QA spot check PASS | Nov 13, 9:56 AM CST | Nov 13, 10:49 AM CST | failed |
| `c3628a63` | AGT-650 | step 3e — attended build | Nov 12, 1:12 PM CST | Nov 13, 3:45 AM CST | failed |
| `9779f12b` | AGT-649 | step 3e — attended build | Nov 12, 1:12 PM CST | Nov 13, 3:45 AM CST | failed |
| `b64d31f9` | AGT-651 | step 3e — attended build | Nov 12, 1:12 PM CST | Nov 13, 3:45 AM CST | failed |
| `b522456c` | AGT-538 | step 9 (6) — closing the row | Nov 11, 4:00 AM CST | Nov 11, 3:57 AM CST | shipped |
| `ada86ade` | AGT-444 | 6 — designer: design-kickoff AGT-444 (sub-agent running ~20… | Nov 6, 6:16 AM CST | Nov 7, 2:44 AM CST | failed |
| `88d7db54` | AGT-572 | 7a — verdict approve | Nov 6, 2:55 AM CST | Nov 6, 2:43 AM CST | shipped |
| `78a89a90` | AGT-570 | step 6 — designer running for AGT-570 | Nov 4, 9:05 AM CST | Nov 4, 9:42 AM CST | failed |
| `96f8b76c` | AA-169 | 6 — designer: design-kickoff re-assembly after cap waiver | Nov 4, 6:09 AM CST | Nov 4, 6:42 AM CST | failed |
| `527a2664` | — | 7a — related suite 55/55 green on the shipped AGT-460 tree;… | Nov 3, 5:54 AM CST | Nov 3, 2:45 PM CST | failed |

**Wasted cycles** — *as of 2026-11-19 23:29Z (Nov 19, 5:29 PM CST).* The last 7 days of `runner_cycles` with the cause on each row, counted per cause by `runner_waste_by_cause()`. The cause is DERIVED (`runner_cycle_causes`), never a written column, so it is right for the rows already filed; the vocabulary is DATA (`runner_waste_causes`), so `counts as waste` and `candidate` are an INSERT and not a ship. A cycle that MOVED a ticket, a scheduled routine and a run still going are NOT waste -- folding them into one rate is what made `audit_flow_checks()` arm (c)'s old percentage unreadable. **308 cycle(s) in the last 7 days, 34 moved a ticket, 249 wasted (80.8%).**

| cause | cycles | counts as waste | candidate |
|---|---|---|---|
| `weekly_pace` | 125 | yes | — |
| `moved` | 34 | no | — |
| `gated` | 29 | yes | AGT-308 |
| `lanes_full_self` | 28 | yes | — |
| `weekly_wall` | 26 | yes | — |
| `lanes_full` | 23 | yes | — |
| `routine_run` | 23 | no | — |
| `unattributed` | 16 | yes | — |
| `in_progress` | 2 | no | — |
| `lanes_full:_the_one_live_lane_is_this_continuation_row_itself` | 1 | yes | — |
| `lanes_full:_this_continuation_row_is_the_live_lane` | 1 | yes | — |

**Redesign after refusal** — *as of 2026-11-19 23:29Z (Nov 19, 5:29 PM CST).* The attempt ledger (`runner_refusal_attempts`, AGT-610, John's standing decision 6e94edcb): a ticket the platform's safety check refused is redesigned by the team at most twice, then diagnosed and parked; every row here is information, never a card you must act on. **26 ticket(s) in the ledger, 12 parked after two attempts.**

| ticket | attempts | state | last refusal | feedback |
|---|---|---|---|---|
| DAT-30 | 2 | redesign open | (none — no bracketed label; an MCP inte… Nov 16, 11:30 AM CST | — |
| AGT-570 | 2 | redesign open | [Production Deploy] Nov 13, 6:11 AM CST | — |
| ADM-2 | 0 | parked (attended-only) | —  | — |
| AGT-017 | 1 | redesign open | —  | — |
| AGT-160 | 0 | parked (attended-only) | —  | — |
| AGT-168 | 1 | redesign open | —  | — |
| AGT-232 | 1 | redesign open | —  | — |
| AGT-237 | 0 | parked (attended-only) | —  | — |
| AGT-250 | 1 | redesign open | —  | — |
| AGT-251 | 0 | parked (attended-only) | —  | — |
| AGT-252 | 0 | parked (attended-only) | —  | — |
| AGT-291 | 1 | shipped | —  | — |
| AGT-459 | 1 | shipped | —  | — |
| AGT-466 | 1 | shipped | —  | — |
| AGT-471 | 0 | parked (attended-only) | —  | — |
| AGT-517 | 1 | redesign open | —  | — |
| AGT-549 | 0 | parked (attended-only) | —  | — |
| AGT-567 | 1 | shipped | —  | — |
| AGT-577 | 1 | shipped | —  | — |
| AGT-590 | 1 | shipped | —  | — |
| AGT-705 | 0 | parked (attended-only) | —  | — |
| DAT-23 | 0 | parked (attended-only) | —  | — |
| DAT-29 | 0 | parked (attended-only) | —  | — |
| SES-237 | 0 | parked (attended-only) | —  | — |
| SES-349 | 1 | redesign open | —  | — |
| SES-361 | 0 | parked (attended-only) | —  | — |

**Secret age** — *as of 2026-11-19 23:29Z (Nov 19, 5:29 PM CST).* `runner_secrets` by NAME and `updated_at`; no value is read. **Oldest row: 91 days (`ANTHROPIC_API_KEY`)**, 5 of 12 at or past 90 days.

| key | row last written | days | state |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Aug 19, 10:14 PM CST | 91 | **at or past 90** |
| `SUPABASE_SERVICE_KEY` | Aug 19, 10:14 PM CST | 91 | **at or past 90** |
| `SUPABASE_URL` | Aug 19, 10:14 PM CST | 91 | **at or past 90** |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Aug 19, 10:14 PM CST | 91 | **at or past 90** |
| `VERCEL_TOKEN` | Aug 19, 11:21 PM CST | 91 | **at or past 90** |
| `SCRATCH_SUPABASE_SERVICE_KEY` | Aug 28, 3:27 PM CST | 83 | under 90 |
| `MCP_API_KEY` | Sep 9, 7:25 PM CST | 70 | under 90 |
| `YAHOO_IMAP_APP_PASSWORD` | Sep 25, 2:37 PM CST | 55 | under 90 |
| `YAHOO_IMAP_USER` | Sep 25, 2:38 PM CST | 55 | under 90 |
| `MCP_KEY_interviewquestions` | Oct 23, 1:41 PM CST | 27 | under 90 |
| `OPENAI_API_KEY` | Nov 12, 4:11 PM CST | 7 | under 90 |
| `MCP_KEY_maricopa_dashboard` | Nov 19, 3:25 PM CST | 0 | under 90 |

- `updated_at` is whatever the last writer of the row left: nothing moves it when a value changes, and no column tells a key from an address or a username.
- GitHub Actions secrets are not in this table.

**Human gates** — *as of 2026-11-19 23:29Z (Nov 19, 5:29 PM CST).* The two reads that say whether anything is waiting on a human: open `backlog_items` carrying `design_status = 'needs-john'`, and `gated_before_build` `runner_items` left with `decision IS NULL` (`M6-01`). Board state, written by no code in this repo — which is why it is REPORTED here and not asserted as a gate by the regression suite. **1 open `needs-john` ticket(s)**, **2 undecided `gated_before_build` card(s)**.

- **`needs-john` (1):** `AGT-110`
- **Undecided gated cards (2):** `b766a84f-92ec-4ab0-81cf-f8136ffb3982`, `ac761ce2-0612-4ab5-9704-0763df7b351d`
- *Open is not wrong.* A card nobody has answered yet is a real board state; what it is NOT is a regression, so nothing in the suite goes red for it.

*Provenance: 1000 board rows, payload `sha256:24f11abc8eb716f6`, as of 2026-11-19 23:29Z (Nov 19, 5:29 PM CST). The stamp says when this was last read; the sha says whether it still matches the tables. `--check` compares the sha, never the stamp — a refreshed stamp over identical facts is not drift.*
<!-- END GENERATED — scripts/render-standing-brief.js -->

**Next session:** none required — the runner is live and works **John's automation queue** (canonical: `docs/RUNNER-GOV-0820-REQUIREMENTS.md`): the queue is the board's leading sort key, not a list to read (`automation_rank`, v7.0.133) — `ORDER BY queue` already honours it. Classes are always written named, **`P1 - Improves John's Skills` → `P10 - Tooling`**; outcomes as plain words (“did not run”, “gated before build”); budget is two-track (API dollars + token governor). John judges from the briefing page. Runner pause: disable `deepbench-runner` at claude.ai/code/routines. **Board census measured 2026-08-23T12:5xZ by runner cycle `363b5138`, taken from the board after its own close-out recompute rather than carried forward:** **561 open tickets, 561 numbered, 0 open-but-unnumbered**, 611 rows total, **the standing Automation drain now has a FIXED finish line** — from `v7.0.179` (`SES-142`) it works the **18 members John named** on directive `b74009ea`, stored as `runner_drain_scope` FK rows, and a ticket filed into the epic *after* that naming **never joins it**: it queues normally and waits for him. The live `now` tier had already drifted to 19 against his 18. `drain_epic_next()` retires when those 18 are `done`/`removed`, and returns the new outcome **`unscoped`** — never a live-tier fallback — for any future drain declared without a list. Queue/drain state as of **v7.0.196** (2026-08-23 ~17:00Z, `successional-review` close-out, 561 rows renumbered): `SES-140` — *the successor fire is refused by the platform* and `SES-151` — *the scheduler runs on John's clock grid* are both **`done`**; the drain's nearest open member `SES-84` — *the vision corpus* (`needs-john`) waits on John's briefing decisions, so cycles step past it (`SES-114`) and work the board (`SES-121` — *shrink the `.claude/`-mutable surface* went `done` at v7.0.198; procedure text now lives in `docs/runbooks/`, cycle-writable). **The board's `title` column is trustworthy for display for the first time** (`SES-91`, v7.0.177): 98 rows that held a bare priority-class string now carry a real authored title, and the only `^P[0-9]+ - ` title left is `ADM-1`, whose title is a real sentence behind a stale class prefix and is deliberately left for `SES-117` to **accommodate** rather than repair. `SES-119` is now `done` (v7.0.184 + v7.0.185): the briefing renders `public.backlog_display_title(title, description)` rather than the read-time `gist` workaround, and **`runner-cycle.md`'s Language block now requires a ticket's title wherever John reads its ID**. Step 5's `gist` expression deliberately stays — it is still correct for any future row filed the old way, and 50 of 562 open numbered tickets still fall back to it. **From v7.0.195 the chain runs IN-SESSION (`SES-140` FINAL)** — a cycle that actually ran one (`shipped`/`gated_before_build`/`reverted`) and whose drain still returns `pick` opens its next `runner_cycles` row (trigger `chained (drain continuation)`) **in the same session** and re-enters the runbook at step 1; session-spawning is retired as platform-unsupported (`runner-cycle.md` tail step (8) carries the evidence). A **wall-stopped cycle continues nothing**, which keeps the budget wall a brake rather than a metronome. Proven live 2026-08-23: cycles `1fcd687e` → `a11c94d2`, the first chained row in the runner's life. **The briefing-redesign epic is finished** — `SES-129`, its last member, shipped in cycle `ed1a5eb3`. **A new filing rule binds from this version:** `runner_items.backlog_id` takes a **bare** ticket id or NULL and is enforced by `ck_runner_items_backlog_id_bare`; the display string belongs in `display_ref`, and the briefing's id chip reads `coalesce(backlog_id, display_ref)` (`SES-116`, v7.0.174 — `runner-cycle.md` step 9). **`design_status` reads for selection (`SES-114`, v7.0.165); among OPEN tickets measured at the v7.0.198 close-out:** 16 `designed` (incl. `SES-101`, flipped from `needs-desktop` — its one remaining edit now lives in `docs/runbooks/session-setup.md` step 3c, cycle-writable), **0 `needs-desktop`**, **1 `needs-john`** (`SES-84`), 546 `NULL` = not yet triaged, deliberately not guessed to `auto`. Measured at the v7.0.198 close-out: **11 of John's 18 named members remain open** (`SES-121` retired from the list by going `done` this session); the only `needs-john` member is `SES-84` — the rest are buildable, the drain reaches them and can retire on them. **`CHI-89`** still holds its queue slot with its removal card undecided — visible to John and skipped by cycles, exactly as `SES-113` intended. **`SES-133` is still open at `partial`** — the other half of John's 2026-08-23 emergencies directive; it sits at queue 251 rather than at the top, because the drain reads the Automation epic's `now` tier in queue order and `SES-133` is not in that epic. **From v7.0.182 John's own switches govern the cadence** (`SES-143`): the briefing's **§2b Automation panel** carries a scheduler checkbox + an every-N-hours box (the generated block above is the only home for their live values — it renders `runner_settings` row 1 fresh each cycle, `SES-151`) and a drain checkbox, and `runner-cycle.md`'s **new step 1b** calls `public.scheduler_gate()` before anything else — a scheduled cycle arriving early closes `did_not_run` with *"paced by your scheduler setting"*, and with the scheduler off it closes *"scheduler off"*. **The cron is John's own routine switch** — a cycle cannot edit its own routine — and **from v7.0.196 (`SES-151`) the gate paces by John's clock grid**: a scheduled fire runs iff its row's `started_at` falls in an America/Chicago hour divisible by `runner_settings.interval_hours` — row 1, read live, never a number written here — and the routine's cron fires in that hour (DST-proof; the mixed-clock elapsed test that wrongly paced 3 of 9 hourly fires is dead, `q-hourly-interval-boundary` answered by ship). Two consequences worth knowing before reading a quiet night as a stall: the gate **fails open** on every unknown, and it governs **scheduled** fires only, so a standing drain's chained continuation cycles run regardless — while the Automation drain stands, **the chain and not the interval is what actually sets the pace**. A manual fire (off the cron grid) is never paced; whether that is what John wants is the one thing the spec leaves open, asked as `q-manual-fire-pacing`. **From v7.0.188 that gate actually fires** (`SES-146`): until then `scheduler_gate()` matched the trigger by exact equality against the bare word `scheduled`, so a cycle passing the verbatim line step 1b asks for — `trigger: scheduled` — fell through to *"not a scheduled cycle"* and skipped **both** the pacing branch and the `scheduler_on = false` branch, and the grid test compared `now()`-at-step-1b rather than the fire time against a hardcoded ±2. Both failed open, so the panel looked live and bound nothing. The trigger is now normalised, the grid is anchored to the cycle row's own `started_at`, and the tolerance is the column `runner_settings.grid_tolerance_min` (10). **Silence is not a “no”** on any open question. **From v7.0.183 the board's open status is `open`, never `missing`** (`SES-118`): `backlog_items_status_check` now allows exactly `('open','partial','done','removal proposed','removed')` and the retired value raises `23514` — 510 rows renamed, `updated_at` deliberately untouched so step 8c's 30-day revalidation sweep still sees the sinking tail. **That consequence closed at v7.0.189** (attended session `ses118-gated`, 2026-08-23): step 3c's INSERT now writes `'open'`, zero `'missing'` literals remain under `.claude/`, and `SES-118` is `done` — its gated card `76564dde` awaits John's decision on the briefing page.
