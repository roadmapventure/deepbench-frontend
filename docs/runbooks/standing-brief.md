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
## Live board state — generated, do not hand-edit — *as of 2026-09-12 22:06Z (Sep 12, 5:06 PM CST)*

> Rendered from the tables by `scripts/render-standing-brief.js` at every ship. **Every number below is derived; nothing here is maintained by hand.** The judgment prose beneath this block is the opposite — hand-maintained, deliberately, and this script never writes outside these markers. Where the two disagree about a number, this block is right and the sentence below is stale: say so rather than reconciling them by hand.

**Board census** — *as of 2026-09-12 22:06Z (Sep 12, 5:06 PM CST).* **635 open tickets**, 631 numbered, **4 open-but-unnumbered**, 889 rows total.

| `status` | rows | share of board |
|---|---:|---:|
| `open` | 548 | 61.6% |
| `done` | 242 | 27.2% |
| `partial` | 46 | 5.2% |
| `removal proposed` | 27 | 3% |
| `delivered` | 14 | 1.6% |
| `removed` | 12 | 1.3% |

**`design_status` among OPEN tickets** — *as of 2026-09-12 22:06Z (Sep 12, 5:06 PM CST).* Reads for selection (`SES-114`); `NULL` is *not* `auto`, it is not-yet-triaged and no cycle may backfill it.

| `design_status` | open rows | selection effect |
|---|---:|---|
| `NULL` | 557 | full ceremony — not yet triaged |
| `needs-decision` | 44 | — |
| `designed` | 26 | **not a skip** — build from `kickoff_link` (step 6 fast path) |
| `needs-desktop` | 7 | skipped, `record_skip()` — needs a session John attends (B39) |
| `auto` | 1 | full ceremony |

**Scheduler and automation settings** — *as of 2026-09-12 22:06Z (Sep 12, 5:06 PM CST).* §2b of the briefing, John's own switches, binding via `scheduler_gate()` at step 1b:

- Scheduler: **on**, every **1 hour** on John's clock grid (America/Chicago hours divisible by the interval — `SES-151`, DST-proof).
- Cron minute **40**, manual-fire tolerance **±10 min** (a start outside it is treated as a manual fire and is never paced).
- Standing daily max: **196M tokens**. This is rung 3 of five, **below** the 48h stale floor: a standing number must not defeat the staleness brake.

**Standing epic drain** — *as of 2026-09-12 22:06Z (Sep 12, 5:06 PM CST).* Created only by John; the runner may read one, never write one (`drain_epic_next()` property 5). The finish line is drawn from the members he **named** (`runner_drain_scope`), never the live `now` tier (`SES-142`) — and within that list it is the members a milestone **gate ruled required** (`milestone_required`, `SES-310`) whenever the list carries such a ruling, every named member otherwise.

- **No drain standing.** Selection is the class-sorted board exactly as it is with no drain declared.

**Open decisions** — *as of 2026-09-12 22:06Z (Sep 12, 5:06 PM CST).* Decisions made under `M6-02` that are still inside their reversal window (`runner_settings.reversal_window_hours` = 72h). Silence finalises them; to reverse one, run the line beside it (`docs/runbooks/session-setup.md` § Reversing a decision).

