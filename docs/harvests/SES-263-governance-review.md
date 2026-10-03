<!-- DeepBench v7.0.346 | docs/harvests/SES-263-governance-review.md | SES-263 — full report of the read-only Principal AI Platform Architect audit (kickoff: docs/kickoffs/v7.0.346-SES-263-selfbuild-governance-review.md). Findings filed as SES-264..SES-269; F5/F6/F7/F11 map to existing tickets/questions. -->
# SES-263 — Selfbuild governance & charter review (v7.0.346, read-only audit)

**Auditor posture:** independent Principal AI Platform Architect; every claim below was verified in-session against the repo worktree, the live Supabase project `rallojeqnkgtxgsdsnqm` (SELECT only), and the committed CI wiring. Where a doc and the system disagree, both sides are cited. Parent-session spot-checks confirmed F1 verbatim (charter line 264) and F12 directionally (2 NULL-class open rows by direct query vs 4 "unpickable" by tripwire 3e, which also counts malformed class strings).

**Evidence base (primary):** `docs/SELFBUILD-CHARTER.md` (last commit `2d419a2f`, v7.0.213, 2026-08-23), `docs/GOVERNANCE-MODES.md`, `docs/ARCHITECTURE.md` §19v, `docs/governance/RULES-SNAPSHOT.md` (84 rows; last regenerated v7.0.244, 2026-08-25), `.github/workflows/ci.yml` (v7.0.339), `scripts/check-session-docs.js` (run live: 83 FLAG / 20 WARN; `--gate` verdict "clear", exit 0), `scripts/verifier.js`, `scripts/rollback-on-red.js`, `docs/runbooks/runner-cycle.md`, `docs/runbooks/standing-brief.md`, `docs/SELFBUILD-RETIREMENT-LEDGER.md`, and live queries against `epics`, `backlog_items`, `runner_cycles`, `runner_items`, `runner_verdicts`, `runner_skips`, `runner_settings`, `runner_questions`, `runner_drain_scope`, `governance_rules`, `ci_run_conclusions` (2026-08-31).

---

## Q1 — Where the project sits against the charter

### Milestone state (live query, epics ⋈ backlog_items, 2026-08-31)

| Epic | done | open-ish | total | State |
|---|---|---|---|---|
| M0 - Backup & Rollback | 2 | 0 | 2 | Drained; gate review run (retroactive) and Accepted 2026-08-24 |
| M1 - Consolidation | 8 | 2 | 10 | Reviewed & Accepted 2026-08-24; residue `SES-43`, `SES-52` both john-paced |
| M2 - Truth Infrastructure | 14 | 4 | 20 | Drain fully closed; gate review Accepted 2026-08-25 (filed SES-199..202 into M3); residue `SES-002` (john-paced), `SES-54`/`SES-237` (needs-desktop), `SES-246` (partial, needs-john) |
| M3 - Independent Verification | 38 | 0 | 42 | Fully closed; gate review Accepted 2026-08-30T22:54Z; its Accept filed M4's members and declared the M4 drain |
| M4 - Infrastructure Floor | 8 | 7 | 15 | **In progress.** Design gate `SES-183` done 2026-08-31 (cycle `ab2948c6`, v7.0.343). John's standing drain (directive `4583bdc1`, 9 members) has 4 open: `HAR-34`, `SES-244`, `SES-261`, `SES-47` |
| M5 - Closed-Loop Healing | 3 | 4 | 7 | Gate `SES-184` not designed (open, later tier) |
| M6 - Autonomy Graduation | 1 | 2 | 3 | Gate `SES-185` not designed (open, later tier) |
| M7 - The Inventor | 1 | 5 | 6 | Gate `SES-186` not designed (open, later tier) |

The gate-review machinery the charter mandates is demonstrably operating: four reviews run and Accepted (M0–M3), successor-member filing per closure-discipline rule 3, and cycles carry a gate-review sweep step (step 8d, "0 rows owed" observed in cycle `69725495`).

### Definition-of-success criteria — per-criterion verdict

