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
## Live board state — generated, do not hand-edit — *as of 2026-09-24 00:53Z (Sep 23, 7:53 PM CST)*

> Rendered from the tables by `scripts/render-standing-brief.js` at every ship. **Every number below is derived; nothing here is maintained by hand.** The judgment prose beneath this block is the opposite — hand-maintained, deliberately, and this script never writes outside these markers. Where the two disagree about a number, this block is right and the sentence below is stale: say so rather than reconciling them by hand.

**Board census** — *as of 2026-09-24 00:53Z (Sep 23, 7:53 PM CST).* **691 open tickets**, 662 numbered, **29 open-but-unnumbered**, 970 rows total.

| `status` | rows | share of board |
|---|---:|---:|
| `open` | 571 | 58.9% |
| `done` | 267 | 27.5% |
| `removal proposed` | 49 | 5.1% |
| `partial` | 46 | 4.7% |
| `delivered` | 25 | 2.6% |
| `removed` | 12 | 1.2% |

**`design_status` among OPEN tickets** — *as of 2026-09-24 00:53Z (Sep 23, 7:53 PM CST).* Reads for selection (`SES-114`); `NULL` is *not* `auto`, it is not-yet-triaged and no cycle may backfill it.

| `design_status` | open rows | selection effect |
|---|---:|---|
| `NULL` | 620 | full ceremony — not yet triaged |
| `needs-decision` | 44 | — |
| `designed` | 19 | **not a skip** — build from `kickoff_link` (step 6 fast path) |
| `needs-desktop` | 7 | skipped, `record_skip()` — needs a session John attends (B39) |
| `auto` | 1 | full ceremony |

**Scheduler and automation settings** — *as of 2026-09-24 00:53Z (Sep 23, 7:53 PM CST).* §2b of the briefing, John's own switches, binding via `scheduler_gate()` at step 1b:

- Scheduler: **on**, every **1 hour** on John's clock grid (America/Chicago hours divisible by the interval — `SES-151`, DST-proof).
- Cron minute **40**, manual-fire tolerance **±10 min** (a start outside it is treated as a manual fire and is never paced).
- Standing daily max: **196M tokens**. This is rung 3 of five, **below** the 48h stale floor: a standing number must not defeat the staleness brake.

**Standing epic drain** — *as of 2026-09-24 00:53Z (Sep 23, 7:53 PM CST).* Created only by John; the runner may read one, never write one (`drain_epic_next()` property 5). The finish line is drawn from the members he **named** (`runner_drain_scope`), never the live `now` tier (`SES-142`) — and within that list it is the members a milestone **gate ruled required** (`milestone_required`, `SES-310`) whenever the list carries such a ruling, every named member otherwise.

- **No drain standing.** Selection is the class-sorted board exactly as it is with no drain declared.

**Open decisions** — *as of 2026-09-24 00:53Z (Sep 23, 7:53 PM CST).* Decisions made under `M6-02` that are still inside their reversal window (`runner_settings.reversal_window_hours` = 72h). Silence finalises them; to reverse one, run the line beside it (`docs/runbooks/session-setup.md` § Reversing a decision).