- `1f2947d0` · classification · — · board ordered: 10 ticket(s) given an automation_rank · finalises Sep 12, 4:17 PM CST · `select public.reverse_decision('1f2947d0-7e3e-489f-810b-c2d42b902b25','John','<why>');`
- `1a6da462` · ship · `SES-332` · SES-332 shipped at v7.0.435 (5a0fcfb9) on verdict c27e670a-f046-4ad1-bd7a-17926ab8a05f · finalises Sep 12, 4:48 PM CST · `select public.reverse_decision('1a6da462-b1af-4657-95b5-ae69220b4f04','John','<why>');`
- `867b0f19` · ship · `SES-333` · SES-333 shipped at v7.0.436 (9097f086) on verdict 3305c654-8770-4998-a3a1-96dc0be72998 · finalises Sep 12, 4:48 PM CST · `select public.reverse_decision('867b0f19-3e80-411e-bcc3-c7a80840845f','John','<why>');`
- `de07c1cb` · ship · `SES-334` · SES-334 shipped at v7.0.437 (a6c3e8f3) on verdict 343b2883-bcd4-42b2-82ca-985c4e408f4f · finalises Sep 12, 4:48 PM CST · `select public.reverse_decision('de07c1cb-d4ab-45cd-9de4-c33050d959ab','John','<why>');`
- `f0102762` · ship · `SES-329` · SES-329 shipped at v7.0.437 (a6c3e8f3) on verdict 9c198beb-c7ea-4428-8dc8-40533313b2dd · finalises Sep 12, 4:51 PM CST · `select public.reverse_decision('f0102762-3079-44dd-9160-05efe2a58818','John','<why>');`
- `86533ebc` · directive · `SES-336` · SES-336's 40 KB runbook target is replaced by a measured ceiling (381,000 bytes, pinned by ses-336-runbook-orchestratio… · finalises Sep 12, 5:28 PM CST · `select public.reverse_decision('86533ebc-bb79-4f4e-a266-cad1a09e2fd6','John','<why>');`
- `b7c7dfa5` · ship · `SES-335` · SES-335 shipped at v7.0.438 (18ce23c7) on verdict b81a95d0-b921-450b-8547-e462aea059e8 · finalises Sep 12, 5:28 PM CST · `select public.reverse_decision('b7c7dfa5-0f4d-4faa-827a-31709da90374','John','<why>');`
- `8769e142` · ship · `SES-336` · SES-336 shipped at v7.0.439 (bc73354e) on verdict 1d180269-0419-497c-8b76-4fc12ec46d27 · finalises Sep 12, 5:28 PM CST · `select public.reverse_decision('8769e142-bba8-4753-b705-688b0fcb4382','John','<why>');`
- `f6c99ec8` · directive · `SES-234` · SES-234: 44 operational defaults filed as governance_rules rows (source_group operational-defaults, OD-01..OD-44). Cens… · finalises Sep 12, 5:43 PM CST · `select public.reverse_decision('f6c99ec8-249a-48f6-8e88-4bd5fc57a30f','John','<why>');`
- `af8d991a` · ship · `SES-234` · SES-234 shipped at v7.0.442 (7e4d4cb2aefbd9d563b7793bd54d0c1931031aec) on verdict 98ae3cd2-7e6c-4350-a811-5ce5f9e891f6 · finalises Sep 12, 6:03 PM CST · `select public.reverse_decision('af8d991a-2e1c-4532-bb06-c6450026be35','John','<why>');`
- `f2b4aad3` · gate · `SES-338` · Governance Agents exit review: the project does NOT exit — 3 of 6 criteria fail (verdict reproduction 8 disagreements v… · finalises Sep 12, 7:04 PM CST · `select public.reverse_decision('f2b4aad3-309a-43f3-903a-d7ecc487bef7','John','<why>');`
- `d12de39f` · ship · `SES-338` · SES-338 shipped at v7.0.441 (d8e3a2ef3fac5593040d585a00e5e3c12cc39a5a) on verdict 95943752-4c39-47be-8eb4-3a2b38b73388 · finalises Sep 12, 7:21 PM CST · `select public.reverse_decision('d12de39f-5e48-456c-81f8-00a64f6f0190','John','<why>');`
- `e60f0363` · ship · `MCP-3` · MCP-3 shipped at v7.0.444 (5f55eb23f5e39340551061f5bd5c6a1277dae412) on verdict bab48d12-ef1e-45f2-bbe4-74f8a9700e2c · finalises Sep 12, 7:53 PM CST · `select public.reverse_decision('e60f0363-16b9-4e12-8b93-f23170fa7745','John','<why>');`
- `e69325dc` · ship · `SES-339` · SES-339 shipped at v7.0.445 (88ce3752) on verdict df00d916-67ff-4d86-8ac2-4e7f3f541f81 · finalises Sep 12, 8:36 PM CST · `select public.reverse_decision('e69325dc-e2a4-484d-b48c-864399e8314d','John','<why>');`
- `aa08ac52` · ship · `SES-346` · SES-346 shipped at v7.0.446 (21f1992a522c46a1bae03c64a2b4969af7bd9bb0) on verdict 145d14ab-8740-4214-abdd-a3bbc00e09a6 · finalises Sep 12, 9:12 PM CST · `select public.reverse_decision('aa08ac52-0aac-4efe-8322-8b985f09001a','John','<why>');`
- `821638ba` · directive · `SES-347` · Rename vf-verdict-intent's 'reasoning' schema property to 'findings' so the Anthropic API stops refusing every verify-s… · finalises Sep 12, 9:49 PM CST · `select public.reverse_decision('821638ba-b6c7-471b-ba60-7e0e1958fd08','John','<why>');`
- `02a3bfc0` · ship · `SES-347` · SES-347 shipped at v7.0.447 (341c3fe986f56dce89130787d45cbf3321ef2e4f) on verdict 8ee4a5a3-9ee8-4980-914f-5677783f6021 · finalises Sep 12, 10:21 PM CST · `select public.reverse_decision('02a3bfc0-d6a3-4e36-8b79-20b69396fe11','John','<why>');`
- `49460147` · directive · — · TechOps audit 2026-09-10 files 13 tickets (SES-349..SES-357 and DAT-27..DAT-30): enforcement floor, backup/schema/secur… · finalises Sep 13, 12:35 PM CST · `select public.reverse_decision('49460147-4585-4083-8150-2df03ee63024','John','<why>');`
- `7e35ff18` · directive · — · TechOps audit 2026-09-10, second batch: 5 tickets (SES-358..SES-360, AGT-69, LOG-149) from the routine re-enable, agent… · finalises Sep 13, 7:55 PM CST · `select public.reverse_decision('7e35ff18-2cf8-4dee-aec6-5661d45a5408','John','<why>');`
- `9c106355` · directive · `SES-359` · SES-359 scope widened on John's word ("do it"): every kickoff declares the lane of every model call (session, executor,… · finalises Sep 13, 8:02 PM CST · `select public.reverse_decision('9c106355-0df2-4c53-ac2f-9b06adcaf48f','John','<why>');`
- `3cd4bcd7` · directive · `AGT-70` · AGT-70 filed on John's word: The Auditor, a seventh governance agent that reviews agent data, governance docs, rules, d… · finalises Sep 13, 8:21 PM CST · `select public.reverse_decision('3cd4bcd7-ce80-4619-a69c-b3ce35ab7d5f','John','<why>');`
- `77c4696c` · directive · — · AGT-70 and SES-359 descriptions trimmed to harvest pointers (session-hygiene check 3d, 2000-char cap); full text moved… · finalises Sep 13, 9:16 PM CST · `select public.reverse_decision('77c4696c-1238-4e58-b4da-c2b6a0aceb4a','John','<why>');`
- `5d27f455` · directive · — · VC-MISSION-034 ratified: John's P1 skill-set brief (2026-09-10, verbatim) becomes a P1 vision claim; mirrored into the… · finalises Sep 13, 9:19 PM CST · `select public.reverse_decision('5d27f455-6c88-4481-bc0e-8a908d15f18a','John','<why>');`
- `29e2333b` · directive · — · VC-MISSION-034 spelling corrected on John's word ("fix the spelling under a follow-up decision"): "managent" -> "manage… · finalises Sep 13, 9:26 PM CST · `select public.reverse_decision('29e2333b-fc3a-4898-a8ab-d4c0943b2b94','John','<why>');`
- `f6e3e94d` · directive · `SES-361` · The Researcher's P1-lens 25 (docs/research/2026-09-10-p1-skills-lens.md, pushed to dev) are a cited catalogue, NOT appr… · finalises Sep 13, 9:58 PM CST · `select public.reverse_decision('f6e3e94d-f096-4b6a-b2ba-07301e5c3f81','John','<why>');`
- `e713be94` · directive · `SES-361` · P1 brief refined by John (2026-09-10 evening, verbatim on this row): the P1 research question is AI BUSINESS functional… · finalises Sep 13, 10:08 PM CST · `select public.reverse_decision('e713be94-a3fc-4e65-aee5-e2b9bca7369f','John','<why>');`
- `0eb5af71` · directive · — · Projects Moat (planned) and Moat Support (executing) created on John's word 2026-09-11: eight verified moat features fi… · finalises Sep 14, 9:54 AM CST · `select public.reverse_decision('0eb5af71-9112-4771-b3f5-21e6c43b8380','John','<why>');`
- `67ff2fd5` · classification · — · board ordered: 22 ticket(s) given an automation_rank · finalises Sep 14, 9:57 AM CST · `select public.reverse_decision('67ff2fd5-2e3d-4bf3-b71a-9883ea860278','John','<why>');`
- `81a291a2` · directive · `AGT-56` · AGT-56 The Recruiter is blocked_by SES-362 (per-agent trust ladder): a hired agent must land on a ladder that exists, a… · finalises Sep 14, 9:58 AM CST · `select public.reverse_decision('81a291a2-00f3-4f46-b42b-d4daa76be9f1','John','<why>');`
- `6e064b62` · directive · — · AGT-69 and SES-361 set design_status needs-desktop: both are John's own rulings (Bench visibility of governance agents;… · finalises Sep 14, 9:59 AM CST · `select public.reverse_decision('6e064b62-0521-4c1f-8bf5-fdc01775e103','John','<why>');`
- `b18169cf` · directive · — · Eight feature-side tickets re-homed from Moat Support into project Moat (planned) on John's word: SES-362, SES-363, SES… · finalises Sep 14, 10:09 AM CST · `select public.reverse_decision('b18169cf-fb5e-48fc-a5db-19652e63263d','John','<why>');`
- `c784237e` · classification · — · board ordered: 12 ticket(s) given an automation_rank · finalises Sep 14, 10:10 AM CST · `select public.reverse_decision('c784237e-e9fb-47f7-8ca3-8f27a84655c7','John','<why>');`
- `19b8d66a` · directive · `SES-82` · SES-82 gains a measured finding (2026-09-11): the subscription meter IS machine-readable today as response headers on a… · finalises Sep 14, 10:27 AM CST · `select public.reverse_decision('19b8d66a-178d-458e-a3ab-5cb7a60c0623','John','<why>');`
- `23bb3449` · directive · `SES-367` · SES-367 filed: the session prompt path omits the platform-injected 'account' output field, so a governance agent run as… · finalises Sep 14, 10:37 AM CST · `select public.reverse_decision('23bb3449-3f25-4ee3-b4ac-292a82220048','John','<why>');`
- `0762a031` · directive · `SES-368` · SES-368 filed and claimed for an attended build at v7.0.448: the weekly pace gate, John's ruling 2026-09-11 that a cycl… · finalises Sep 14, 10:47 AM CST · `select public.reverse_decision('0762a031-5a02-4e26-a9a3-e862e9ffb4f0','John','<why>');`
- `283d0720` · ship · `SES-368` · SES-368 shipped at v7.0.448, commit 90e38cb5 on dev: the weekly pace gate (M5-16) — runner_should_boot() refuses with w… · finalises Sep 14, 11:14 AM CST · `select public.reverse_decision('283d0720-4c71-4d30-9e50-41c5f29c0462','John','<why>');`
- `6d795c52` · directive · `SES-355` · SES-355 claimed for an attended build at v7.0.449 on John's word ("rewrite it", 2026-09-11): the routine prompt gets it… · finalises Sep 14, 11:19 AM CST · `select public.reverse_decision('6d795c52-b503-4892-a5ca-cb01213e57d5','John','<why>');`
- `1300171e` · ship · `SES-355` · SES-355 shipped at v7.0.449, commit c87062bb on dev: the cloud routine's prompt lives at docs/runbooks/routine-prompt.m… · finalises Sep 14, 11:32 AM CST · `select public.reverse_decision('1300171e-e4aa-427f-9ec0-3b7863a8abf4','John','<why>');`
- `3ba329f3` · directive · — · Cloud routine deepbench-runner ENABLED 2026-09-11 16:38:49Z on John's word ("can you turn it on? we have 1 minute"); ne… · finalises Sep 14, 11:39 AM CST · `select public.reverse_decision('3ba329f3-0461-4689-abb7-2131be09c3ca','John','<why>');`
- `20f1eea8` · directive · `SES-373` · SES-373 filed from the first two unattended cloud cycles (2026-09-11): rollback-on-red's card-only decision leaves a ga… · finalises Sep 14, 1:19 PM CST · `select public.reverse_decision('20f1eea8-73b9-491a-a513-a4179bab0176','John','<why>');`
- `a7629370` · invention · — · Invention pass of 2026-09-11 recorded as the rung-0 floor decision: the Researcher's survivor ("Cost per deliverable: o… · finalises Sep 14, 1:20 PM CST · `select public.reverse_decision('a7629370-48b9-4f61-909e-97ec3bdf8138','John','<why>');`
- `9f4f1df7` · learning · `SES-159` · class-loop learning claims for P3 - Investor Value · finalises Sep 14, 1:21 PM CST · `select public.reverse_decision('9f4f1df7-2d64-45b2-8c18-a66f7336cbef','John','<why>');`
- `809894ba` · synthesis · `SES-159` · class synthesis for P3 - Investor Value · finalises Sep 14, 1:21 PM CST · `select public.reverse_decision('809894ba-cf40-456e-b8fd-62c9bc31e963','John','<why>');`
- `61449eec` · directive · `SES-374` · SES-374 filed on John's word ("file it", 2026-09-11 15:2x CT): the scheduled meter reader — a local task on John's mach… · finalises Sep 14, 3:17 PM CST · `select public.reverse_decision('61449eec-f37c-437d-b257-f7eecddbfe67','John','<why>');`
- `92aa8431` · directive · `SES-355` · Routine prompt amended on John's word ("fix the prompt", 2026-09-11 ~16:50 CT): the pre-boot gate is step 1, ahead of f… · finalises Sep 14, 4:53 PM CST · `select public.reverse_decision('92aa8431-fc5f-452a-86f9-28fd5e72405c','John','<why>');`
- `71ea0fde` · directive · `SES-374` · SES-374 claimed for an attended build at v7.0.455 (John walking the needs-desktop list one at a time, 2026-09-11 evenin… · finalises Sep 14, 5:02 PM CST · `select public.reverse_decision('71ea0fde-fb93-4d1a-9c66-c82704ce661f','John','<why>');`
- `4a73f348` · ship · `SES-374` · SES-374 delivered at v7.0.455 (commits 9000e368, cfc20361 on dev): scripts/read-usage-meter.js + parser test + session-… · finalises Sep 14, 5:13 PM CST · `select public.reverse_decision('4a73f348-b4bb-4e79-a3fa-2b18e5da8059','John','<why>');`
- `580713de` · directive · `SES-374` · SES-374 done: John installed the scheduled task (three live-found conditions: AC-power default lifted, task repointed a… · finalises Sep 14, 5:31 PM CST · `select public.reverse_decision('580713de-14d0-4081-a0ad-e03c34d3fb73','John','<why>');`
- `146256c1` · directive · `AGT-69` · JOHN'S UI RULING 2026-09-11 ("shape 1"): the six governance agents appear in a read-only Governance section on the Benc… · finalises Sep 14, 5:33 PM CST · `select public.reverse_decision('146256c1-f29a-4fb5-8854-9489eecd6d7e','John','<why>');`
- `a1e3a0fc` · directive · `SES-361` · SES-361 deferred by John 2026-09-11 ("let's skip p2-4 definitions, i'll run those separately when i am ready"): the P2/… · finalises Sep 14, 5:36 PM CST · `select public.reverse_decision('a1e3a0fc-3e61-4e27-823d-ecb511b48164','John','<why>');`
- `ed1da0b9` · directive · `SES-358` · SES-358 dropped by John 2026-09-11 ("drop"): the runner re-enable pre-flight was proven live by the first unattended da… · finalises Sep 14, 5:40 PM CST · `select public.reverse_decision('ed1da0b9-0951-41e0-8f24-d79807522aea','John','<why>');`
- `8fdc8913` · directive · `SES-376` · SES-376 and SES-377 filed on John's word ("file them", 2026-09-11 evening) from the first unattended day's cost measure… · finalises Sep 14, 5:48 PM CST · `select public.reverse_decision('8fdc8913-e189-4e64-9d9c-d6ff96c6abbe','John','<why>');`
- `de53d3c2` · directive · — · Routine deepbench-runner cron changed from hourly (40 * * * *) to every three hours (40 */3 * * *) on John's word ("set… · finalises Sep 14, 5:48 PM CST · `select public.reverse_decision('de53d3c2-a246-4e76-9de5-136613f50c3b','John','<why>');`
- `ba4a8496` · classification · — · board ordered: 14 ticket(s) given an automation_rank · finalises Sep 15, 1:49 AM CST · `select public.reverse_decision('ba4a8496-6fd1-439d-8a1b-37e67733af85','John','<why>');`
- `b79307fa` · learning · `SES-159` · class-loop learning claims for P3 - Investor Value · finalises Sep 15, 5:22 AM CST · `select public.reverse_decision('b79307fa-f8e1-4d6b-88e0-12c25c8523bb','John','<why>');`
- `6c19edb2` · rollback-backfill · `SES-373` · Backfill: five card-only rollback incident cards stamped retired (SES-373, v7.0.458) · finalises Sep 15, 8:06 AM CST · `select public.reverse_decision('6c19edb2-0106-4ce9-b8ce-6189fc7a08ab','John','<why>');`
- `0fdb9d10` · rollback · — · Auto-rollback held: ci-red on 5e39e62 was not reverted (card-only) · finalises Sep 15, 8:07 AM CST · `select public.reverse_decision('0fdb9d10-fc95-4037-8ea6-3bd5cac14daf','John','<why>');`
- `57dd57c4` · rollback · — · Auto-rollback held: ci-red on 3ecfa84 was not reverted (card-only) · finalises Sep 15, 8:23 AM CST · `select public.reverse_decision('57dd57c4-77df-4d98-8917-ff81f2b4f649','John','<why>');`
- `42e8442d` · ticket-scope · `SES-376` · SES-376 splits: its Skill-row half is gated lane and is carded for an attended session; the verifier mechanism and its… · finalises Sep 15, 11:00 AM CST · `select public.reverse_decision('42e8442d-ed8e-4cca-b480-e45c52452f98','John','<why>');`
- `db313f7f` · directive · `SES-355` · Routine prompt amendment 2 on John's question 2026-09-12 ("only 1 per 3 hour session then quits. what is blocking this?… · finalises Sep 15, 11:58 AM CST · `select public.reverse_decision('db313f7f-6883-4ca2-ab1d-06216f1a6136','John','<why>');`
- `82a3c86a` · directive · `SES-378` · SES-378 filed on John's word ("file it", 2026-09-12): the Development Manager takes the pick — step 5 of a cycle asks G… · finalises Sep 15, 12:09 PM CST · `select public.reverse_decision('82a3c86a-d74a-4cbb-bb81-06d27fd2b002','John','<why>');`
- `bf1e1c3f` · directive · `SES-376` · SES-376 second half applied on John's word ("apply the skill edits", 2026-09-12): the Designer's Intent (ds-kickoff-int… · finalises Sep 15, 12:19 PM CST · `select public.reverse_decision('bf1e1c3f-903b-4856-ad01-d45586e1741e','John','<why>');`
- `aa72f1d9` · directive · `SES-376` · Designer Guardrails gain one must line on John's word ("add that guardrail line now", 2026-09-12): every fact a task de… · finalises Sep 15, 12:24 PM CST · `select public.reverse_decision('aa72f1d9-1aab-4b87-8d09-c750e686744e','John','<why>');`
- `d301d89d` · directive · `SES-378` · SES-378 amended on John's word (2026-09-12, "let's keep watching this too, to see if the designer needs to improve. Is… · finalises Sep 15, 12:25 PM CST · `select public.reverse_decision('d301d89d-c7d5-41ab-b526-803630daf1c1','John','<why>');`
- `879839b4` · directive · — · JOHN'S RULE 2026-09-12, verbatim: "we need to change the rule - when ever anything is created in dev environment, it is… · finalises Sep 15, 12:32 PM CST · `select public.reverse_decision('879839b4-5d3a-4edc-bcea-82608164d60a','John','<why>');`
- `ea7a5d30` · directive · `AGT-80` · AGT-80 filed and claimed for an attended build at v7.0.460 on John's UI ruling 2026-09-12, verbatim: "place the governa… · finalises Sep 15, 12:38 PM CST · `select public.reverse_decision('ea7a5d30-004f-42a3-bc95-0df7d66ed60e','John','<why>');`
- `7c26592e` · ship · `AGT-80` · AGT-80 delivered at v7.0.460 (commit f262d1d1 on dev): the governance agents are the Bench's "Product Team" filter, las… · finalises Sep 15, 12:44 PM CST · `select public.reverse_decision('7c26592e-a610-46dc-912e-40e478a7c190','John','<why>');`
- `03e6d25b` · directive · `SES-371` · SES-371 pinned to queue position 1 so the next runner fire builds the log-143c test fix first; John's stated goal 2026-… · finalises Sep 15, 12:59 PM CST · `select public.reverse_decision('03e6d25b-2480-4489-800c-02f87d817396','John','<why>');`
- `e9b16d3f` · removal · `SES-372` · SES-372 removed as superseded by SES-373 (v7.0.458, 3ecfa840): the engine now files the card-only rollback card already… · finalises Sep 15, 1:00 PM CST · `select public.reverse_decision('e9b16d3f-4d89-40b9-9e60-ad46ff848a00','John','<why>');`
- `ac2777c1` · classification · `SES-371` · SES-371 classed P9 - Bug Fixes, serves P10 - Tooling · finalises Sep 15, 1:47 PM CST · `select public.reverse_decision('ac2777c1-5d67-489c-b0b5-22cb09957cff','John','<why>');`
- `11a63832` · ship · `SES-371` · SES-371 shipped at v7.0.461 (cb10b322f8b36fa2253af25dcb203611e847f831) on verdict 579c33a6-f8ad-4607-8ce3-6f2f7c7d1f55 · finalises Sep 15, 2:04 PM CST · `select public.reverse_decision('11a63832-2d15-4fb6-8047-099051551d45','John','<why>');`
- `a57a3d0b` · ticket-status · `SES-359` · SES-359 ships delivered, not done: the auto-done grant is refused because the verifier graded an empty diff and so coul… · finalises Sep 15, 2:45 PM CST · `select public.reverse_decision('a57a3d0b-f8f1-4c27-81d8-5e0ff24f3bf4','John','<why>');`
- `f2049e92` · ticket-scope · `SES-379` · File SES-379: since SES-336 gave the Builder the push, step 7a's verifier grades an empty diff, so the self-certifying-… · finalises Sep 15, 2:47 PM CST · `select public.reverse_decision('f2049e92-c357-4a38-99d8-7b747760f829','John','<why>');`
- `19f686cb` · ship · `SES-359` · SES-359 shipped at v7.0.462 (74b9d2fa3f73264a709bbc2297655c411c3fabf8) on verdict 6782e100-9be8-45cf-b5a9-57e20f5dd064 · finalises Sep 15, 2:48 PM CST · `select public.reverse_decision('19f686cb-d9c8-4eb4-b76e-9e4bb3966e20','John','<why>');`
- `65f83c9a` · ticket-status · `SES-377` · SES-377 ships delivered, not done: the auto-done grant is refused for the same reason as SES-359 one cycle earlier — th… · finalises Sep 15, 3:16 PM CST · `select public.reverse_decision('65f83c9a-542f-4484-bded-aaa51250213c','John','<why>');`
- `a1388cd7` · ship · `SES-377` · SES-377 shipped at v7.0.463 (fadf84acbddcce7156744adaa66c459e6fd133c8) on verdict 972e8667-cf43-4799-a64f-8876f33772b8 · finalises Sep 15, 3:17 PM CST · `select public.reverse_decision('a1388cd7-04c6-4253-a1ae-cc671d106f86','John','<why>');`
- `39d3aff6` · ticket-scope · `SES-380` · File SES-380: render-claude-state.js and its own size guard now disagree — a productive run of cycles renders CLAUDE-ST… · finalises Sep 15, 4:05 PM CST · `select public.reverse_decision('39d3aff6-807d-4935-9e38-2ae7375ab237','John','<why>');`

**616 final this week, 0 reversed this week** — *this week* is a **rolling 7 days** back from the stamp, not a calendar week and not a Friday-07:00Z reset: no such weekly-reset helper exists in this file or anywhere in `scripts/`, so a rolling window is what is used and is labelled as one. A reversal is the strongest negative signal the ladder takes (`M6-07`), so the second number is the one to read first.

**Judgment classes** — *as of 2026-09-12 22:06Z (Sep 12, 5:06 PM CST).* What the corpus currently holds per pull test, live from `public.judgment_class_census` (`SES-84`; the same view `SES-159` reads). Ratification is a standing metric (John, 2026-08-23: a class is never finished being learned), never a finish line.

| class | ratified | proposed | rejected | total |
|---|---:|---:|---:|---:|
| `P1 - Improves John's Skills` | 7 | 31 | 6 | 44 |
| `P2 - Inventive` | 0 | 54 | 6 | 60 |
| `P3 - Investor Value` | 0 | 52 | 7 | 59 |
| `P4 - New Customers` | 1 | 37 | 3 | 41 |
| `neutral` | 0 | 84 | 29 | 113 |

- Newest proposed root claim for P1: *no proposed root claim*.
- Newest proposed root claim for P2: `VC-ROOT-002` — New inventive features: white space and competitive differentiation. The bar is hard-to-replicate uniqueness — a feature competitors can easily copy (an admin…
- Newest proposed root claim for P3: `VC-SYN-001` — Investor value is the least-defined product goal because nobody has yet said what an investor would check. The drafts agree on one reading: the buyer is a skep…
- Newest proposed root claim for P4: `VC-ROOT-004` — New features that win new customers. The bar is buy-pull — functionality that makes a customer say "I have to buy this." Administrative capability (accounts, b…

**John-model** — *as of 2026-09-12 22:06Z (Sep 12, 5:06 PM CST).* How often a decision that leaned on a standing pattern of John's stood unreversed through its window, live from `public.john_model_signal` (`SES-004`; the criteria are `public.decision_patterns`, exported from `docs/JOHN-DECISION-PATTERNS.md`). A rate binds only from 30 finalised-or-reversed decisions (M7 gate, ruling iii).

- **99% agreement** over 103 finalised-or-reversed decisions (102 finalised unreversed, 1 reversed; 49 still open, 152 citing in total). A reversal is the strongest negative signal the ladder takes, so the second number is the one to read first.

| criterion | citing | final unreversed | reversed | open | rate |
|---|---:|---:|---:|---:|---:|
| `pattern:137` P1–P4 are pull tests, not category labels — administrative expectations never q… | 73 | 73 | 0 | 0 | 100% |
| `pattern:85` Don't gate small, reversible calls on his approval — decide and flag. | 43 | 15 | 1 | 27 | — |
| `pattern:0` No standing pattern applied -- new judgment. | 25 | 4 | 0 | 21 | — |
| `pattern:86` Process, tooling, and hygiene mechanics are fully delegated — decide and execut… | 8 | 8 | 0 | 0 | — |
| `pattern:149` Source showcase functionality from fresh research into live industry trends and… | 8 | 8 | 0 | 0 | — |

- A per-pattern `—` is not a zero: that criterion has not reached 30 finalised-or-reversed citations of its own, so it carries counts and no rate.

**Invention in use** — *as of 2026-09-12 22:06Z (Sep 12, 5:06 PM CST).* Criterion 7 (`docs/SELFBUILD-CHARTER.md`): at least one platform-originated feature — the Bench Report Card judge (`LOG-143`) — is measurably used by real visitors, live from `public.report_card_usage`. Counts only, never a rate.

- **7d:** 0 judge runs, 0 by real visitors (0 distinct).
- **30d:** 3 judge runs, 0 by real visitors (0 distinct).
- **all:** 3 judge runs, 0 by real visitors (0 distinct).

- *no real-visitor use yet.*

**Board by served class** — *as of 2026-09-12 22:06Z (Sep 12, 5:06 PM CST).* Which class each open ticket SERVES under the served-class test (`VC-MISSION-033`), ruled by The Prioritizer's `classify-ticket` and stored on `backlog_items.supports_class` — a ticket's own class is a different question and is not restated here.

| serves | open tickets |
|---|---:|
| `P1 - Improves John's Skills` | 81 |
| `P2 - Inventive` | 12 |
| `P3 - Investor Value` | 10 |
| `P4 - New Customers` | 2 |
| `P7 - Agent Creation` | 1 |
| *serves none* | 488 |

- *Negative ranks are John's own automation queue, seeded to sort ahead of anything assigned later (`SES-86`). The nightly re-rank writes 1..N and therefore sits below them — intended precedence, not a re-rank that failed.*

- **Top 5 by `automation_rank`:**
  -35. `SES-288` — A schema-range red can never be auto-reverted: one refused down-migration disables rollba… *(serves none)*
  -34. `SES-287` — The auto-rollback engine picks a stale green anchor and blames the last pusher for four c… *(serves none)*
  4. `SES-337` — The Verifier agent must reproduce the last 30 recorded verdicts before it grades a ship,… *(serves P1 - Improves John's Skills)*
  7. `AGT-70` — The Auditor: a governance agent that reviews agent data, governance docs, rules, directiv… *(serves P2 - Inventive)*
  8. `SES-348` — A full verify-ship verdict takes 54-57 s and postToAnthropicWithRetry() hard-aborts every… *(serves P3 - Investor Value)*

- Last scheduled re-rank: Sep 12, 1:46 AM CST.

**Governance agents, last 7 days** — *as of 2026-09-12 22:06Z (Sep 12, 5:06 PM CST).* Whether the platform's own agents (`agents.lane = 'governance'`) are doing the development work, live from `public.governance_agent_usage` and `public.ship_handoff_census` (`SES-360`). A **rolling 7 days** back from render time, like the decision counts above. Counts and token sums only, never a rate.

| role | source | calls | input tokens | output tokens |
|---|---|---:|---:|---:|
| Governance — Development Manager | `session` | 1 | 73405 | 2000 |
| Governance — Researcher | `session` | 9 | 1971842 | 196132 |
| Governance — Prioritizer | `mcp` | 1 | 1964 | 1240 |
| Governance — Prioritizer | `session` | 577 | 2081527 | 88523 |
| Governance — Prioritizer | *unlabelled* | 791 (787 untokened) | 20121 | 4652 |
| Governance — Designer | `session` | 7 | 1221647 | 77000 |
| Governance — Builder | `session` | 1 | 84992 | 0 |
| Governance — Verifier | `session` | 5 | 5352037 | 0 |
| Governance — Verifier | *unlabelled* | 1 | 1276 | 3568 |

- **Ships with all four handoff rows: 13 of 39** ships in the window (`SES-345`'s four: `automation_rank`, `kickoff_link`, a per-ticket push sha, a verdict row). Missing per leg: kickoff_link 24, per-ticket sha 22, automation_rank 3, verdict 0.
- *unlabelled* is a NULL `call_source` — the pre-attribution unknown, never read as automation (`LOG-128`); `untokened` rows carry no token counts at all (deterministic handler rows), so a large call count beside a small token sum is that, not a cheap model.

*Provenance: 889 board rows, payload `sha256:f8db1392147e8962`, as of 2026-09-12 22:06Z (Sep 12, 5:06 PM CST). The stamp says when this was last read; the sha says whether it still matches the tables. `--check` compares the sha, never the stamp — a refreshed stamp over identical facts is not drift.*
<!-- END GENERATED — scripts/render-standing-brief.js -->

**Next session:** none required — the runner is live and works **John's automation queue** (canonical: `docs/RUNNER-GOV-0820-REQUIREMENTS.md`): the queue is the board's leading sort key, not a list to read (`automation_rank`, v7.0.133) — `ORDER BY queue` already honours it. Classes are always written named, **`P1 - Improves John's Skills` → `P10 - Tooling`**; outcomes as plain words (“did not run”, “gated before build”); budget is two-track (API dollars + token governor). John judges from the briefing page. Runner pause: disable `deepbench-runner` at claude.ai/code/routines. **Board census measured 2026-08-23T12:5xZ by runner cycle `363b5138`, taken from the board after its own close-out recompute rather than carried forward:** **561 open tickets, 561 numbered, 0 open-but-unnumbered**, 611 rows total, **the standing Automation drain now has a FIXED finish line** — from `v7.0.179` (`SES-142`) it works the **18 members John named** on directive `b74009ea`, stored as `runner_drain_scope` FK rows, and a ticket filed into the epic *after* that naming **never joins it**: it queues normally and waits for him. The live `now` tier had already drifted to 19 against his 18. `drain_epic_next()` retires when those 18 are `done`/`removed`, and returns the new outcome **`unscoped`** — never a live-tier fallback — for any future drain declared without a list. Queue/drain state as of **v7.0.196** (2026-08-23 ~17:00Z, `successional-review` close-out, 561 rows renumbered): `SES-140` — *the successor fire is refused by the platform* and `SES-151` — *the scheduler runs on John's clock grid* are both **`done`**; the drain's nearest open member `SES-84` — *the vision corpus* (`needs-john`) waits on John's briefing decisions, so cycles step past it (`SES-114`) and work the board (`SES-121` — *shrink the `.claude/`-mutable surface* went `done` at v7.0.198; procedure text now lives in `docs/runbooks/`, cycle-writable). **The board's `title` column is trustworthy for display for the first time** (`SES-91`, v7.0.177): 98 rows that held a bare priority-class string now carry a real authored title, and the only `^P[0-9]+ - ` title left is `ADM-1`, whose title is a real sentence behind a stale class prefix and is deliberately left for `SES-117` to **accommodate** rather than repair. `SES-119` is now `done` (v7.0.184 + v7.0.185): the briefing renders `public.backlog_display_title(title, description)` rather than the read-time `gist` workaround, and **`runner-cycle.md`'s Language block now requires a ticket's title wherever John reads its ID**. Step 5's `gist` expression deliberately stays — it is still correct for any future row filed the old way, and 50 of 562 open numbered tickets still fall back to it. **From v7.0.195 the chain runs IN-SESSION (`SES-140` FINAL)** — a cycle that actually ran one (`shipped`/`gated_before_build`/`reverted`) and whose drain still returns `pick` opens its next `runner_cycles` row (trigger `chained (drain continuation)`) **in the same session** and re-enters the runbook at step 1; session-spawning is retired as platform-unsupported (`runner-cycle.md` tail step (8) carries the evidence). A **wall-stopped cycle continues nothing**, which keeps the budget wall a brake rather than a metronome. Proven live 2026-08-23: cycles `1fcd687e` → `a11c94d2`, the first chained row in the runner's life. **The briefing-redesign epic is finished** — `SES-129`, its last member, shipped in cycle `ed1a5eb3`. **A new filing rule binds from this version:** `runner_items.backlog_id` takes a **bare** ticket id or NULL and is enforced by `ck_runner_items_backlog_id_bare`; the display string belongs in `display_ref`, and the briefing's id chip reads `coalesce(backlog_id, display_ref)` (`SES-116`, v7.0.174 — `runner-cycle.md` step 9). **`design_status` reads for selection (`SES-114`, v7.0.165); among OPEN tickets measured at the v7.0.198 close-out:** 16 `designed` (incl. `SES-101`, flipped from `needs-desktop` — its one remaining edit now lives in `docs/runbooks/session-setup.md` step 3c, cycle-writable), **0 `needs-desktop`**, **1 `needs-john`** (`SES-84`), 546 `NULL` = not yet triaged, deliberately not guessed to `auto`. Measured at the v7.0.198 close-out: **11 of John's 18 named members remain open** (`SES-121` retired from the list by going `done` this session); the only `needs-john` member is `SES-84` — the rest are buildable, the drain reaches them and can retire on them. **`CHI-89`** still holds its queue slot with its removal card undecided — visible to John and skipped by cycles, exactly as `SES-113` intended. **`SES-133` is still open at `partial`** — the other half of John's 2026-08-23 emergencies directive; it sits at queue 251 rather than at the top, because the drain reads the Automation epic's `now` tier in queue order and `SES-133` is not in that epic. **From v7.0.182 John's own switches govern the cadence** (`SES-143`): the briefing's **§2b Automation panel** carries a scheduler checkbox + an every-N-hours box (live values: **on, 3 hours** — John's order 2026-08-23: the runner runs at **12/3/6/9 on his clock**, `SES-151`) and a drain checkbox, and `runner-cycle.md`'s **new step 1b** calls `public.scheduler_gate()` before anything else — a scheduled cycle arriving early closes `did_not_run` with *"paced by your scheduler setting"*, and with the scheduler off it closes *"scheduler off"*. **The cron stays hourly permanently by design** — a cycle cannot edit its own routine — and **from v7.0.196 (`SES-151`) the gate paces by John's clock grid**: a scheduled fire runs iff its row's `started_at` falls in an America/Chicago hour divisible by `interval_hours` (3 → **12/3/6/9 AM/PM his clock**, DST-proof; the mixed-clock elapsed test that wrongly paced 3 of 9 hourly fires is dead, `q-hourly-interval-boundary` answered by ship). Two consequences worth knowing before reading a quiet night as a stall: the gate **fails open** on every unknown, and it governs **scheduled** fires only, so a standing drain's chained continuation cycles run regardless — while the Automation drain stands, **the chain and not the interval is what actually sets the pace**. A manual fire (off the cron grid) is never paced; whether that is what John wants is the one thing the spec leaves open, asked as `q-manual-fire-pacing`. **From v7.0.188 that gate actually fires** (`SES-146`): until then `scheduler_gate()` matched the trigger by exact equality against the bare word `scheduled`, so a cycle passing the verbatim line step 1b asks for — `trigger: scheduled` — fell through to *"not a scheduled cycle"* and skipped **both** the pacing branch and the `scheduler_on = false` branch, and the grid test compared `now()`-at-step-1b rather than the fire time against a hardcoded ±2. Both failed open, so the panel looked live and bound nothing. The trigger is now normalised, the grid is anchored to the cycle row's own `started_at`, and the tolerance is the column `runner_settings.grid_tolerance_min` (10). **Silence is not a “no”** on any open question. **From v7.0.183 the board's open status is `open`, never `missing`** (`SES-118`): `backlog_items_status_check` now allows exactly `('open','partial','done','removal proposed','removed')` and the retired value raises `23514` — 510 rows renamed, `updated_at` deliberately untouched so step 8c's 30-day revalidation sweep still sees the sinking tail. **That consequence closed at v7.0.189** (attended session `ses118-gated`, 2026-08-23): step 3c's INSERT now writes `'open'`, zero `'missing'` literals remain under `.claude/`, and `SES-118` is `done` — its gated card `76564dde` awaits John's decision on the briefing page.