**Criterion 1 — unattended-run test (14 consecutive days, ≥90% zero-touch, John <30 min/day, machine plays no required role): NOT MET (not yet demonstrable).** Runner live 2026-08-20 → 12 calendar days, window not clean: 2026-08-26 all 13 fires `did_not_run — scheduler off` (governed pause); 2026-08-27 **zero** `runner_cycles` rows all day, unexplained (F13). Zero-touch share measured: of 59 ship cards since 2026-08-28, 45 landed `done` without John's tap (≈76%), 5 `delivered`, 3 `partial` — below 90%. `needs-desktop` tickets still exist; briefing republish was refused to unattended cycles for part of 2026-08-31 (F6). The measurement panel exists (`SES-178` done); the clock has never been started clean.

**Criterion 2 — verification proves itself (catch rate ≥ John's baseline, reversal ≤5%, zero ungrounded claims): NOT MET on the keystone half; reversal half green; grounding half CLAIMED-BUT-UNVERIFIABLE.** `runner_verdicts`: 72 approve / 36 block — but every recorded block is a false alarm (John's ruling cited in `rollback-on-red.js` header: "the lane's first 15 recorded blocks were all false (SES-213)"; open question `7f64dae8` proposes marking 26 rows as artifacts, unanswered). The briefing renders "Verifier catch rate 30.0% — your Rework/Reverse rate 0.0%" — the graduation metric counts false positives as catches (F7). Reversal on auto-done: 0 Reverses since 2026-08-24 (3 all-time). No mechanical grounding *gate* exists — grounding is enforced by convention.

**Criterion 3 — truth stays true (~0 drift for 4 weeks; founding audit re-run clean): NOT MET.** Tripwire live: 83 FLAG / 20 WARN (gating classes 9/10/11 clear; FLAGs already filed). The 4-week clock hasn't begun, and this audit — a partial re-run of the founding audit's method — found live drift (F1, F2, F4, F5, F10): the exit-exam re-run would fail today.

**Criterion 4 — healing closes its loop: NOT MET.** Detection live (heal engine each cycle, B33, files with `source_file='heal-engine'`); failure→fix→confirmed-fixed→recurrence-redetect is M5's subject and `SES-184` is undesigned. The charter permits a deliberately seeded failure — the cheap path.

**Criterion 5 — resilience drilled: MET (restore); MET-WITH-DECISION-PENDING (rollback).** Restore drill run twice: 2026-08-28 (v7.0.292) scored 32.8% with four defects root-caused; after `SES-216`/`SES-223`/`SES-230`, re-run 2026-08-29 (v7.0.320) scored **99.996%** (54,522 rows, 0 tables missing rows; prior drill as negative control) — `SES-191` done, accepted; residual defects `SES-241`/`SES-242` closed. Rollback: `SES-256` done 2026-08-31 (v7.0.341) — end-to-end drill on the scratch project: real red, negative controls both directions, revert executed verbatim, four proofs, zero blast radius. Deliberately did NOT seed a red on real dev; open question `9b57e272` asks whether the controlled drill satisfies the criterion — John's call, not engineering.

**Criterion 6 — backlog healthier, not just smaller: PARTIALLY MET; lead-time half CLAIMED-BUT-UNVERIFIABLE.** Baseline (2026-08-23): 569 open / 290 now. Live: 499 open + 47 partial + 27 removal-proposed; 239 open in `now`. `done` grew 86→149 while total rows grew 670→744: closes outpace files. But open rows lack classes (F12: 2–4 unpickable), and 549 open rows have NULL design status — under a literal reading the criterion binds; John should bless NULL-as-valid or it fails. Lead-time-below-baseline: no measurement found.

**Criterion 7 — invention proven end-to-end once: NOT MET.** M7 undesigned (`SES-186` open); `SES-159`/`SES-160` open; `SES-004` partial with its own gate failing on dev (`SES-246`: 60 ungrounded quotes, gate not in CI). No platform-originated feature has completed researched→ratified→built→shipped→measurably-used.

**Criterion 8 — the machine outlives the project: PARTIALLY MET.** Project panel (`SES-178`) + verifier scoreboard (`SES-181b`) + durable ledgers are standing. Not yet standing: John-minutes, cost-per-delivery trend, invention acceptance, visitor usage.

**Summary: M0–M3 are genuinely built, reviewed, and evidence-backed — backup, truth registry, portable CI, verdict-only verifier, and the auto-rollback engine are real, not prose.** Of 8 exit criteria: 1 MET, 1 met-pending-one-tap, 2 partial, 4 not met — and three of the four are demonstrations/clock-time, not construction gaps.