- `0d1c2781` · ticket-status · `SES-424` · Close-out: SES-424 settles 'partial' · finalises Sep 23, 7:28 PM CST · `select public.reverse_decision('0d1c2781-58c3-4af6-8287-e0796a8f5db5','John','<why>');`
- `49a30e17` · gate · `SES-424` · SES-424 closes; its three John-only items become three undecided gated_before_build cards that outlive the id -- the Ve… · finalises Sep 23, 8:20 PM CST · `select public.reverse_decision('49a30e17-cbf1-4a25-b94c-a33a1fb35ba5','John','<why>');`
- `bc0b76d1` · ticket-status · `SES-424` · Close-out: SES-424 settles 'delivered' · finalises Sep 23, 8:43 PM CST · `select public.reverse_decision('bc0b76d1-0702-4018-8e36-b58c0d4f1362','John','<why>');`
- `1a96ef08` · hygiene · `AGT-79` · Ticket Owner: 1 derivable cell fix(es) on 1 row(s) — cost 1 · claim 0 · type 0 · finalises Sep 24, 10:55 AM CST · `select public.reverse_decision('1a96ef08-9f18-492e-9e82-a0c8bd6a523b','John','<why>');`
- `19076837` · removal · `SES-434` · SES-434 proposed for removal: its premise is dead — the defer_status it says was silently reset was never persisted on… · finalises Sep 24, 11:06 AM CST · `select public.reverse_decision('19076837-2655-4f98-af7e-bc1fb687fd88','John','<why>');`
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

**157 final this week, 0 reversed this week** — *this week* is a **rolling 7 days** back from the stamp, not a calendar week and not a Friday-07:00Z reset: no such weekly-reset helper exists in this file or anywhere in `scripts/`, so a rolling window is what is used and is labelled as one. A reversal is the strongest negative signal the ladder takes (`M6-07`), so the second number is the one to read first.

**Decided for you** — *as of 2026-09-24 00:53Z (Sep 23, 7:53 PM CST).* What the runner DECIDED on your behalf, by CST day (`governance_rules.MANAGER-DECIDES-BY-DEFAULT`: *a daily list of what was decided, not questions*), with the questions that reached you anyway counted beside it — target zero. Not the `Open decisions` group above: that one is the undo list and drops a decision the moment it finalises; this one is the record of the day and keeps it. **16 decided on 2026-09-23**; **0 question(s) reached you in the last 7 days — target zero**; 17 still open.

| CST day | decided | reversed | questions to you |
|---|---:|---:|---:|
| `2026-09-23` | 16 | 0 | 0 |
| `2026-09-22` | 0 | 0 | 0 |
| `2026-09-21` | 2 | 0 | 0 |
| `2026-09-20` | 29 | 0 | 0 |
| `2026-09-19` | 8 | 0 | 0 |
| `2026-09-18` | 35 | 0 | 0 |
| `2026-09-17` | 0 | 0 | 0 |

**The 16 decided on 2026-09-23** — newest first.