---

## Q2 — What is genuinely left

**Engineering (open Selfbuild tickets, 24 rows live-queried):**

*In John's current drain (directive `4583bdc1`):* `SES-261` (CI red-by-construction — 8 of 13 `ci_run_conclusions` rows since 2026-08-30 carry a failure), `SES-244` (unattended briefing republish — plus duplicates `SES-257`, `SES-237`; possibly premise-dead, F6), `HAR-34` (spend-gate alerting), `SES-47` (deploy-cap insurance, partial, spend → John).

*Gates not yet designed (rolling-wave, by charter design):* `SES-184` (M5), `SES-185` (M6), `SES-186` (M7).

*Criterion-bearing residue:* `SES-004` + `SES-246` (John-model / criterion 7), `SES-159`/`SES-160` (invention loop), the unclassed open rows (criterion 6), `SES-247` (chain-gate defect, needs-john).

*Deferred/parked:* `SES-43`, `SES-52`, `SES-002`, `SES-54`, `DAT-25`, `SES-260`, `SES-82`, `SES-161`, `SES-122`.

**Decisions pending John (taps, not work)** — the runner correctly parked on these ("23 open, EVERY ONE flagged needs-john / needs-desktop / john-paced or blocked_by; zero buildable", cycle `69725495`):
- Rollback-drill sufficiency (`runner_questions` `9b57e272`) and the restore-**apply** lane (unanswered defaults to list-only).
- Briefing-republish trio close/merge (`4da29187`).
- Verifier false-block artifact marking (`7f64dae8`) — gates the criterion-2 keystone metric.
- `SES-246` disposition (fix the 60 quotes, wire to CI, or re-scope).
- Park/chain questions: `ce3df658`, `39a24156`, `a45c3469`, `4bce9893`, `15868260`, `10b3a289`.
- **~90 undecided briefing cards** (`runner_items.decision IS NULL`) — the govern-by-exception surface is accumulating faster than it is read.
- Bookkeeping: `ad624e3b`, `6d4a8918` still open though answered on card `2c136c5b` (F8 → `SES-267`).

---

## Q3 — Drift: where prose disagrees with the built system

### The instruments, audited first

**Truth tripwire (`SES-176`, `scripts/check-session-docs.js`).** Checks 1–8 are size/shape ratchets; 9/10/11 are the truth-registry classes (retired rules cited live — ID-anchored only; `canonical_doc` resolution; `{{rule:ID}}` markers); 12 (WARN-only) finds restatements. The CI `--gate` fails only on FLAGs in 9/10/11, fail-closed on unreadable snapshot. Verified live: gate "clear", exit 0, over 83 non-gating FLAGs. **Structurally uncovered:** (a) prose carrying no rule ID — the charter, §19v narrative, GOVERNANCE-MODES cadence numbers; (b) snapshot-vs-live-table freshness (reads the snapshot only, by design); (c) numeric doc-vs-DB drift; (d) runbook-vs-script behavior; (e) the standing brief's generated block (renderer has `--check`; nothing invokes it). **Every confirmed drift finding below sits in exactly this uncovered surface — the tripwire is green while the charter is 8 days wrong, because the charter is not in any check's population.**

**Reviewer lane (`SES-181`, `scripts/verifier.js`).** Verdict-only, fail-closed (skipped ≠ green, double-enforced by `ck_runner_verdicts_fail_closed`), cannot edit, refuses self-certifying paths, reads eligibility from the board, reads §2f live from the directive row so it lapses on its own terms. Runs exactly three gates: build, regression suite, tripwire `--gate`. **Not covered:** deploy currency, browser console, before-image presence, charter conformance, the briefing publish, all doc drift outside 9/10/11 — and by John's ruling (card `2c136c5b` Q1) a verifier block triggers no rollback.

### Confirmed drift (both sides cited in the findings): F1 charter status frozen at "Awaiting John's mark"; F2 §19v still calls Automated mode unbuilt; F3 rules snapshot lags a same-day registry amendment with no freshness gate; F4 standing-brief block frozen 7 days because no runbook step invokes its renderer; F5 runner-cycle.md asserts the render-lag "no gate checks" while CI reds on it 8 of 13 times; F6 three tickets say the briefing can't republish unattended while a cycle did it today; F7 the 30% "catch rate" is built from all-false blocks; F10 charter decision 2 superseded in live code by unrecorded §2f.

---

## Q4 — 80/20: CLOSE vs LATER, and the shortest credible path

**CLOSE bucket** (bar: "the project cannot honestly be called closed and working without it"):

| # | Item | Why it clears the bar |
|---|---|---|
| C1 | `SES-261` (CI red-by-construction) | Red-on-most-ships trains everyone to ignore red and pollutes the rollback anchor — corrodes what M3 built. In John's drain. |
| C2 | Briefing-publish reliability: answer `4da29187`; keep `SES-244` only if the refusal recurs; close `SES-237`/`SES-257` as duplicates | The briefing is the entire govern-by-exception surface. |
| C3 | One truth-pass cycle (→ `SES-264`, `SES-265`) | The charter is the exit exam's answer key; criterion 3 re-runs the founding audit and would find exactly these. |
| C4 | John's decision batch: drill sufficiency, restore-apply lane, artifact marking, `SES-246`, chain questions, a pass over the ~90 undecided cards | The runner parked on decisions, not work. Zero engineering, pure throughput. |
| C5 | `SES-184` M5 gate, minimal: design + one **seeded** failure through the full heal loop | Charter explicitly allows a seeded failure; detection already runs every cycle. Cheapest whole criterion on the board. |
| C6 | `SES-186` M7 gate, minimal: one invention end-to-end + enough of `SES-004`/`SES-246` to report John-model accuracy once | Criterion 7 requires exactly one; real-visitor usage makes it the longest calendar pole — start early. |
| C7 | `SES-185` M6 gate: score criterion 2 only after the artifact ruling; if the verifier hasn't earned authority, record "caps stay" | Under elastic autonomy, "caps stay" is a legitimate closing answer. No cap retires before its replacement is green. |
| C8 | Declare the clean 14-day window (criteria 1+3 concurrently on the Project panel), then the final `SES-179` exit exam incl. founding-audit re-run | No construction — it is the clock; runs underneath C5–C7. |
| C9 | `HAR-34` | Solely because John named it into the current drain; pure 80/20 would park it. |

**Shortest credible ordered path:** C1 → C4 (one sitting of taps) → C2 → C3 → start C8's clock → C5 → C6 → C7 → final exit exam. Irreducible calendar: the 14-day window and criterion 7's real-visitor usage; the rest is ~4–6 runner cycles plus one attended decision sitting.

**LATER bucket (parked, explicitly):** `SES-43`, `SES-52`, `SES-002`, `SES-54`, `DAT-25`, `SES-260`, `SES-82`, `SES-161`, `SES-122`, `SES-247`, `SES-47`, `SES-266` (snapshot freshness), `SES-267` (question lifecycle), `SES-268` (SESSIONS.md rotation), `SES-269` (no-fire watchdog), F11, the 83 advisory tripwire FLAGs, and the founding audit's residual polish. Test they fail for CLOSE: none of these can make the platform lie to John or lose work.

---

## Q5 — Business summary (standalone, for a CEO)

**What the company bought.** Over roughly two weeks, the team turned a working prototype of a self-improving software platform into something closer to a governed factory. The system now picks its own work from a priority list, designs, builds, tests, and ships improvements to a staging environment around the clock, and writes down everything it does in permanent, queryable records. The owner no longer supervises the work; he reads a daily briefing and taps Accept, Redo, or Undo. In the last four days measured, about three quarters of finished work shipped and closed with no human action at all, and not one shipment in the last week has had to be undone.

**What the safety net is worth.** Four protections were built and — more importantly — proven by rehearsal rather than asserted. First, a full disaster-recovery drill: the team restored the entire database from backup onto a clean environment; the first attempt recovered only a third of the data, the defects were fixed, and the re-run recovered 99.996% — the difference between believing you have backups and knowing you do. Second, an automatic-undo drill: a deliberately broken change was detected and reverted to the last known-good state by machinery, end to end, with proofs. Third, an independent checkpoint: every shipment is graded by a separate verifier that cannot edit anything and fails safe when in doubt, plus a cloud test gate that no longer depends on any single person's laptop. Fourth, one source of truth: the rules of operation live in a registry, and an automated tripwire catches documents that contradict it. Each of these converts a class of silent, potentially unbounded loss — lost data, a bad change compounding overnight, a rubber-stamp review, rules nobody actually follows — into a bounded, visible event.