- `be7bb00c` · resolve · `AGT-83` · AGT-83 done: 38 career records loaded over the MCP into public.career_records (3 target, 4 ladder_rung, 29 resume_fact,… · open
- `20e4130d` · scope · `AGT-82` · Jerry Maguire scope settled with John 2026-09-23: personal lane, closed store, ten Capabilities, tryout bar before the… · open
- `f2015f3a` · ticket-status · `AGT-103` · AGT-103 delivered (v7.0.558, 8bb2ffb8) and AGT-102 partial (slice 1 v7.0.559, 3a62e719; slice 2 = the builder's own sta… · open
- `12077e50` · filing · `AGT-104` · Filed AGT-104: run-project.js's refusal of a mutated state file omits the drift field agt-68 requires; the arm was dorm… · open
- `ac846f9f` · agent-row · `AGT-102` · au-behavior gains check routine-prompt-drift (24 checks) · open
- `2a4a8a87` · filing · `AGT-103` · Filed AGT-103: every ticket the Development Manager files from an Auditor finding goes into the Auditor Enhancements pr… · open
- `0c8446d9` · directive · — · Project Auditor Enhancements created and set executing as the builder's only project; AGT-87..97 (the Development Manag… · open
- `68209b78` · filing · `AGT-102` · Filed AGT-102: the Auditor checks the prompts the two routines actually run against their repo copies. · open
- `09d78d30` · ticket-status · `AGT-86` · AGT-86 settles delivered: all nine planned slices shipped as 16 kickoffs (v7.0.542-557); verifier e4253c97 blocked on i… · open
- `cd942b73` · agent-row · `AGT-86` · AGT-86 slice 9b: dm-audit-review-intent learns tighten, promote and checklist_edits · open
- `bc9f90d1` · agent-row · `AGT-86` · AGT-86: re-pin dm-knowledge-cycle-card 6a1c240089cf096c → fe7dc3e8c674527a · open
- `398dd7a5` · filing · `AGT-86` · Filed AGT-98..100 from AGT-86 build findings (leaked bypass secret in the public repo; Windows process.exit crash; untr… · open
- `cb459466` · filing · — · Audit review 2026-W39: 63 findings → 11 tickets, 6 not-a-defect, 0 carried, 0 escalated · open
- `decbb801` · agent-row · `AGT-86` · AGT-86 slice 7: the Auditor's checklist (23 checks in 5 jobs) in au-behavior, nine homes and the sixth kind in au-knowl… · open
- `aefd0627` · agent-row · `AGT-86` · AGT-86 slice 2a: review-audit-worklist capability, dm-audit-review-intent and six links for the Development Manager · open
- `0432d1c6` · re-scope · `AGT-86` · AGT-86 build plan approved by John as nine slices; the Development Manager files one ticket per root cause with no cap… · open

**Judgment classes** — *as of 2026-09-24 00:53Z (Sep 23, 7:53 PM CST).* What the corpus currently holds per pull test, live from `public.judgment_class_census` (`SES-84`; the same view `SES-159` reads). Ratification is a standing metric (John, 2026-08-23: a class is never finished being learned), never a finish line.

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

**John-model** — *as of 2026-09-24 00:53Z (Sep 23, 7:53 PM CST).* How often a decision that leaned on a standing pattern of John's stood unreversed through its window, live from `public.john_model_signal` (`SES-004`; the criteria are `public.decision_patterns`, exported from `docs/JOHN-DECISION-PATTERNS.md`). A rate binds only from 30 finalised-or-reversed decisions (M7 gate, ruling iii).

- **99.6% agreement** over 266 finalised-or-reversed decisions (265 finalised unreversed, 1 reversed; 19 still open, 285 citing in total). A reversal is the strongest negative signal the ladder takes, so the second number is the one to read first.

| criterion | citing | final unreversed | reversed | open | rate |
|---|---:|---:|---:|---:|---:|
| `pattern:0` No standing pattern applied -- new judgment. | 137 | 124 | 0 | 13 | 100% |
| `pattern:137` P1–P4 are pull tests, not category labels — administrative expectations never q… | 77 | 77 | 0 | 0 | 100% |
| `pattern:85` Don't gate small, reversible calls on his approval — decide and flag. | 48 | 47 | 1 | 0 | 97.9% |
| `pattern:96` When a gap surfaces outside the session's scope, log it with its own ID rather… | 12 | 11 | 0 | 1 | — |
| `pattern:86` Process, tooling, and hygiene mechanics are fully delegated — decide and execut… | 10 | 9 | 0 | 1 | — |

- A per-pattern `—` is not a zero: that criterion has not reached 30 finalised-or-reversed citations of its own, so it carries counts and no rate.

**Invention in use** — *as of 2026-09-24 00:53Z (Sep 23, 7:53 PM CST).* Criterion 7 (`docs/SELFBUILD-CHARTER.md`): at least one platform-originated feature — the Bench Report Card judge (`LOG-143`) — is measurably used by real visitors, live from `public.report_card_usage`. Counts only, never a rate.

- **7d:** 0 judge runs, 0 by real visitors (0 distinct).
- **30d:** 3 judge runs, 0 by real visitors (0 distinct).
- **all:** 3 judge runs, 0 by real visitors (0 distinct).

- *no real-visitor use yet.*

**Board by served class** — *as of 2026-09-24 00:53Z (Sep 23, 7:53 PM CST).* Which class each open ticket SERVES under the served-class test (`VC-MISSION-033`), ruled by The Prioritizer's `classify-ticket` and stored on `backlog_items.supports_class` — a ticket's own class is a different question and is not restated here.

| serves | open tickets |
|---|---:|
| `P1 - Improves John's Skills` | 82 |
| `P2 - Inventive` | 11 |
| `P3 - Investor Value` | 5 |
| `P4 - New Customers` | 2 |
| `P7 - Agent Creation` | 1 |
| *serves none* | 516 |

- *Negative ranks are John's own automation queue, seeded to sort ahead of anything assigned later (`SES-86`). The nightly re-rank writes 1..N and therefore sits below them — intended precedence, not a re-rank that failed.*

- **Top 4 by `automation_rank`:**
  -35. `SES-288` — A schema-range red can never be auto-reverted: one refused down-migration disables rollba… *(serves none)*
  4. `SES-337` — The Verifier agent must reproduce the last 30 recorded verdicts before it grades a ship,… *(serves P1 - Improves John's Skills)*
  5. `SES-392` — The meter reader fails silently: exit 2 from 13:15 CT to 19:20 CT on 2026-09-12 with no l… *(serves P2 - Inventive)*
  21. `SES-342` — Runbook shrink phase 2: the harvest, selection-beyond-the-pick and sweep rules get agents… *(serves none)*

- Last scheduled re-rank: Sep 20, 4:49 PM CST.

**Governance agents, last 7 days** — *as of 2026-09-24 00:53Z (Sep 23, 7:53 PM CST).* Whether the platform's own agents (`agents.lane = 'governance'`) are doing the development work, live from `public.governance_agent_usage` and `public.ship_handoff_census` (`SES-360`). A **rolling 7 days** back from render time, like the decision counts above. Counts and token sums only, never a rate.

| role | source | calls | input tokens | output tokens |
|---|---|---:|---:|---:|
| Governance — Development Manager | `session` | 13 (6 untokened) | 668580 | 0 |
| Governance — Researcher | *no calls in the window* | 0 | — | — |
| Governance — Prioritizer | `session` | 7 (3 untokened) | 0 | 0 |
| Governance — Prioritizer | *unlabelled* | 221 (221 untokened) | 0 | 0 |
| Governance — Designer | `session` | 38 (31 untokened) | 1641268 | 0 |
| Governance — Builder | `session` | 31 (24 untokened) | 1778970 | 0 |
| Governance — Verifier | *no calls in the window* | 0 | — | — |
| Governance — Auditor | `session` | 12 | 524196 | 88663 |
| Governance — Ticket Owner | `session` | 6 | 0 | 0 |

- **Ships with all four handoff rows: 9 of 9** ships in the window (`SES-345`'s four: `automation_rank`, `kickoff_link`, a per-ticket push sha, a verdict row). Missing per leg: kickoff_link 0, per-ticket sha 0, automation_rank 0, verdict 0.
- *unlabelled* is a NULL `call_source` — the pre-attribution unknown, never read as automation (`LOG-128`); `untokened` rows carry no token counts at all (deterministic handler rows), so a large call count beside a small token sum is that, not a cheap model.

**Auditor's ledger** — *as of 2026-09-24 00:53Z (Sep 23, 7:53 PM CST).* What `public.audit_findings` (`AGT-70`) holds and what has left it for the board. Counts only, never a rate. Latest week 2026-W39: **34 findings (0 open · 0 resolved · 4 not a defect)** — **0 ruled** open findings (a ruled, open, `high` row is what `tripwire-to-backlog.js --from-ledger` files, at most 3 per ISO week); **0 filed** to the board from the ledger so far (`source_file = 'audit-ledger'`).

| fingerprint | kind | confidence | fact | ruled |
|---|---|---|---|---|

- *A finding leaves this table only by John's ruling — `resolved`, `not-a-defect`, or ruled and left `open` to file. Candidates a run found but nobody ingested live in `docs/audits/<week>-candidates.json`, not here.*

**Ticket hygiene, last night** — *as of 2026-09-24 00:53Z (Sep 23, 7:53 PM CST).* What the Ticket Owner (`AGT-79`) left on the board: `public.ticket_owner_findings` open rows by check, the newest `hygiene` decision and the newest nightly cycle row. Counts only, never a rate. **198 open findings** across 8 check(s).

| check | open | oldest | nights open |
|---|---:|---|---:|
| `actual-unknown` | 82 | Sep 12, 10:31 PM CST | 10 |
| `verdict-missing` | 43 | Sep 12, 10:31 PM CST | 10 |
| `size-missing` | 25 | Sep 12, 10:31 PM CST | 10 |
| `type-off-taxonomy` | 17 | Sep 12, 10:31 PM CST | 10 |
| `delivered-unaccepted` | 16 | Sep 12, 10:31 PM CST | 10 |
| `quote-missing` | 7 | Sep 12, 10:31 PM CST | 10 |
| `remainder-stranded` | 6 | Sep 18, 5:38 AM CST | 5 |
| `cycles-over-quote` | 2 | Sep 12, 10:31 PM CST | 10 |

- Last run: `06b67d4a` · shipped · Sep 21, 10:55 AM CST · 890 rows · 199 findings (1 derivable · 198 judgment) · behind the fences: quote 525 · size 493 · cost 45 · verdict 97 · unrevalidated>30d 428 · attended-actual null 287 · fixed 1 · findings +12 ~186 −0 · decision 1a96ef08-9f18-492e-9e82-a0c8bd6a523b — reversible until 2026-09-24T15:55:08.52829+00:00 · judged 1/0/0 on claude-fable-5-1
- Judgment: **the newest night was judged** — 0 unjudged nights on top, over the newest 9 on record.
- Decision `1a96ef08` · open · Ticket Owner: 1 derivable cell fix(es) on 1 row(s) — cost 1 · claim 0 · type 0 · finalises Sep 24, 10:55 AM CST · `select public.reverse_decision('1a96ef08-9f18-492e-9e82-a0c8bd6a523b','John','<why>');`

**Staff watch** — *as of 2026-09-24 00:53Z (Sep 23, 7:53 PM CST).* What the Development Manager (`SES-378`) recorded about the runner's own agents: `public.runner_staff_findings` rows per `agent_id`, with the distinct fingerprints and the distinct CYCLES behind them. Counts only, never a rate. **13 finding(s)** across 2 agent(s).

| agent | findings | distinct fingerprints | distinct cycles | newest |
|---|---:|---:|---:|---|
| `designer` | 11 | 5 | 10 | Sep 23, 2:35 PM CST |
| `devmanager` | 2 | 2 | 2 | Sep 18, 7:45 AM CST |

**Human gates** — *as of 2026-09-24 00:53Z (Sep 23, 7:53 PM CST).* The two reads that say whether anything is waiting on a human: open `backlog_items` carrying `design_status = 'needs-john'`, and `gated_before_build` `runner_items` left with `decision IS NULL` (`M6-01`). Board state, written by no code in this repo — which is why it is REPORTED here and not asserted as a gate by the regression suite. **0 open `needs-john` ticket(s)**, **15 undecided `gated_before_build` card(s)**.

- **Undecided gated cards (15):** `449826c5-7d9e-46ea-80df-ce8785adeaa8`, `54b42eea-be4f-434d-963a-6707873bc137`, `7991ffae-60df-4621-9134-32f79dfca50b`, `ba7390e0-f506-4269-be1b-990e792528a1`, `2d5441c7-5133-4b21-9768-7921dce0c409` …and 10 more
- *Open is not wrong.* A card nobody has answered yet is a real board state; what it is NOT is a regression, so nothing in the suite goes red for it.

*Provenance: 970 board rows, payload `sha256:4e907863c504e5a5`, as of 2026-09-24 00:53Z (Sep 23, 7:53 PM CST). The stamp says when this was last read; the sha says whether it still matches the tables. `--check` compares the sha, never the stamp — a refreshed stamp over identical facts is not drift.*
<!-- END GENERATED — scripts/render-standing-brief.js -->

**Next session:** none required — the runner is live and works **John's automation queue** (canonical: `docs/RUNNER-GOV-0820-REQUIREMENTS.md`): the queue is the board's leading sort key, not a list to read (`automation_rank`, v7.0.133) — `ORDER BY queue` already honours it. Classes are always written named, **`P1 - Improves John's Skills` → `P10 - Tooling`**; outcomes as plain words (“did not run”, “gated before build”); budget is two-track (API dollars + token governor). John judges from the briefing page. Runner pause: disable `deepbench-runner` at claude.ai/code/routines. **Board census measured 2026-08-23T12:5xZ by runner cycle `363b5138`, taken from the board after its own close-out recompute rather than carried forward:** **561 open tickets, 561 numbered, 0 open-but-unnumbered**, 611 rows total, **the standing Automation drain now has a FIXED finish line** — from `v7.0.179` (`SES-142`) it works the **18 members John named** on directive `b74009ea`, stored as `runner_drain_scope` FK rows, and a ticket filed into the epic *after* that naming **never joins it**: it queues normally and waits for him. The live `now` tier had already drifted to 19 against his 18. `drain_epic_next()` retires when those 18 are `done`/`removed`, and returns the new outcome **`unscoped`** — never a live-tier fallback — for any future drain declared without a list. Queue/drain state as of **v7.0.196** (2026-08-23 ~17:00Z, `successional-review` close-out, 561 rows renumbered): `SES-140` — *the successor fire is refused by the platform* and `SES-151` — *the scheduler runs on John's clock grid* are both **`done`**; the drain's nearest open member `SES-84` — *the vision corpus* (`needs-john`) waits on John's briefing decisions, so cycles step past it (`SES-114`) and work the board (`SES-121` — *shrink the `.claude/`-mutable surface* went `done` at v7.0.198; procedure text now lives in `docs/runbooks/`, cycle-writable). **The board's `title` column is trustworthy for display for the first time** (`SES-91`, v7.0.177): 98 rows that held a bare priority-class string now carry a real authored title, and the only `^P[0-9]+ - ` title left is `ADM-1`, whose title is a real sentence behind a stale class prefix and is deliberately left for `SES-117` to **accommodate** rather than repair. `SES-119` is now `done` (v7.0.184 + v7.0.185): the briefing renders `public.backlog_display_title(title, description)` rather than the read-time `gist` workaround, and **`runner-cycle.md`'s Language block now requires a ticket's title wherever John reads its ID**. Step 5's `gist` expression deliberately stays — it is still correct for any future row filed the old way, and 50 of 562 open numbered tickets still fall back to it. **From v7.0.195 the chain runs IN-SESSION (`SES-140` FINAL)** — a cycle that actually ran one (`shipped`/`gated_before_build`/`reverted`) and whose drain still returns `pick` opens its next `runner_cycles` row (trigger `chained (drain continuation)`) **in the same session** and re-enters the runbook at step 1; session-spawning is retired as platform-unsupported (`runner-cycle.md` tail step (8) carries the evidence). A **wall-stopped cycle continues nothing**, which keeps the budget wall a brake rather than a metronome. Proven live 2026-08-23: cycles `1fcd687e` → `a11c94d2`, the first chained row in the runner's life. **The briefing-redesign epic is finished** — `SES-129`, its last member, shipped in cycle `ed1a5eb3`. **A new filing rule binds from this version:** `runner_items.backlog_id` takes a **bare** ticket id or NULL and is enforced by `ck_runner_items_backlog_id_bare`; the display string belongs in `display_ref`, and the briefing's id chip reads `coalesce(backlog_id, display_ref)` (`SES-116`, v7.0.174 — `runner-cycle.md` step 9). **`design_status` reads for selection (`SES-114`, v7.0.165); among OPEN tickets measured at the v7.0.198 close-out:** 16 `designed` (incl. `SES-101`, flipped from `needs-desktop` — its one remaining edit now lives in `docs/runbooks/session-setup.md` step 3c, cycle-writable), **0 `needs-desktop`**, **1 `needs-john`** (`SES-84`), 546 `NULL` = not yet triaged, deliberately not guessed to `auto`. Measured at the v7.0.198 close-out: **11 of John's 18 named members remain open** (`SES-121` retired from the list by going `done` this session); the only `needs-john` member is `SES-84` — the rest are buildable, the drain reaches them and can retire on them. **`CHI-89`** still holds its queue slot with its removal card undecided — visible to John and skipped by cycles, exactly as `SES-113` intended. **`SES-133` is still open at `partial`** — the other half of John's 2026-08-23 emergencies directive; it sits at queue 251 rather than at the top, because the drain reads the Automation epic's `now` tier in queue order and `SES-133` is not in that epic. **From v7.0.182 John's own switches govern the cadence** (`SES-143`): the briefing's **§2b Automation panel** carries a scheduler checkbox + an every-N-hours box (live values: **on, 3 hours** — John's order 2026-08-23: the runner runs at **12/3/6/9 on his clock**, `SES-151`) and a drain checkbox, and `runner-cycle.md`'s **new step 1b** calls `public.scheduler_gate()` before anything else — a scheduled cycle arriving early closes `did_not_run` with *"paced by your scheduler setting"*, and with the scheduler off it closes *"scheduler off"*. **The cron stays hourly permanently by design** — a cycle cannot edit its own routine — and **from v7.0.196 (`SES-151`) the gate paces by John's clock grid**: a scheduled fire runs iff its row's `started_at` falls in an America/Chicago hour divisible by `interval_hours` (3 → **12/3/6/9 AM/PM his clock**, DST-proof; the mixed-clock elapsed test that wrongly paced 3 of 9 hourly fires is dead, `q-hourly-interval-boundary` answered by ship). Two consequences worth knowing before reading a quiet night as a stall: the gate **fails open** on every unknown, and it governs **scheduled** fires only, so a standing drain's chained continuation cycles run regardless — while the Automation drain stands, **the chain and not the interval is what actually sets the pace**. A manual fire (off the cron grid) is never paced; whether that is what John wants is the one thing the spec leaves open, asked as `q-manual-fire-pacing`. **From v7.0.188 that gate actually fires** (`SES-146`): until then `scheduler_gate()` matched the trigger by exact equality against the bare word `scheduled`, so a cycle passing the verbatim line step 1b asks for — `trigger: scheduled` — fell through to *"not a scheduled cycle"* and skipped **both** the pacing branch and the `scheduler_on = false` branch, and the grid test compared `now()`-at-step-1b rather than the fire time against a hardcoded ±2. Both failed open, so the panel looked live and bound nothing. The trigger is now normalised, the grid is anchored to the cycle row's own `started_at`, and the tolerance is the column `runner_settings.grid_tolerance_min` (10). **Silence is not a “no”** on any open question. **From v7.0.183 the board's open status is `open`, never `missing`** (`SES-118`): `backlog_items_status_check` now allows exactly `('open','partial','done','removal proposed','removed')` and the retired value raises `23514` — 510 rows renamed, `updated_at` deliberately untouched so step 8c's 30-day revalidation sweep still sees the sinking tail. **That consequence closed at v7.0.189** (attended session `ses118-gated`, 2026-08-23): step 3c's INSERT now writes `'open'`, zero `'missing'` literals remain under `.claude/`, and `SES-118` is `done` — its gated card `76564dde` awaits John's decision on the briefing page.