**What it means for scaling.** The marginal cost of additional work is now a ticket and machine time, not headcount. The owner's involvement is by exception — decisions and reversals — and the system parks itself safely when it runs out of decisions rather than guessing. The constraint on throughput has visibly shifted from building to deciding: about ninety items currently await the owner's read, which is the right bottleneck to have, but a real one.

**What is honestly not done.** The project's own exam has eight criteria; today it passes one outright, one pending a single owner decision, two partially, and four not yet. The unproven four are mostly demonstrations rather than construction: a clean 14-day fully-unattended run has never been clocked; the self-healing loop detects failures but has not yet carried one through to a confirmed fix without help; the platform has not yet invented, shipped, and seen real users adopt a feature of its own; and the independent verifier has not yet demonstrated it catches real defects — every rejection it has issued so far was a false alarm, so its scorecard cannot yet be trusted as grounds for more autonomy. There is also one live operational sore: a timing bug makes the test dashboard show red on most legitimate shipments, which trains people to ignore red and must be fixed first. Finishing is estimated at a handful of automated work cycles, one sitting of owner decisions, and about two calendar weeks of measured unattended running — modest cost, and worth paying, because until the exam passes, the honest claim is "a governed factory with its safety net proven," not yet "a factory proven to run alone."

---

## Findings → disposition map

| F# | One-line claim | Disposition |
|---|---|---|
| F1 | Charter Execution status frozen at "Awaiting John's mark" (line 264, v7.0.213) while M0–M3 are done | `SES-264` (CLOSE) |
| F2 | §19v (~2519, ~2742) still describes Automated mode as structurally unselectable/unbuilt; LIVE since 2026-08-20 | `SES-264` (CLOSE) |
| F3 | RULES-SNAPSHOT.md lags a same-day `governance_rules` B21 amendment; nothing asserts freshness | `SES-266` (LATER) |
| F4 | standing-brief "rendered at every ship" block frozen 7 days; runbook never invokes `render-standing-brief.js`; census/token/cadence numbers wrong | `SES-265` (CLOSE) |
| F5 | CI red on 8 of 13 runner ships by construction; runner-cycle.md claims "no gate checks" the lag | existing `SES-261` (CLOSE; fix runbook sentence in same ship) |
| F6 | Three tickets (`SES-237`/`SES-244`/`SES-257`) assert unattended briefing republish impossible; a cycle did it today | John answers `4da29187` |
| F7 | Briefing "catch rate 30.0%" built from blocks the record calls all-false | John answers `7f64dae8`; metric hygiene inside C7 |
| F8 | `runner_questions` `ad624e3b`/`6d4a8918` open though answered on card `2c136c5b` | `SES-267` (LATER) |
| F9 | SESSIONS.md 1560.8 KB, over its own SES-172 rotation ceiling | `SES-268` (LATER) |
| F10 | Charter decision 2 (P10-only auto-done) superseded by unrecorded §2f (any Selfbuild-epic GREEN ship) | `SES-264` (CLOSE) |
| F11 | CLAUDE-STATE header shows "Version in dev v7.0.343 … Prior v7.0.344" — renderer/ledger ordering | fold into `SES-261` (LATER) |
| F12 | 2–4 open rows unpickable for missing/malformed class despite `SES-85` done | `SES-264` (CLOSE) |
| F13 | 2026-08-27: zero `runner_cycles` rows — hourly fires absent, unexplained; watchdog watches live cycles, not absent fires | John confirms the pause; `SES-269` (LATER) |

**Bottom line:** M0–M3 are real and drilled — restore proven at 99.996%, auto-rollback drilled end-to-end, portable CI gating, verdict-only verifier live, gate reviews running and filing successors. The project is not closable today: 4 of 8 exit criteria unmet, but three of those are demonstrations and clock-time, not construction. Shortest credible path: C1→C9. Everything else parks.
