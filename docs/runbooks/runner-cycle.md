<!-- DeepBench v7.0.401 | runbooks/runner-cycle.md | SES-312 — A MILESTONE REVIEW NOW DECIDES, FILES ITS NAMED SUCCESSORS AND DECLARES THE NEXT DRAIN INSIDE ONE REVERSIBLE TRANSACTION, and the thing to read twice is THAT THE ANTI-WIDENING GUARANTEE DID NOT GO AWAY — IT CHANGED INSTRUMENT. It used to be John's Accept on a card; it is now the decision's own before-images (`row_data NULL` per filed row, every one carrying one `decision_id`), so a review that files a member it never named is one `reverse_decision()` from undone. `M6-08` untouched, `drain_epic_next()` untouched, and a review may still file ONLY members named in its own findings. MEASURED LIVE OVER THE MCP BEFORE A LINE CHANGED, not recalled: `SES-286` is `done` (so this ticket's `blocked_by` is cleared); the M5 drain `238aa9ca` is now `done` — `SES-310` retired it — and NO M6 drain exists, so the succession is genuinely owed and the old property 4 could not produce it; all six epic-scoped `runner_items` rows already carry `decision = 'accept'`, and the M5 one (`18500000-…-a5`) was written BY HAND at the M6 gate, which is the precedent this mechanism replaces rather than a mechanism; and `runner_decisions` carries NO `kind` CHECK at all (read out of `pg_get_constraintdef` and `pg_get_functiondef`), so `gate` and `directive` are admitted by `record_decision()`'s vocabulary comment, not by a constraint — which is why the section names the kind explicitly instead of trusting the schema to. THE MEASUREMENT THAT DECIDED THE PROSE, and it is the reason the tail's precondition is TWO-PART rather than one: `reverse_decision()`'s allowlist admits `backlog_items`, `runner_directives`, `runner_drain_scope`, `runner_settings`, `governance_rules` and `epics` and DELIBERATELY EXCLUDES the runner's own evidence tables — `runner_items` among them. Proven in a rolled-back fixture at this ship (retiring epic → next epic, two successors, next epic holding five open members): `outcome = applied`, **2 restored** (the two `backlog_items`, the only rows with an `updated_at`), **8 restored-but-unverifiable** (the directive plus its seven scope rows — neither table has `updated_at`, so the engine writes and REPORTS the doubt), **1 refused: the review's own record**; tickets left 0, directive left 0, scope left 0, `runner_items` left 1, decision `reversed`. So a reversal undoes everything the review FILED and leaves the fact that the review HAPPENED standing — step 8d's idempotence key survives, and reading only the card would let a reversed review's drain stand. Zero residue on re-read, both fixtures. TWO NAMED DEVIATIONS FROM THE KICKOFF, each because its premise did not survive a check. (1) The kickoff says *"Prohibitions 2–4 unchanged"*; prohibition 2 of `gate-review.md` read *"nothing creates a drain row but John's own declaration… it may never start it"*, which as written forbids EXACTLY what this ticket builds — the identical unreconciled-prohibition defect this file's own tail passage fixed at `v7.0.337`, where the bare "never create a drain row" predated `0970abad` and would have made a cycle refuse the one declaration John pre-authorised. So prohibition 2 now cites the carve-out and says what is still John's alone; its substance is unchanged and 3 and 4 are byte-identical. (2) The successor members and the drain's scope rows come from ONE query, not two lists to reconcile: (3) files the successors into the next epic as `open` in the same transaction, so (4)'s "the next epic's open members" already includes them — which reproduces the M3 (19+4) / M4 (4+4) composition precedent exactly instead of restating it as arithmetic. Two schema facts an editor will otherwise get wrong, read from `information_schema` rather than remembered: `runner_drain_scope` carries a NOT NULL `backlog_id` beside `item_id`, and `runner_items.cycle_id` is NOT NULL with an FK to `runner_cycles` — so an attended review must open its supervised cycle row (`session-setup.md` 3e) BEFORE it can write its record. Stamp count held at 5 per session-hygiene check 7: `v7.0.393` (`SES-310`) moved VERBATIM to `docs/SESSIONS.md`'s appendix, `SES-164` step 2 run FIRST by grep over this body rather than from recollection — its boundary argument and its FAIL-CLOSED clause both already sat at the `SES-310` boundary paragraph and its deferral-never-exempts warning at that paragraph's tail, but its CENSUS-SUM warning appeared ZERO times in this body and was RELOCATED beside the `blocked_detail` census paragraph it protects: `v_nonreq_open_n` counts DIFFERENT tickets than `v_open_now`, so folding it into the read-the-scope-by-hand sum would explain a required member's unclaimability with a fact about somebody else's ticket. Doc + one new test; one `runner_directives` UPDATE and one `runner_decisions` row over MCP, before-image first under `session_name = 'ses-312-coding'`; no src/api/lib change, no site change, NO SCHEMA CHANGE and no migration. -->
<!-- DeepBench v7.0.399 | runbooks/runner-cycle.md | SES-122 (c) — THE SCOPE CAPS STOP BEING LITERALS A CYCLE RECITES AND BECOME A NUMBER IT READS, and the thing to read twice is THAT THE 3 AND THE 4 DID NOT GO ANYWHERE. They are the floor; a class earns one extra file and one extra task per rung it holds above `runner_settings.cap_relax_rung`, and a reversal takes them back. Charter decision 5 says the numeric caps retire *only when the verifier replaces them* — the verifier exists (`SES-181`), part (b) made it read the rung, part (a) made a verdict move the ladder and shipped `public.class_autonomy(text)` as the one home for what a rung buys, so the scaffolding comes down exactly as fast as verification proves itself. That is the charter's sequencing invariant satisfied BY CONSTRUCTION rather than by a date, and it is why this is three registry AMENDMENTS and not three retirements: `CAP-SCOPE-FILES`, `CAP-SCOPE-TASKS` and `HR-SCOPE` all stay `live`, all keep their ids, and the retirement ledger (entries 36/37/38) records the wording that LEFT, with the `runner_before_images` id that restores each one. MEASURED LIVE BEFORE A ROW MOVED, not inherited from the kickoff: the three statements were flat literals (*"Modify at most 3 files per session."*, *"Include at most 4 tasks per kickoff doc."*, *"Keep each session to one feature, at most 3 modified files, and at most 4 tasks."*), `class_autonomy('P10 - Tooling')` already returned rung 13 / `extra_files` 8 / `extra_tasks` 8 against `cap_relax_rung` 5, and NOTHING anywhere read those extras — part (a) built the grant and part (c) is its first consumer. THE ONE CHANGE A LATER READER WILL GO LOOKING FOR IN THE WRONG FILE: `HR-SCOPE`'s `canonical_doc` moved from `CLAUDE.md#hard-rules` to `docs/STANDARDS.md#section-2-session-scope-rules`, in the SAME `UPDATE` as its statement. `CLAUDE.md` is JOHN'S FILE — this ticket may cite it and may not edit it — so a rule whose home must carry its text byte-for-byte could not stay homed there once the text grew. His `Scope` line is untouched, still reads "One feature per session. Max 3 files. Max 4 tasks.", and is now CITED BY the amended row as the baseline the class extra sits on top of; the re-homing is recorded in ledger entry 38 precisely because `CLAUDE.md`'s history will show nothing. THE FEATURE CAP IS NOT ON THE LADDER AND MUST NOT BE PUT THERE: `CAP-SCOPE-FEATURE` (*"Scope every session to exactly one feature."*) is byte-for-byte unchanged and pinned by this ship's guard as the assertion about what did NOT move — a rung buys breadth of edit, never a second ticket folded into one cycle. TWO SITES HERE, no procedure rewritten beyond them: new step 5a reads the caps at pick with one fenced statement and writes `files N (+k) / tasks M (+k)` into the cycle `notes`, and step 7's QA bar gained the bullet that grades the ship against THOSE numbers rather than a remembered 3/4 — a reviewer holding the bare literals would block a ship the ladder had already paid for, and holding someone else's `+k` is the same error pointed the other way, which is why the numbers live on the cycle row and not in anyone's head. FAIL CLOSED IS THE NULL ARITHMETIC, NOT A SPECIAL CASE (part (a)'s design, restated at step 5a because this is where a cycle meets it): no class on the board, a class the ladder does not track, a failed RPC or a missing `runner_settings` singleton all yield zero extras, so a lookup that goes wrong NARROWS the cap and can never widen it; and a blank rung reads NULL rather than 0, because rung 0 is a real rung and `invention` sits at it. `M6-13` still scopes every one of these caps to the individual cycle and never to the chained session that holds several. Section 2 of `docs/STANDARDS.md` now carries all four cap statements byte-for-byte, each on ONE line, homed as list items 1–3 plus blockquotes — blockquotes deliberately, because Section 2's rule NUMBERS are load-bearing (`SES-61` slices "rule 5" by its literal opening and eight test files cite "Section 2 rule 5"), so a new item 4 would have renumbered every one of those citations. `CAP-SESSION-SPLIT-SIGNS`'s paraphrase there was reconciled in the same pass: it still carried the 20-minute wall-clock trigger `SES-296` withdrew AND still stated the caps as flat literals four lines under the rules that had stopped being flat. Guarded by `tests/regression/ses-122c-class-caps.test.mjs` — eight clauses, seven of which FAIL on the pre-change tree (measured against `d1d4589a`, not predicted), each with a negative control, plus a read-only live arm that recomputes `greatest(0, rung − cap_relax_rung)` from `runner_ladder` and `runner_settings` in the same test rather than pinning today's 8. Doc + test only; three `governance_rules` `UPDATE`s over MCP, each preceded by its own `runner_before_images` row (`session_name = 'ses-122c-coding'`); no src/api/lib change, no site change, NO SCHEMA CHANGE and no migration. Stamp count held at 5 per session-hygiene check 7: `v7.0.392` (`SES-301`) moved VERBATIM to `docs/SESSIONS.md`'s appendix, `SES-164` step 2 run FIRST by grep over this body rather than from recollection — its forbidden registry-row flip already had a body home at step 8b-bis (relocated there by `SES-310`) and its `SES-134` pinned-literal trap already sat at the `apply_ladder_decision` bullet, but the OTHER half of its forbidden edit — re-rendering a withdrawn rule's block back into existence with `render-rule-blocks.js --write` — appeared NOWHERE in this body and was RELOCATED beside the B34 withdrawal annotation it protects rather than archived with the stamp. -->
<!-- DeepBench v7.0.398 | runbooks/runner-cycle.md | SES-122 (b) — THE AUTO-DONE BAR IS A LADDER FACT THE VERIFIER READS, AND THE VERIFIER FINALLY RUNS ON WINDOWS. Step 7a's bar stops being a class name and becomes a MEASUREMENT: eligible when the ticket's work class's rung ≥ `runner_settings.auto_done_rung`, read from `public.class_autonomy(priority_class)` (part (a), `v7.0.397`) and never re-derived by the caller — that comparison has one home and it is the SQL function. The M6 gate's own words on `SES-122`'s row (`docs/RUNNER-GOV-M6-REQUIREMENTS.md`, promise 2, 2026-09-02) are *"a rung buys auto-done eligibility for its class"*, and THE THING TO READ TWICE IS THAT A RUNG IS A FACT ABOUT THE CLASS AND NOT ABOUT THE EPIC — so the grant bypasses charter decision 2's `Selfbuild`-family restriction as well as its `P10` one: `tooling` at rung 13 against `auto_done_rung` 3 auto-dones on ANY epic, while `bug_fix` at rung 1 stays `delivered` on a Selfbuild epic. Decision 2 and §2f are RETAINED AS THE FLOOR beneath it for every class the ladder has not promoted; nothing was deleted. THE GRANT DOES NOT `return` — IT ONLY SKIPS THE TWO SCOPE TESTS, and that shape is the one an editor must not "simplify": an early return would jump over `selfCertificationBlock()`, so control now reaches charter premise 3's refusal on EVERY path, ladder or no ladder. A rung never buys a change the right to grade itself, and this ship is its own witness — `tooling` sat at rung 13 and the diff touched `scripts/verifier.js`, so it was refused the bar it had just built (`SELF_CERTIFYING_PATHS`, as `SES-181`'s own ship was). FAIL CLOSED IS THE DEFAULT ON BOTH LOOKUPS, the same default §2f uses: no class on the board, a class the ladder does not track, a failed RPC, absent credentials — all leave `classAutonomy` NULL, all fall to the floor, none widens anything; and the stored `auto_done_reason` says WHICH, because "the ladder declined" and "nobody asked the ladder" are different facts about a ticket that stayed `delivered`. `class_autonomy` reports an untracked class's rung as **NULL, not 0** (rung 0 is a real rung — `invention` sits at it), so a blank rung is never read here as the bottom one. AND THE ENVIRONMENT DEFECT, MEASURED RATHER THAN INFERRED: `runGate()` spawns with `shell: true` on win32, which hands `cmd /d /s /c "<cmd> <args>"` to the shell, and `process.execPath` on John's machine is `C:\Program Files\nodejs\node.exe` — unquoted, cmd split it at the space, so the regression and hygiene gates both exited 1 with `'C:\Program' is not recognized` and EVERY attended verifier run on Windows was a false `block` about the environment. Verdict `253aca14` (`SES-301`) is the record: build green, both node-spawned gates red on exactly that string. The Linux cloud runner passes the command as argv[0] and never saw it, which is why it survived, and `SES-311`'s attended verifier step could not exist until now. The fix is `spawnCommandFor(cmd, shell)` — quoted only when a shell will parse it, untouched when it is argv[0] (a quote there names a file that does not exist, the same defect pointed backwards), idempotent, pure and exported so its guard is a string assertion instead of a 20-minute gate run. Verified end-to-end on Windows from an LF snapshot: all three gates RAN. NO SCHEMA CHANGE and no `runner_ladder` write from the verifier — part (a) shipped the columns, part (c) does the caps (`extra_files`/`extra_tasks` are deliberately not read here). Guarded by `tests/regression/SES-181-verifier.js` (four new functions, every one of which fails on the pre-change source — asserted, not assumed). Doc + script + test; no src/api/lib change, no site change, no migration. Stamp count held at 5 per session-hygiene check 7: `v7.0.390` (`SES-309`) moved VERBATIM to `docs/SESSIONS.md`'s appendix, `SES-164` step 2 run FIRST by grep over this body rather than from recollection — it found TWO of that stamp's editor warnings with no body home, both RELOCATED into step 8's snapshot block beside the `unclaimed` paragraph they protect and both re-verified against live SQL rather than copied: `ticket_outcome`'s after-row is the newest scoreboard row ≥72h ACROSS THE WHOLE TABLE (read out of `pg_get_viewdef` — the LATERAL carries no `backlog_id` filter), and `ck_backlog_outcome_claim` → `outcome_claim_is_valid(text)` rejects an invented metric AT FILING (seven names, read out of `pg_get_functiondef`). -->
<!-- DeepBench v7.0.397 | runbooks/runner-cycle.md | SES-122 (a) — A VERDICT NOW MOVES THE TRUST LADDER, AND ONE FUNCTION SAYS WHAT A RUNG BUYS. The thing to read twice is THAT A `block` MUST NEVER TOUCH THE RUNG. `ladder_apply_signal` grew a third signal, `reset` (streak 0, rung unchanged, promoted false), on the SAME identity argument list — `CREATE OR REPLACE` on `(text,text,uuid,text)`, one overload asserted after the fact rather than assumed, per `.claude/rules/supabase-function-signature.md`. `reset` exists precisely because `demote` already existed and is the WRONG signal here: a demote drops a rung and is John's reversal of a delivery (`SES-286a`), while a red gate is the verifier's judgment on one ship, so it costs the streak and nothing else. If a later editor finds themselves writing `v_before.rung - 1` in the `reset` branch, that is the bug this sentence exists to stop. MEASURED LIVE BEFORE THE MIGRATION, NOT INHERITED FROM THE KICKOFF, and the numbers had moved: **118** `runner_verdicts` rows (81 `approve`, 37 `block`, 8 carrying no `backlog_id`), **none** of which had ever touched `public.runner_ladder` — the kickoff's 117/54/27/36 were the design session's count hours earlier, and cycles kept running. `runner_ladder` had been written by exactly one function, `apply_ladder_decision()`, keyed on John's taps; `tooling` had not moved from 13/42 since 2026-08-24 and no class had moved at all. `M6-07`'s verdict half was a dead letter and NOTHING anywhere read a rung to grant anything. THREE NEW/CHANGED MECHANISMS AND ONE DELETION. (1) `verdict_ladder_signal(uuid)` maps `approve` → `promote` and `block` → `reset`, actor = the verdict's `cycle_id`, idempotent per verdict via the new `runner_verdicts.ladder_applied_at`; it refuses with `applied false` — and stamps NOTHING, so the row stays re-runnable — for an absent verdict, a null id, an already-counted verdict, a verdict naming no ticket, and a ticket whose class the ladder does not track. (2) `class_autonomy(text)` is the ONE home for what a rung buys: `auto_done` when `rung >= runner_settings.auto_done_rung` (new column, seeded **3**) and `extra_files`/`extra_tasks` = `greatest(0, rung − runner_settings.cap_relax_rung)` (new column, seeded **5**) — COLUMNS, NEVER LITERALS (`SES-146`), and parts (b) and (c) are its only consumers. (3) `apply_ladder_decision()`'s inline digit CASE is GONE, replaced by `public.ladder_work_class(v_class)` — the duplicate `SES-286a` named and this ticket removes; its gated short-circuit (B34), its `rework` branch and its tap semantics for the historical rows are byte-identical otherwise. FAIL CLOSED IS THE NULL ARITHMETIC, NOT A SPECIAL CASE, and that is worth reading before "simplifying" `class_autonomy`: with no ladder row `rung` is NULL, `NULL >= auto_done_rung` coalesces to false, and `GREATEST` ignores NULLs so both extras are 0 — an unclassed ticket earns NOTHING, and the same holds if the `runner_settings` singleton ever goes missing. It returns EXACTLY ONE ROW always (one-row subquery, LEFT JOIN preserved), because a caller cannot tell an empty result from a permissive one. THREE NAMED DEVIATIONS FROM THE KICKOFF, each because the kickoff's premise did not survive a check. (a) The kickoff quotes *"recorded as runner_verdicts <id>"* as an existing sentence in this step to insert after; it is not in this file at all — it is `scripts/verifier.js`'s own printed line (its `emit()` at line 540). The new paragraph therefore sits immediately after step 7a's command fence, where the verdict is actually recorded, and names that printed line explicitly so the cue a cycle waits for is the one it will really see. (b) `class_autonomy` returns `rung`/`streak` as **NULL**, not 0, for a class with no ladder row: rung 0 is a REAL rung — `invention` sits at it — so reporting 0 would conflate "no rung" with "the bottom rung". (c) `runner_verdicts.cycle_id` is nullable (0 of 118 rows null at this ship) and `ck_before_image_attribution` admits exactly one author, so a cycle-less verdict is attributed as `session_name = 'verdict <id>'` rather than raising — a real ladder input must not be silently dropped for want of a name to write it under. QA WAS ONE DELIBERATELY FAILING `DO` BLOCK, one variable each, every fixture rolled back, asserted on the SIGNAL TAKEN rather than on "it resolved": `approve`/P10 → `promote`, tooling 13/42 → 13/43 (43 % 5 ≠ 0, streak NOT reset — `SES-107`), `ladder_applied_at` stamped, two before-images (`runner_ladder` + `runner_verdicts`); the same call again → `applied false, already counted`; `block`/P10 → `reset`, streak 43 → 0 with **rung before = rung after = 13 asserted explicitly as the control**; a `P6 - Agent Enhancement` ticket → `applied false` naming the untracked class AND `ladder_applied_at` still null; `class_autonomy('P9 - Bug Fixes · FLAGGED')` → `auto_done` false at rung 1, true at a fixture rung 3, `extra_files` 0 at rung 3 and 1 at rung 6; `apply_ladder_decision` on a fixture gated card → still `applied false` with the B34 reason and on a fixture `accept` ship card → unchanged (the CASE replacement is transparent); and `ladder_apply_signal` still refuses a nonsense signal, two actors and zero actors. Zero residue on re-read: tooling back at 13/42, 118 verdicts, 0 stamped, 0 fixture rows, 0 `runner_verdicts` before-images. Migration `ses122a_verdict_ladder_signals`, whose own trailing `DO` block asserts one overload of each of the five functions, `class_autonomy` `provolatile = 's'`, and EXECUTE true for `service_role` / false for `anon` and `authenticated` — `has_function_privilege()` both directions, never the migration's success flag. Guarded by `tests/regression/ses-122a-verdict-ladder.test.mjs`. `SES-122` stays OPEN — the verifier reading the rung is part (b), the caps are part (c). Doc + test + migration; no src/api/lib change, no site change. Stamp count held at 5 per session-hygiene check 7: `v7.0.389` (`SES-308`) moved VERBATIM to `docs/SESSIONS.md`'s appendix, `SES-164` step 2 run FIRST by grep over this body rather than from recollection — it found ONE warning with no body home, the forbidden edit of re-running step 8b's `--apply` unconditionally on every cycle, which was RELOCATED into step 8b beside the exit-1 paragraph it protects rather than archived with the stamp. -->
<!-- DeepBench v7.0.395 | runbooks/runner-cycle.md | SES-286 (b) — EVERY JUDGMENT WRITE NOW BECOMES A DECISION ROW WITH A HANDLE, THE CYCLE TAIL SWEEPS THE WINDOWS, AND THE THING TO READ TWICE IS WHY 7b IS ONE `DO` BLOCK RATHER THAN TWO STATEMENTS. Part (a) (v7.0.394) shipped the ledger and nothing called it: measured by grep this session on this worktree, `record_decision`, `sweep_decision_windows` and `reverse_decision` each occurred ZERO times in this file and in session-setup.md, so every M6-* rule marked `script` was still prose. FOUR SITES, no procedure rewritten beyond them: new 7b (the definition of a decision, the one-transaction call, the handle sentence, the boundary), the step-5 partial-remainder bullet (b) now citing 7b instead of saying "record the reasoning on the ticket", step 8c's M6-03 automatic removal recorded as `kind = 'removal'`, and step 9's serial tail gaining `(7b)` between (7) and (8). THE TRANSACTION IS LOAD-BEARING AND IT WAS READ OUT OF `pg_get_functiondef` THIS SESSION RATHER THAN RECALLED: `reverse_decision()` refuses any row whose live `updated_at` is LATER than the image it would restore from (the restore engine's own predicate), and `now()` is frozen per transaction — so a decision recorded in one statement and written in the next leaves the row's `updated_at` postdating its image, and the reversal then counts the row `refused`, restores NOTHING, and STILL returns `outcome = 'applied'`. Silently un-undoable, which is the single failure this mechanism exists to prevent; hence a `DO` block that records, images and writes together, and hence `attach_before_images()` named for images that already exist. SIX FUNCTIONS, NOT FIVE — part (a) shipped `attach_before_images` alongside the four the kickoff enumerated plus `ladder_work_class`; verified live this session: exactly one overload each, `ladder_work_class` provolatile 'i', and `reverse_decision()` restores a surviving row IN PLACE with an UPDATE, inserting only where the row is absent, so no runbook line says delete-and-reinsert. THREE NAMED DEVIATIONS FROM THE KICKOFF, each because the kickoff's premise did not survive a check. (1) 7b sits immediately before the `## Phase 3 — evidence` heading rather than immediately after it: no step intervenes either way, and above the heading it stays a Phase-2 sibling of 7 and 7a instead of being filed under "evidence", which it is not. (2) The kickoff's stated reason for the tail placement — "a window that expired during this cycle must promote before the chain gate reads the ladder" — IS FALSE, read off `drain_chain_gate()`'s own five gates in this file: outcome, drain-has-work, `design_status`, no-ship streak, undecided ceiling; `runner_ladder` is not among them. The two TRUE reasons are written in instead: not at step 1 because step 4b sizes the invention pass off the `invention` rung and a sweep there would let a cycle spend a widening it had just awarded itself, and not after (8) because (8) is where the session ends, so a step below it never runs on the cycle that terminates a chain — the one most likely to be the last for hours. (3) The kickoff calls a reversal "itself reversible"; `reverse_decision()` REFUSES a `kind = 'reversal'` row by design, so both runbooks say what it does — the reversal's own before-images make its effect recoverable, and re-applying the decision it undid is a NEW decision with its own window. VOCABULARY: 7b carries no `needs-john` in any voice, retired or live — the boundary is stated as no card, no escalation, no waiting (M6-06). STAMP COUNT HELD AT 5 per session-hygiene check 7: v7.0.368 (SES-300) moved VERBATIM to docs/SESSIONS.md's appendix, SES-164 step 2 run FIRST by grep over this body rather than from recollection — its rendered-block precedent and its vacuous-control lesson both already have body homes, but its CRLF-versus-LF FALSE GREEN warning on checks 9/10/11 appeared NOWHERE here, so it was RELOCATED into step 8b-bis beside the two checks-9/10/11 warnings SES-310 relocated there, rather than archived with the stamp. Doc + one new test; no src/api/lib change, no site change, no schema change, NO MIGRATION and no Supabase write in this part. -->
# Runner Cycle — Standing Prompt (§19v)

You are one cycle of DeepBench's Automated development runner, executing in an isolated cloud
session. Your routine prompt carries your **stamp** and **trigger** — echo both into your
cycle row. Run the steps in order; **fail closed at every wall** (log a `did_not_run` cycle and
end — never proceed on hope). Everything you ship must satisfy `ARCHITECTURE.md` §19v; when this
runbook and §19v disagree, §19v wins and the disagreement is itself a briefing item.

**Language (John, 2026-08-20, `design-runner-gov-0820`).** Cycle outcomes are `shipped` /
`gated_before_build` / `reverted` / `did_not_run` / `failed` (the `runner_cycles` check
constraint; the former values `noop` and `proposal` are retired — the constraint rejects them).
In anything John reads — briefing cards, notifications, chat — write them as plain words:
"did not run", "gated before build". A priority class is **always written named, never a bare
digit**: `P1 - Improves John's Skills`, `P2 - Inventive`, `P3 - Investor Value`,
`P4 - New Customers`, `P5 - Enhancements`, `P6 - Agent Enhancement`, `P7 - Agent Creation`,
`P8 - Determinism Removal`, `P9 - Bug Fixes`, `P10 - Tooling` (canonical list: `FEATURES.md`'s
Priority Class legend). John should never have to memorize the digits.

**A TICKET NAMED IN ANYTHING JOHN READS CARRIES ITS TITLE, NOT JUST ITS ID (`SES-119` part (b),
`v7.0.185`; John's standing instruction 2026-08-22).** His scope is verbatim and it is total:
*"across every session, display or anything that references work you perform for the backlog"* —
always **ID + title**, because he does not memorize IDs. That is the same sentence as the clause
above it, applied one level out: he should not have to memorize the digits of a priority class, and
he should not have to memorize what `SES-140` **is**. So a ticket reference on a surface he reads —
a briefing card's id chip, a §10 row, a push notification, the session name, a `close_directive`
note, a `record_skip` reason — reads `SES-140 — the successor fire is refused by the platform`,
never a bare `SES-140`. The session rename at step 5 (`"<TICKET-ID> — <short name>"`) already has
this shape and is the pattern, not an exception to it.

Three boundaries, each of which is how this rule gets got wrong:

- **The title is `public.backlog_display_title(title, description)` — never the raw `title` column
  and never the `gist` extract** (`SES-119`, `v7.0.184`, migration `ses119_display_title`).
  **Measured live 2026-08-23, not quoted: of 562 open numbered tickets, `title IS NULL` on 0 and
  50 fall back**, i.e. on 50 tickets the stored title is a retired declaration marker rather than a
  title (38 of them literally `` `Post-beta` ``). So *"use the title column"* — the obvious short
  form of this rule — renders `` `Post-beta` `` as a ticket's name, and the `gist` it would replace
  is the first 70 characters of the *description*, which on this board is provenance (*"FOUND LIVE
  2026-08-23T03:31Z by cycle b9201486…"*). The function is the fallback between the two and is the
  only sanctioned source. Its predicate, the rejected length heuristic, and the `CHI-97` boundary
  live in `briefing-page.md`'s §8 contract — **cited here, not restated**, so these two files cannot
  drift the way step 5 and step 7 did before `v7.0.114`.
- **This is a RENDER-time rule and it must never reach a key column (`SES-116`, `v7.0.174`).** The
  immediately preceding member of this rule family did exactly that: step 9's card-filing line read
  *"backlog ID + Type + named P-class"*, so every cycle composed `'SES-115 (Tooling · P10 -
  Tooling)'` and stored it in `runner_items.backlog_id` — **a join key** — and every card→ticket
  join silently returned nothing on 63 of 80 rows. `backlog_id` stays **bare**
  (`ck_runner_items_backlog_id_bare` now rejects anything else at INSERT), a human reference that is
  not a board ticket goes in `display_ref`, and the title is looked up **when the surface is drawn**.
  Composing `SES-119 — Briefing and displays show…` into either column is that same defect wearing
  this rule's clothes.
- **A fallback is a signal about the ticket, not a formatting problem to patch by hand.** When
  `backlog_display_title()` falls back, that ticket has no usable stored title, and the honest
  rendering is the fallback. Do **not** invent a title at render time to make the row look
  finished — that is a fact with a second home, and it hides the population `SES-117`'s TITLE
  CHECK is the structural fix for.

**Supervised-run notes** are inline where the first supervised cycle (SES-78c QA) runs a
reduced version of a step; 78d replaces them with the full mechanism.

## Phase 1 — judgment first

**PRE-BOOT GATE — ONE QUERY, AND IT RUNS BEFORE EVERYTHING (`SES-297`, `v7.0.364`, migration
`ses297_runner_should_boot`; `M6-09`, absorbing `M5-06` and `M5-15`).** This is the **first
executable action of a cycle, and the ORDERING IS THE FEATURE.** **No orientation read, no lease
assertion, no brief read, no clone, no claim precedes this call** — not `CLAUDE.md`, not
`CLAUDE-STATE.md`, not `docs/runbooks/standing-brief.md`, not the briefing page, not step 0's
`git fetch`. Every one of those used to be paid *before* a cycle reached the step that concluded
there was nothing to do, and that ordering is the entire defect: **53 scheduled cycles in the
current weekly window booted cold, discovered there was nothing to do, and closed — 32.4M tokens,
average 611,321 each, shipping nothing**, more than `M5`'s whole 31.9M predicted cost.

```sql
SELECT * FROM public.runner_should_boot();
```

- **`should_boot = true`** (`reason = 'pickable'`) → continue to step 0. `detail` already names the
  ticket the pick path would return, with its title (`backlog_display_title`, per the ID + title
  rule above) and its predicted cost. That is **reporting, never a reservation** — step 5 still
  picks and still claims, and may legitimately land on something else if the board moved in between.
- **`should_boot = false`** → write **one** `runner_cycles` row and **stop without reading anything
  else**:

```sql
INSERT INTO public.runner_cycles
  (id, started_at, ended_at, stamp, trigger, model, outcome, last_step, notes)
VALUES
  (gen_random_uuid(), now(), now(),
   '<your stamp>', '<your prompt''s trigger: line, verbatim>', '<your model>',
   'did_not_run',
   'step 0 — pre-boot refusal (<reason>)',
   '<the returned detail jsonb, verbatim>')
RETURNING id;
```

  Then **end**. No push notification, no session rename, no serial tail, no successor fire.

**AMENDED SAME DAY BY `SES-298` (v7.0.365) — A STALE READING NO LONGER REFUSES.** `M5-15` shipped
worded as a refusal, and within the hour it was live-blocking the runner on a 32.66h-old reading.
The only way to refresh that reading is John typing it (`SES-82`, the programmatic read, is
unbuilt), so the refusal made **a number only John can produce into a precondition for autonomy —
exactly what `M6-01` forbids**, and it did so in a rule written by the same session that retired the
card surface. It also ignored a mechanism the platform already had: `runner_budget.stale_fallback_tokens`
(3,000,000) exists precisely so a cycle can run under a smaller ceiling when the meter is old.
**CORRECTED SAME NIGHT BY `SES-302` (v7.0.369) — THIS GATE OWNS NO CAP AND NO STALENESS THRESHOLD.**
`SES-298`'s wording above was still wrong, one layer down: it gave this gate a `detail.token_cap` of
`stale_fallback_tokens` at a **24h** threshold. But `resolve_day_token_cap()` **RUNG 2 has owned the
staleness brake all along** — at **48h**, returning `cap_source = 'stale-floor'`, carrying the
spec-verbatim comment *"The box does NOT defeat it"*. With the reading at 35.4h the two homes
returned **opposite answers on the same fact**: the resolver said 196M (RUNG 3, the standing box),
this gate said 3M. Nothing consumed the gate's field, but this runbook told a cycle to use it — so
an unattended run would have capped itself at 3M and stalled M5 around its first ticket.

**So: the gate reports `reading_age_hours` and a `cap_authority` pointer, and stops there.** It
carries no `token_cap`, grades no staleness, and emits no `pickable_degraded` reason. **The day cap
has exactly one home — `public.resolve_day_token_cap()`, read at step 3** — and staleness lowers the
ceiling there, never here. A stale reading still grades the weekly wall in (2): a stale 63% is
better evidence than none.

**The five refusal reasons, in the precedence the function applies them.**
Each names itself, always: **a bare `false` is the "NULL is not zero" defect this codebase has paid
for repeatedly.**

1. `scheduler_off` — `runner_settings.scheduler_on` is false. John's own switch, the same one step
   1b's `scheduler_gate()` honours.
2. `weekly_wall` — **`M5-06`**: the freshest reading's `all_models_pct` is at or above
   `runner_budget.weekly_rest_pct` for the current **`America/Chicago`** month (register `B35`, superseded
   2026-09-01 by `M6-07` (`SES-285`; annotated `SES-289`) — **scope matters here: only B35's
   Reverse-on-gated answer lost its subject. The America/Chicago boundary is its answer (2),
   explicitly unaffected and still binding** — the month boundary is John's clock, never UTC).
3. `no_budget_row` — no `runner_budget` row exists for that month. **This is the 2026-09-01 outage
   that stopped the runner and then sat unread in a card, and it now has a name instead of a silent
   pass.** (2) preceding (3) is deliberate and NULL-safe: with the row absent, (2)'s comparison is
   NULL rather than true, so it falls through to (3) instead of blaming the wall for a missing row.
4. `nothing_pickable` — **`M6-09`**: `prime_directive_queue()` returns no `drain` or `selfbuild`
   lane row.
5. `unaffordable` — **`M5-06`**: the **cheapest** pickable ticket's `predicted_pct_of_week` exceeds
   the remaining weekly headroom (`100 − all_models_pct`).

Everything else is `pickable` — one pass reason, no degraded variant (`SES-302`). A stale reading
does not change this verdict; it changes the **ceiling**, and that is `resolve_day_token_cap()`'s
RUNG 2 to apply at step 3, never this gate's. Read `detail.reading_age_hours` if you want to know
how old the meter is; read the resolver if you want to know what you may spend.

**This gate and `scheduler_gate()` answer different questions and both hold.** `scheduler_gate()`
asks *is this fire admissible on John's clock grid*; this one asks *is there anything to do at all*.
Step 1b stays exactly where it is and is not folded into this call — it needs a cycle row to close
and it reads the fire's own `started_at`.

Four properties that are load-bearing. **Do not re-derive any of them by hand:**

- **THE GATE NEVER CALLS `drain_epic_next(uuid)`, and that is a correctness boundary, not a
  performance one.** That function is `VOLATILE`: it **retires** a fully-done drain directive and
  writes a `runner_before_images` row while doing so, so a read-only probe calling it could **close
  John's standing drain as a side effect of asking a question** — the same refusal `SES-196`,
  `SES-218` and `SES-275` each recorded. The gate reuses the pick predicate by reading
  `public.prime_directive_queue()` instead: `STABLE`, writes nothing, and already carrying the
  `M5-01/02/07/08/09` filters `SES-281` wired in — so the gate and the picker cannot disagree about
  what is buildable, which is the property, not a convenience.
- **`M5-06` is asked of the CHEAPEST pickable ticket, never of the ticket that would be picked.**
  Refusing to boot while affordable work remains would be this gate stopping the very work it exists
  to make cheap. `detail.pick` and `detail.cheapest` are reported separately so the two can never be
  read as one number.
- **AN UNPRICED TICKET HAS AN UNKNOWN COST, NOT A ZERO ONE.** A ticket with `predicted_cycles IS
  NULL` is excluded from the cheapest-cost calculation rather than counted as free, so an
  all-unpriced board **fails open** (it boots) and `detail.unpriced_pickable` says so out loud.
  Counting NULL as 0 makes every board affordable; counting it as infinite refuses every board.
  Neither is a measurement.
- **A REFUSAL SKIPS THE SERIAL TAIL, AND THE CONSEQUENCE IS DECLARED RATHER THAN LEFT TO BE FOUND.**
  The tail's own first act is re-fetching and re-parsing the live briefing page — **473.1 KB at
  `v7.0.348`**, the single most expensive read in a cycle, and precisely the orientation cost this
  gate exists not to pay — while a refusal has nothing for it to write: no pick, no card, no ladder
  move, no ship. What a refusing fire therefore does **not** do is **harvest John's taps**. Four of
  the six reasons clear themselves (a reading gets taken, the wall recedes, a month rolls over, a
  budget row is inserted) and `scheduler_off` is John's own deliberate choice; **`nothing_pickable`
  is the unbounded one** — an empty drain means no fire boots and therefore no fire harvests until
  an attended session runs. That remainder is named on `SES-297`'s card. It is **not** a gap to close
  by quietly restoring the tail here: doing so restores the full page read on exactly the path this
  ticket exists to make cheap.

**0. Bootstrap.** Your clone's default branch is `main` — never work there. `git fetch origin
dev`, then `git checkout -B session/cycle-<UTC yyyymmdd-hhmm> origin/dev`. This exclusive
clone + session branch satisfies CLAUDE.md's worktree-isolation rule by construction (the rule
exists to isolate concurrent sessions sharing one machine checkout; you have the whole clone).
All other CLAUDE.md hard rules apply verbatim — atomic counters, `push origin HEAD:dev`,
kickoff-gated coding, verify-never-assert. Do NOT create an inflight file: `.claude/` paths are hard-coded protected and prompt for permission even in routine sessions (found live, SES-78c — two stalls), and the marker is redundant here — the exclusive clone dies with the session and your `runner_cycles` row is the liveness signal. (Laptop sessions keep the inflight convention — at repo-root `inflight/` since 2026-08-21, John-approved register B41, moved out of `.claude/` precisely because of this gate; the cloud-cycle skip stays, since the exclusive clone and the `runner_cycles` row already cover liveness.)

**An UNATTENDED cycle writes nothing under `.claude/` — and the reason is now known, which changes what the rule is for (John, 2026-08-21, directive `34865f07`, register B39).** This clause has been rewritten four times. Read the reason before you touch it again, because three of the four rewrites argued about a mechanism nobody had observed, and John then observed it in one sentence:

> *"Those sessions came back alive because I opened them and allowed permissions. That should not be happening."*

**What that settles.** The path is **not blocked** — writes land, and `v7.0.121` proved it (an 18-minute stall that ended in a **successful** write). The gate is a **harness permission prompt that renders only in the human-facing session UI and never in the agent's transcript**. An agent therefore cannot see it, cannot report it, and cannot answer it: from inside, an unanswered prompt is indistinguishable from latency, from a suspend/resume, and from a hang. This is why every previous reading was defensible and wrong. `v7.0.121`'s register B38 got the location exactly right — *"permission-shaped… in the harness permission layer, not the shell"*, measured with `date +%s` printing the same second either side of the stalled command — and then concluded *"what is not happening is anyone being asked in a way they could answer."* Someone was asked. It was John, in a UI no cycle can see.

**The measurement that makes it a rule rather than a story** — the partition by whether John was demonstrably in the app, his briefing taps as the timestamped proxy. His taps stop at `03:48Z` and resume at `12:50Z`, a nine-hour hole on the night of 2026-08-20→21:

| Probe | Started | John in the app | Outcome |
|---|---|---|---|
| `c6c50bdc` (`v7.0.115`) | `02:06Z` | yes | returned, ~35 min |
| `ba8f2ce3` | `03:52Z` | **no** | **parked ~9h20m** |
| `633fe486` | `05:07Z` | **no** | **parked ~8h05m** |
| `12953ca8` (`v7.0.117`) | `08:07Z` | **no** | **never returned** |
| `55defd59` (`v7.0.121`) | `13:01Z` | yes | returned 18m04s; next call ~6 s |

Every probe that cleared ran while he was at his desk; every probe that parked for hours ran inside the hole. The two parked cycles resumed **together, 13:09–13:12Z — eighteen minutes after his first tap of the morning.** So B38's *"a cost, not a prohibition — budget ~35 minutes"* was never a distribution; it was **a sample of the attended cases**. Unattended, the observed values are ~9h, ~8h, and never.

**Therefore, the rule, and note what it is NOT.** It is not "never edit `.claude/`" — that edit is legitimate work. It is: **an unattended cycle has no bounded recovery from this gate, so it does not enter it.** A cloud cycle that needs a `.claude/` edit **files a card carrying the exact replacement text**, names it as needing *a session John is attending* (not merely "a laptop session" — attendance is the operative property, not the machine), and moves on. It never spends the cycle on the attempt, and — `CLAUDE.md`, `SES-019` — never retries the same write through a different tool to get around it. **The rule exists to protect John's attention, on his instruction:** *"That should not be happening"* means his opening a session to clear a prompt is the failure being designed out, never the recovery path a cycle may plan around.

**Do not re-soften this on another latency reading.** That is exactly how it was softened last time, and a fast `.claude/` write is not evidence the gate is gone — it is evidence somebody was watching. **What would legitimately reopen it:** a prompt actually captured, or a pre-approval John grants these sessions that is then shown to survive an unattended run. Three things stay labelled inference, not fact: no prompt has ever been directly captured; `v7.0.115`'s 35-minute clearance has no identified clearer; and `ba8f2ce3`'s fast `Write`/`Edit` calls are not ordered against John's approval, so "`Write`/`Edit` never prompts" is not excluded. Read `runner_secrets` via the Supabase
connector and export what a step needs as env vars — secrets never go into files, commits, or
logs.

**Step-0 assertions — prove both cheaply before opening the cycle, fail closed if either fails
(B17, John-accepted 2026-08-20 12:51Z, `runner_items d1c1ca1b`).** **(1) Stamp match.** Your
prompt carries a `stamp:` clause; call `list_triggers` and match that stamp against the
current routine's stored prompt verbatim. A mismatch means the routine was updated and this
prompt is superseded — CLOSE `did_not_run` immediately with the mismatched pair in `notes`,
never run superseded instructions (found live, `SES-78`: a retired prompt fired a second
runner cycle five minutes after the real one). **(2)** — retired 2026-08-21 (register B42):
there is no cycle-level lease any more. Mint your cycle id (`gen_random_uuid()`) and open your
`runner_cycles` row (step 1). **Every fire that passes the stamp check RUNS.**

**PARALLEL CYCLES ARE THE DESIGN — the cycle-level lease is RETIRED (John, live in chat
2026-08-21, register B42).** His ruling, verbatim: *"routines should be able to run multiple in
parallel and not overwrite each other and manage sessions accordingly. I can run 10 sessions
manually and there is no problem. What if i want to run 100 automated routines at once? should
not be an issue - self administered and fixes itself if it happens to notice it is about to
overwrite another session."* B31's one-runner-at-a-time mutex (`v7.0.106`) was built when
tickets had no claims — the only way to stop two cycles building `ADM-1` twice was to stop the
second cycle entirely. Since `v7.0.127` the coordination lives on the resources themselves, so
the mutex now only throws away throughput. What replaces it, resource by resource:

- **Tickets:** the atomic claim (step 5). A contested claim returns 0 rows → **take the next
  ticket in the queue** — John's rule, exactly. N cycles work N different tickets.
- **Version numbers and backlog IDs:** already atomic (`UPDATE … RETURNING`); no lease needed.
- **`dev` pushes:** fetch → rebase → push (step 7). Under parallelism a non-fast-forward is
  routine, not an anomaly — re-fetch, re-rebase, retry **up to 3 times** (was once).
- **Your own ticket, before anything irreversible:** re-assert the CLAIM, not a lease — see
  the re-assertion gate below.
- **The briefing tail** — the one genuinely serial section (harvest John's taps → ladder
  writes → republish). Two cycles republishing at once can overwrite each other's cards and,
  worse, eat un-harvested taps. That section, and only that section, takes the singleton lock:

```sql
-- Publish lease (the repurposed runner_lease row): taken at the START of the serial tail
-- (step 9), released at its end. Held for seconds-to-minutes, so the TTL is 10 minutes,
-- not 45. 1 row = the tail is yours. 0 rows = another cycle is publishing.
UPDATE public.runner_lease
   SET holder      = '<your cycle id>',
       stamp       = '<your stamp>',
       held_since  = now(),
       released_at = NULL,
       steals      = steals + (CASE WHEN holder IS NOT NULL THEN 1 ELSE 0 END),
       updated_at  = now()
 WHERE id = 1
   AND (holder IS NULL OR held_since < now() - INTERVAL '10 minutes')
RETURNING holder, steals;
```

**0 rows → WAIT, never skip:** retry every ~30s until you hold it (the 10-minute TTL bounds the
wait). The tail is where your cycle's record, cards, and John's harvested taps get written —
a cycle must never end without it. **This wait replaces the old "did not run — lease held by a
live cycle" exit, which is exactly the behavior John rejected.**

**Self-healing at the overwrite point ("fixes itself if it happens to notice it is about to
overwrite" — his words, the operative spec):** inside the tail, AFTER taking the publish lease,
re-fetch the live page and re-parse `briefing-state` — never republish from a harvest taken
before the lease, because another cycle may have republished while you were building. Decisions
are harvested idempotently (`UPDATE runner_items SET decision=… WHERE id=… AND decision IS
NULL` — only rows you actually flipped feed the ladder), so a double-harvest writes nothing
twice, and cards are always rebuilt from the DB's undecided set (register B18), never from
memory.

Three properties worth knowing before you edit any of this:

- **`holder` is deliberately not a foreign key.** The claim mints the cycle id with
  `gen_random_uuid()` *inside* the claiming UPDATE, and the `runner_cycles` row is inserted
  with that id in the next statement (step 1). Splitting it into claim-then-bind inside one
  statement does not work: Postgres silently drops a second UPDATE of the same row in the same
  statement, which would leave `holder` NULL and the lease effectively open.
- **The 10-minute TTL (register B42 — the repurposed `runner_lease`; B31's 45-minute
  cycle-level lease is retired) is the anti-deadlock — but a steal means the holder is SILENT,
  not dead (corrected `v7.0.123`, directive `c4d95dc7`).** A cloud session that goes quiet mid-cycle never
  releases; without a TTL the routine would be wedged until a human noticed, so the TTL has to
  exist and is unchanged. What was wrong is the sentence that used to sit here: *"Longest real
  cycle to date is ~18 minutes against a 3-hour cadence, so a stolen lease means the holder is
  dead, not slow."* Cycle `633fe486` disproves it by measurement — it opened `05:07:15Z`, had its
  lease stolen on the TTL at ~`05:52Z`, and was **still executing normally at `13:10:51Z`**
  (`select now()` read from inside that session), ~8 hours later, having completed its probe,
  subagent delegation, edits, kickoff doc, build, regression and snapshot export. A cloud session
  can be suspended and resumed across wall-clock gaps that are **invisible from inside it**, so
  the elapsed-time premise the old sentence rested on does not hold — the same correction step 0b
  makes for `failed`, applied here. A steal increments `steals`; a non-zero value is the signal
  that cycles are going silent, and belongs in the briefing when it moves. **Because a stolen-from
  cycle keeps running, the steal alone protects nothing — see the re-assertion gate below.**
- **The lease is ledger state, not content.** Its own columns (`holder`, `held_since`,
  `steals`, `released_at`) are the audit trail, so the claim and the release do not each need a
  `runner_before_images` row; anything else you write to it (a QA fixture, a manual repair)
  does, exactly like every other Supabase write.

**RE-ASSERT THE TICKET CLAIM BEFORE EVERY IRREVERSIBLE ACT — a claim is a starting gun, not a
standing guarantee (`v7.0.123`'s lesson, directive `c4d95dc7`, retargeted from the retired
cycle lease to the ticket claim, register B42).** The principle `633fe486` paid for is
unchanged: a cycle that lost its coordination token keeps working, because nothing tells it —
it came one command short of pushing a duplicate to `dev` and was saved only by an incidental
`git fetch`. Under parallel cycles the token is the **ticket claim** (24h expiry), so run this
immediately before **any** irreversible act — the step-7 push, and every counter claim
(`dev_version_counter`, `feature_id_counter`):

```sql
-- Re-assertion. 1 row = the ticket is still yours, proceed. 0 rows = your claim expired
-- and another session took it.
SELECT claimed_by, claimed_at FROM public.backlog_items
 WHERE backlog_id = '<your TICKET-ID>' AND claimed_by = '<your cycle id>'
   AND claimed_at > now() - INTERVAL '24 hours';
```

**0 rows → your claim is gone. STOP, and note precisely what stop means here:**

- **Do NOT push.** Whoever re-claimed the ticket after your claim expired may have shipped
  the very item you are holding. Pushing now is the duplicate-build failure, arriving late.
- **Do NOT claim a counter.** A version or ID claimed after you lost the ticket is a permanent
  gap at best and a collision at worst.
- **Do NOT touch the new claimant's claim.** The re-assertion is holder-guarded by
  construction — but attempting a "repair" write is how a cycle talks itself into touching a
  successor's state. Leave it alone, exactly as step 0b forbids adjudicating a predecessor's
  outcome.
- **Close and annotate your OWN row, then end.** `outcome='did_not_run'`, with the reason and
  the successor's holder id in `notes`. Your work is not necessarily lost: **push your session
  branch** (never `dev`) so the commits survive the container, and name that branch in the
  notes — `ba8f2ce3` and `633fe486` both did exactly this, and their work was recoverable by
  cherry-pick rather than redone.
- **Before you discard, check whether your item already shipped.** `git fetch origin dev` and
  read the log: if the successor shipped it, the discard is correct and deliberate; if it did
  **not**, say so in the notes so the item is re-picked rather than silently dropped.

The gate is cheap (one indexed single-row `SELECT`) and it is the enforcement point the standing
prohibition never had. **It does not replace the ship-point `git fetch origin dev`** — that
catches work that already landed on `dev` regardless of claims; this catches the case where your
claim expired and moved. Two different failures, both real, and `633fe486` was saved by the
first one only by accident.

**0b. A SILENT predecessor is PUSHED to John — and is never declared dead by a successor (John,
2026-08-21, directive `1d01ea85`, register B35; corrected the same cycle by measurement, B37).**
Asked what he wanted when a run dies, John answered: **"need to know why it died and what to do
next."** Detection already existed — the TTL steal and the `ended_at IS NULL` sweep — and it was
the *only* thing that noticed when `ba8f2ce3` and `633fe486` went quiet on 2026-08-21; John found
out from a briefing card the next morning. The signal was dying in the ledger. It no longer may.

**Read this before you write anything about a predecessor, because the obvious version of this
rule is wrong and was disproved live.** An open `runner_cycles` row past the 10-minute TTL (B42) means
the cycle is **silent**. It does **not** mean the cycle is dead. Measured 2026-08-21: cycles
`ba8f2ce3` (started 03:52Z) and `633fe486` (05:07Z) were closed `outcome='failed'` by a successor
at 08:24Z on exactly that reasoning — and both were **still executing**. They resumed, finished
their missions, wrote their own token accounting, discovered the live lease, correctly declined
to push, and filed their findings as directives at 13:11Z and 13:12Z — **more than nine hours
after they started and five hours after they were pronounced dead.** A harness suspend/resume,
not a death. So:

- **A successor never adjudicates a predecessor's outcome.** Take the lease — that is what the
  TTL is for, and it is still correct — but **do not** set `ended_at` or `outcome` on a row that
  is not yours. Only a cycle closes its own row. Closing it for them destroys the record they
  are about to write, and mislabels a working cycle as a failure in the ledger John reads.
- **`failed` on a silent row needs evidence, not elapsed time.** The longest observed resurrection
  gap is **~9h20m**. A row may be closed `failed` by someone else only after **24h** of no writes
  attributable to it (that bar is derived from the measurement, not chosen), and the closing note
  must say what evidence was used.
- **Say "went silent", never "died", in the push, the card and the ledger** — until something
  actually proves death. This is the `v7.0.115` failure (a hung probe's silence read as a finding)
  in its third costume; the rule "a subagent that has not returned is not a result" applies to an
  absent *cycle* exactly as it does to an absent *subagent*.

**Heartbeat first (`SES-103` — permission-stall tripwire, John's ask 2026-08-21, `v7.0.143`):
at every numbered step boundary, update your own row** — one cheap write per step. This is what
lets your peers tell John *where* you froze if a permission prompt catches you: a prompted
session is stuck inside the gated call and can send nothing itself (register B39), so the
heartbeat trail is its only voice.

```sql
UPDATE public.runner_cycles
   SET heartbeat_at = now(), last_step = '<step name>'
 WHERE id = '<your id>' AND ended_at IS NULL
RETURNING id;
```

**THE `AND ended_at IS NULL` IS THE RESUME GUARD, AND IT IS HALF OF `SES-194` (`v7.0.230`) — do
not drop it back to a bare `WHERE id`.** Since `SES-194` a peer may close your row if it has seen
no write attributable to you for 24h (the watchdog below). A cycle that comes back from a long
silence would otherwise heartbeat straight into a closed row and carry on as though nothing had
happened — pushing work whose ticket claim has already been released and possibly rebuilt. So the
heartbeat doubles as the check, at zero extra cost, and it is checked at **every** step boundary
rather than once, because a resume can land anywhere.

**0 rows → your row was closed while you were silent. ABORT CLEANLY, and note what that means:**

- **Do NOT push, and do NOT claim a counter.** Same two prohibitions as the lost-claim gate, for
  the same reason: whoever picked up your released ticket may have shipped it already.
- **Do NOT re-open your own row** — no clearing `ended_at`, no rewriting `outcome`. The closing
  cycle wrote a before-image and an evidence note; reopening destroys the record of a real event
  and is the mirror image of the thing B37 forbids a successor from doing to *you*.
- **Release any ticket claim you still hold** (holder-guarded, step 7's statement) and **push your
  session branch, never `dev`**, so the commits survive the container — exactly as the lost-claim
  gate directs. The watchdog's note on your row names the branch's cycle id; say so in your own
  final message.
- **Then end.** Your record is already written. A second row for the same work is not a recovery,
  it is a duplicate.

Run this at step 0, every cycle. **Under parallel cycles (register B42) an open row is
NORMAL — concurrency is the design, not a symptom.** Silence now has FOUR concrete shapes,
none of which is "another cycle exists":

```sql
-- (a) open cycle rows older than the 24h evidence bar (B37) — candidates for silence
SELECT id, started_at, item_id,
       round(extract(epoch FROM (now() - started_at))/3600, 1) AS hours_open
  FROM public.runner_cycles
 WHERE ended_at IS NULL AND id <> '<your cycle id>'
   AND started_at < now() - INTERVAL '24 hours';
-- (b) ticket claims past their 24h expiry (a session that vanished mid-build)
SELECT backlog_id, claimed_by, claimed_at FROM public.backlog_items
 WHERE claimed_at < now() - INTERVAL '24 hours' AND claimed_by IS NOT NULL;
-- (c) the publish lease wedged past its 10-minute TTL
SELECT holder, held_since FROM public.runner_lease
 WHERE id = 1 AND holder IS NOT NULL AND held_since < now() - INTERVAL '10 minutes';
-- (d) the PERMISSION-STALL TRIPWIRE (SES-103): an open peer whose heartbeat is >20 min stale
--     and who has not yet been reported — the fast detector John asked for.
--     THE BASIS IS coalesce(heartbeat_at, started_at) — the SAME expression stall_watchdog()
--     already uses, so the 20-minute detector and the 24-hour closer cannot disagree (SES-104).
SELECT id, started_at, last_step, heartbeat_at,
       round(extract(epoch FROM (now() - coalesce(heartbeat_at, started_at)))/60) AS minutes_frozen,
       (heartbeat_at IS NULL) AS never_reported
  FROM public.runner_cycles
 WHERE ended_at IS NULL AND id <> '<your cycle id>'
   AND coalesce(heartbeat_at, started_at) < now() - INTERVAL '20 minutes'
   AND stall_notified_at IS NULL;
```

**WHY (d) MEASURES FROM `coalesce(heartbeat_at, started_at)` AND NOT FROM `heartbeat_at`
(`SES-104`, `v7.0.310`, migration `ses104_null_never_reported_heartbeats`).** A row that never
wrote a heartbeat is **not yet reporting**, and its only honest basis is its own `started_at`.
The bare form got that wrong in two directions at once, and the two are not alternatives — each
needs its own half of the fix:

- **A NULL heartbeat was INVISIBLE to the tripwire, while the watchdog could still close the row.**
  `heartbeat_at < now() - INTERVAL '20 minutes'` evaluates to NULL — not true — for a NULL
  heartbeat, so the row silently dropped out of (d) and John got no push; `stall_watchdog()` has
  coalesced since `SES-194`, so the *same* row was still eligible to be closed `failed` at the 24h
  bar. A cycle could therefore be closed for going silent having never produced the 20-minute alert
  the tripwire exists to send. Two detectors over one column disagreeing about what a missing value
  means is the drift this repo keeps paying for; they now share one expression.
- **A WRONG heartbeat cannot be repaired by any reader, which is why the data had to move too.**
  `ses103_permission_stall_tripwire` backfilled `heartbeat_at` to the single constant
  `2026-08-21 18:19:19.001555+00` on every pre-existing row, so 43 cycles that never sent a
  heartbeat carried one that looks exactly like a real one — `minutes_frozen` then measured time
  since that migration, not since a freeze, and reported "110" for cycle `db8b9eee` on the
  tripwire's first real fire. `coalesce` is powerless against a non-NULL wrong value, so the
  migration above sets those rows NULL. **The ticket's own "backfill … **or** exclude NULL from (d)"
  is wrong on that "or": neither half substitutes for the other.**

Two boundaries, so this is not re-derived differently later:

- **`never_reported` is projected, never filtered on.** A never-reporting open peer is exactly as
  worth pushing as a frozen one — more so, since it has not even reached its first step boundary —
  and it changes only the *wording* of the push: "has not reported since it started" rather than
  "frozen since its last step". Turning the column into a `WHERE` clause rebuilds the invisibility
  this fixed.
- **The column's `DEFAULT now()` is deliberately NOT dropped.** It is what makes a fresh row's
  basis equal its own `started_at`, which is the correct basis; removing it is a change to every
  future INSERT that this ticket did not ask for, and under the coalesce it would be
  observationally identical anyway. Consequence, stated rather than left to be discovered: on
  today's schema a *live* row cannot carry NULL, so the NULL arm of (d) guards the 43 historical
  rows and any future explicit NULL — it is a removed divergence, not a hot path.

**A row from (d) gets its own IMMEDIATE push — this is the "a session is asking for
permission" alert (`SES-103`).** First claim the report atomically so John gets exactly one
push per stall, however many peers are sweeping:
`UPDATE runner_cycles SET stall_notified_at = now() WHERE id = '<stalled id>' AND
stall_notified_at IS NULL RETURNING id` — 0 rows means another peer already pushed; stand down.
On 1 row, push: which cycle, frozen since when, its `last_step`, and the hypothesis stated as a
hypothesis — *"likely waiting on a permission prompt only you can see, in that session's
window"* when the last step touched a known gated path class, plainer "went quiet at step X"
otherwise. Tell John where the prompt would be; whether to open it is his call — never phrase
approval as a task he owes (the 34865f07 rule). If the cycle later resumes, its own next
heartbeat is the all-clear; note the resolution in your tail if you observe it.

**THE WATCHDOG — one call, run it right after the sweep, every cycle (`SES-194`, `v7.0.230`,
migration `ses194_stall_watchdog`).** Probe (d) *detects* a frozen peer and pushes John once.
Until this shipped **nothing ever closed one**, so a silent cycle's row stayed open forever and
its ticket claim stranded until the 24h expiry — measured live 2026-08-24T17:45Z: `e4074c97`
(frozen 124 min at *"step 5 — pick"*) and `039d1477` (108 min at *"step 3/4"*) both still open
and both stall-notified at 16:25Z, with a claim on `SES-141` stranded 2,238 minutes:

```sql
SELECT * FROM public.stall_watchdog('<your cycle id>');
```

**0 rows is the normal, quiet case and says nothing on the page.** 1 row means you closed one
silent peer: it returns `closed_cycle`, `frozen_hours`, that cycle's `last_step`,
`claims_released` and `lease_released` — put them in your own `notes`, and mention it on the
briefing only when a claim was actually released, because that is the part that changed the board.

Four properties, each of which is how this gets rebuilt wrong:

- **THE THRESHOLD IS 24h AND IT IS NOT A NEW NUMBER.** It is register B37's evidence bar,
  implemented rather than widened: *"a row may be closed `failed` by someone else only after 24h
  of no writes attributable to it… and the closing note must say what evidence was used."* The
  20-minute tripwire **notifies**; the 24-hour bar **closes**; the gap between them is deliberate.
  A later cycle will find that gap frustrating — two peers sat visibly frozen for two hours and
  this step did nothing about them — and will be tempted to tune the watchdog down toward the
  tripwire. **That is the one edit this step forbids.** B37's own text forbids re-softening on a
  latency reading, and it is written from `ba8f2ce3` and `633fe486`, which were pronounced dead at
  ~3h and came back **nine hours later** and finished their missions. A shorter bar does not catch
  stalls sooner; it manufactures duplicate builds.
- **It closes exactly ONE row per cycle, oldest first** — the self-limiting shape step 4b's
  invention pass and step 8d's gate-review sweep already use. Three silent peers take three cycles
  to clear, which is fine: nothing is racing.
- **The guarded `UPDATE` is the atomic claim**, the same shape as `stall_notified_at`, so exactly
  one peer closes a given row however many sweep at once. The before-image and the close sit in one
  subtransaction that rolls **both** back on a lost race — so §19v's *no before-image, no write*
  holds in both directions and a lost race leaves no stray ledger row.
- **`failed` here is a bookkeeping value, never a verdict on the work, and the note says WENT
  SILENT — never that the cycle died.** `runner_cycles_outcome_check` admits no in-progress or
  unknown value to prefer, and B37 names `failed` for precisely this close. The generated note
  carries the observable evidence (frozen hours, last heartbeat, `last_step`) because B37 requires
  the evidence used and not merely the conclusion.

**This does NOT license adjudicating a predecessor (B37 is intact).** The watchdog is the *one*
sanctioned close, at the *one* bar John's own measurement produced, through a function that writes
the evidence for you. Closing a row any other way — by hand, at a shorter threshold, or with an
outcome you reasoned your way to — is still forbidden, and is still the failure that mislabelled
two working cycles in the ledger John reads.

Any row from these — or a `steals` jump on your own tail-lease claim — means a session has
gone silent. **Send a push notification** carrying both halves of what John asked for — and
leave the row alone:

- **Why it went silent — only what is observable.** Which cycle, when it started, how long it
  has been quiet, what it had picked (`item_id` / `notes`), whether the lease was taken by TTL
  steal or found free, and whether anything was pushed. **State the limit in the message
  itself:** a cloud cycle's transcript is not readable from here, so the runner reports last
  observable *state* plus a named hypothesis — never a cause it did not observe. "It went silent
  after step N and the last thing it wrote was X" is a real answer; an invented root cause is
  not, and neither is "it died".
- **There is now a LEADING hypothesis, and it is evidenced (register B39, 2026-08-21).** When a
  cycle goes quiet, check first whether its last observable step touched a `.claude/` path.
  If it did, the named hypothesis is **parked on a permission prompt that only a human can
  answer** — step 0's clause has the measurement, and the partition there is exact: every
  observed park happened while John was away, every clearance while he was at his desk. Say it
  as the hypothesis it is, still labelled, still alongside the observable state. It does **not**
  license skipping the "only what is observable" rule above; it means the runner finally has
  something better than a shrug to put next to the state.
- **A silence during John's own waking hours is a DIFFERENT finding.** The evidenced cause
  requires his absence. A cycle that goes quiet while he is demonstrably in the app is not
  explained by B39, and the push should say so rather than reach for the nearest known cause —
  that reflex is how this platform got three wrong rulings in a row.
- **What to do next — concretely, including "nothing".** Most silences need no action at all:
  the claim's 24h expiry re-opens the ticket, the next cycle re-picks it, and the silent
  cycle may simply come back and finish. Say that plainly rather than implying an emergency. Name
  an action only for real residue: a directive stuck `in_progress` (re-claim it — before-image
  first, never quietly), a version number claimed and unused (a permanent counter gap; record it,
  never reuse it), an unpushed session branch (**recoverable — cherry-pick it, do not redo the
  work**; check for one before assuming anything was lost), or the same mission going silent
  twice, which is the one shape that means *stop and look* rather than *let it retry*.
  **One thing that is NOT an action to give him.** Opening the session and approving the prompt
  does clear a `.claude/` park — that is how the 2026-08-21 pair came back. **Never write that
  to John as the remedy.** He has ruled on it (`34865f07`: *"That should not be happening"*), and
  a push that hands him a tap to perform has converted his instruction into a chore. Report the
  park, name what it cost, and say the work is recoverable; the fix belongs in the procedure —
  the cycle should not have entered the gate — not in his inbox.

Two consecutive silences on the same item is itself the finding, and the push says so — that is
what `ba8f2ce3` and `633fe486` were, and nothing told him at the time. Both, note, later came
back and pushed their work to their own session branches; the correct action for that pair was
"cherry-pick `69bc903`", never "the work is gone".

**1. Open the cycle — and tell John's phone it started (`SES-102` — runner transparency on the
phone, John's ask 2026-08-21, `v7.0.142`).** Immediately after inserting your cycle row, send
**exactly one push notification**: fire kind + time + where the result lands — e.g.
`"Runner cycle started (scheduled 3:00 PM CST fire). Pick and outcome will be on the briefing."`
(or `"(manual fire)"` when the start time sits off the 3-hour grid). One push per cycle open,
never more — the step-0b silence pushes and the close-out remain the only other notification
senders. If no push mechanism is available in the environment, note that in the cycle row and
continue. INSERT `runner_cycles` **with the id the claim returned** —
`INSERT INTO runner_cycles (id, stamp, trigger, model) VALUES ('<claimed cycle_id>', …)` — via
the connector, leaving `outcome` NULL until close (the check constraint has no in-progress
value; found live, SES-78c). Every later step's evidence hangs off this row's id; "who is
running right now" is `SELECT … FROM runner_cycles WHERE ended_at IS NULL` — and under
parallel cycles (register B42) **multiple open rows are normal**, not a signal.

**Release the PUBLISH lease at the end of your tail — and only if you took it.** Every cycle,
even a wall-stop or a `failed` close, still runs the serial tail (its record must be written),
so the release always happens there. The statement is holder-guarded so a cycle whose tail
lease was TTL-stolen can never clobber the new holder:

```sql
UPDATE public.runner_lease
   SET holder = NULL, released_at = now(), updated_at = now()
 WHERE id = 1 AND holder = '<your cycle id>'
RETURNING released_at;   -- 0 rows = the tail lease was stolen; leave the new holder alone
```

**1b. THE SETTINGS GATE — John's Automation panel, honoured (`SES-143`, `v7.0.182`, migration
`ses143_runner_settings`).** §2b of the briefing gives John a scheduler switch with an interval and
a drain switch. This is the step that makes them binding. Run it immediately after your cycle row
exists — it needs a row to close — and before anything else:

```sql
SELECT * FROM public.scheduler_gate('<your cycle id>', '<your prompt''s trigger: line, verbatim>', now());
```

- **`verdict = 'run'`** → carry on to step 2. The normal case.
- **`verdict` anything else** (`paced` / `scheduler-off`) → **close the cycle now**:
  `outcome='did_not_run'`, the returned `reason` verbatim in `notes`, `item_id` NULL. Then run the
  step-9 serial tail exactly as any other wall-stop does (its record must be written), rename the
  session per the routine prompt (`"did not run — paced by your scheduler setting"` /
  `"did not run — scheduler off"`), release any claim you hold, and **end**. Gate A means you fire
  no successor.

**Why this is a gate and not a cron change.** A cycle **cannot edit the routine that fired it** —
the platform refused exactly that on 2026-08-23 (`SES-140`, verbatim: *"fire_trigger: this routine
was created via http_api, not by an agent"*). It does not need to. The stored prompt already says
*"execute runner-cycle.md EXACTLY"*, so this step binds every future cycle with no trigger edit at
all: **the cron stays hourly permanently and each cycle paces itself down to John's `N`.** That is
also what **retires `SES-140`'s restore obligation** — there is no interval left to restore.

Five properties of `scheduler_gate()` that are load-bearing. **Do not re-derive any of them by
hand** — that is the eighth time this platform would have made the same mistake (`SES-86` phase 3,
`v7.0.146`, `SES-101`, `SES-111`, `SES-127`, `SES-128`, `SES-129`):

- **PACING IS JOHN'S CLOCK GRID, not elapsed time since a predecessor (`SES-151`, `v7.0.196`).**
  A scheduled fire runs iff its cycle row's `started_at` falls in an **America/Chicago hour
  divisible by `interval_hours`** — at the standing 3 that is **12, 3, 6, 9 AM/PM on John's
  clock**, exactly, every day, DST-proof by construction (wall clock, not UTC — the retired
  UTC-cron realign chore is gone for good). Why the elapsed-hours form had to die, measured not
  reasoned: its `v_hours` mixed clocks (call-time `now()` against the predecessor's
  `started_at`), so sub-minute step-0 jitter decided verdicts — **3 of 9 hourly fires were
  wrongly paced in the `interval=1h` era** (cycle `6177c7aa`, question
  `q-hourly-interval-boundary`) — and at any interval it drifts off whatever clock grid John
  actually means. The grid form has no boundary to jitter across: the minute never matters, only
  the hour.
- **THE PREDECESSOR IS THE LAST CYCLE THAT ACTUALLY RAN**, i.e. the most recent row whose
  `outcome` is **not** `did_not_run` (an open row counts — a peer running right now is the runner
  running; a `failed` row counts — it consumed a slot). Since `SES-151` the predecessor is
  **reporting-only** (the verdict reads the clock grid), but the predicate is preserved
  byte-for-byte and must never regress to *"the most recent `runner_cycles` row"* — under any
  future elapsed-time use that form **wedges the runner shut permanently** (`t=0` runs, `t=1h`
  is paced, every later fire's predecessor is the paced row an hour earlier). Proven with a
  negative control rather than reasoned about.
- **It fails OPEN in every unknown** — no settings row, a NULL column, no predecessor, a trigger
  word it does not recognise → `run`. A gate that can stop the whole fleet must never stop it by
  accident. `scheduler_on = false` is the only thing that switches the runner off, and that is
  John's decision, never a default the code fell into.
- **The scheduler governs SCHEDULED cycles only** (spec, verbatim). Pass your prompt's `trigger:`
  line **as written**: `scheduled` is paced, `chained (drain continuation)` (`SES-141`) is exempt
  and runs regardless of interval. So scheduler OFF + drain ON = the chain still runs, and while a
  drain is standing **the chain, not the interval, sets the real cadence** — which is the spec's
  own choice, and John turns it off with the drain checkbox, not the scheduler one.
  **The function NORMALISES what you pass, and until `SES-146` it did not (`v7.0.188`).** It now
  strips a leading `trigger:`, trims and lowercases before matching, so the verbatim line and the
  bare word both work. **That instruction above used to be false in the one direction a cycle is
  most likely to take it:** the retired body tested `p_trigger = 'scheduled'` by exact equality, so
  a cycle passing `trigger: scheduled` — which is what *"as written"* means, and what the stored
  prompt's *"execute it EXACTLY"* commands — fell through to *"not a scheduled cycle"* and skipped
  **both** the pacing branch **and** the `scheduler_on = false` branch beneath it. It failed open,
  so nothing broke and nothing in the ledger showed it; the five paced rows to date all happened to
  pass the bare word. Do not "simplify" the normalisation back to an equality test.
- **A manual fire is exempt**, detected as a start that sits **off the cron grid** — the same test
  step 1 already uses to label a fire `(manual fire)`. This is the one case the spec does not
  settle, and it had to be settled somehow, because §2b puts John's own *"▶ Run a cycle now"* link
  on that very panel and a paced-out tap is a dead button. The grid minute is the column
  `runner_settings.cron_minute` (40, read live from the routine), so correcting it is one `UPDATE`.
  Filed as question `q-manual-fire-pacing` rather than left as an inference.
  **The grid is measured against your cycle row's `started_at`, NOT against the `p_started` you pass
  (`SES-146`, `v7.0.188`) — and the tolerance is the column `runner_settings.grid_tolerance_min`
  (default 10, `CHECK 0..30`), never a literal.** The retired body compared `p_started` — `now()` at
  the moment you *reach* this step — against `cron_minute` with a hardcoded ±2. That clock drifts
  with how much work step 0 did first, so the defect got **worse as this runbook grew**: cycle
  `72561db3` fired at `13:40:52Z`, reached the gate at `13:43:12Z` (distance 3), and was exempted as
  a "manual fire" it was not. `started_at` is stamped at step 1, immediately after step 0, and is the
  earliest fire-time proxy reachable from SQL; an unresolvable cycle id falls back to `p_started`
  rather than raising, so the unknown path still fails open. Same *"a column, not a literal"*
  correction this step already made for `cron_minute`, applied one level further.

**2. Harvest John's judgment — the WRITES now happen inside the step-9 serial tail (register
B42), under the publish lease; this step is now READ-ONLY.** Read the page for anything that
changes your selection — new directive text, a fresh usage reading, taps on gated cards — and
carry it forward, but write nothing here: decision/ladder/reading/directive writes race under
parallel cycles and belong in the tail, where they are idempotent (`… AND decision IS NULL`)
and serialized. The rules below govern those writes wherever they run. Original step text:
Read the briefing page (URL in
`docs/runbooks/briefing-page.md`) and parse its `briefing-state` JSON block.
**THE READ CAN COME BACK TRUNCATED — TEST YOUR HARVEST, never conclude from which tool you used
(`SES-188`, `v7.0.216`).** Both read paths are the same artifact-reader interception and differ
only in how much head they return, so one tool's short read is not evidence the block is
unreachable — measured live 2026-08-24, `Artifact` `read` stopped short of it and `WebFetch`
returned it complete, on the same page four seconds apart. The test, the two branches
(verified → rebuild; unverified → **decline the republish**, still mandatory), and why this must
not become *"use WebFetch, it works"* live in `briefing-page.md`'s decision read-back contract —
**cited here, not restated**, so these two files cannot drift the way step 5 and step 7 did
before `v7.0.114`. For each decided
item: write `decision`/`decision_reason`/`decided_at` to `runner_items`; **Accept** → ladder
streak +1, and **promote a rung on every 5th Accept — the test is `streak % 5 = 0`, never "at
least 5" — leaving the streak to keep counting (see the no-reset rule below)**, **on a `shipped`
card only — see the gated-card rule below**;
**Reverse** → revert-forward the item's commits, restore its before-images **through the one call
below — never by hand**, reopen its backlog row carrying John's line, ladder streak → 0 and
rung −1; **Rework** → John's line becomes a new `runner_directives` row, queued first.

**A REVERSE ON A `ship` CARD PUTS THE PROVABLY-SAFE ROWS BACK, AND THE APPLY IS GATED IN SQL RATHER
THAN HERE (`SES-182` slice 5, `v7.0.336`, migration `ses182e_apply_data_restore`; John, attended
architect session 2026-08-30, gated card `b75f5603` accepted 21:02Z).** His word on the card was
*"Whatever is your suggestion"* against the suggestion put to him, which is the narrow branch and
is quoted here because the whole slice is scoped by it: **wire the safe-row apply behind John's
Reverse click only; doubtful rows always list-only; nothing automatic.** Slice 4 shipped the plan
(`plan_data_restore()`); this is the only thing that ever acts on it. One call, for each `ship`
card whose `decision` you just flipped to `reverse`:

```sql
SELECT * FROM public.apply_data_restore('<your cycle id>', '<the reversed runner_items row id>');
```

- **`outcome = 'applied'`** → `applied_deletes` / `applied_upserts` are what it put back, and
  `skipped_unverifiable` / `skipped_refused` are what it deliberately left alone. Put all four in
  your `notes`, and say the two skip counts on the briefing in John's register — a row left alone
  is the honest half of what he accepted.
- **`outcome = 'refused'`** → `reason` says which half of the gate stopped it. This is normal, not
  an error: an undecided card, an accepted one, or an incident card all land here.
- **`outcome = 'already_applied'`** → a peer harvested the same tap. Nothing was written twice.

**Do not add a "should I apply it?" branch anywhere in this runbook.** The gate is the function's
own predicate — `kind = 'ship'` **and** `decision = 'reverse'` — and it is in SQL for the reason
this file records eight times over (`record_skip`'s precedent): a rule each cycle must remember is
a rule that gets silently forgotten, and John's *"nothing automatic"* is far too expensive to leave
to memory. At rollback time no reversed ship card exists, so step 8a **cannot** reach the apply
even if a later cycle tried to wire it there.

**THE EDIT THIS FORBIDS: widening the gate to "any reversed card".** A Reverse means two opposite
things on the two kinds. On a `ship` card it is *"I reject this delivery"* and the range is that
card's own `cycle_id` — the cycle that made the writes. On the `gated_before_build` **incident**
card (slice 1) it is *"the rollback was wrong, put the code BACK"*, and its `cycle_id` is the
**observing** cycle, not the pushing one — so the widened form replays the wrong range's rows into
production, which is not a near-miss but the opposite operation. Pinned by
`tests/regression/SES-182e-restore-apply.js`, whose control runs the retired any-reversed-card form
on the **same** fixture and asserts it applies rows where the shipped one applies none.

**What it will NOT do, which is John's constraint 2 and not a gap:** `unverifiable` and `refused`
rows are counted and reported, **never written**. `unverifiable` means the table carries no
`updated_at`, so *"nobody wrote this since"* is unprovable there by construction — 24 of the live
population, measured on the card. Ledger tables are excluded by inheritance from
`plan_data_restore()`'s own denylist, never by a second list here.

**Two properties of the apply relocated here from the retiring `v7.0.336` stamp (`SES-244`,
`v7.0.348` — the `SES-164` step-2 check that makes a trim safe; both appeared ZERO times anywhere in
this body, checked by grep rather than recollection):**

- **Idempotence is structural via `runner_items.restore_applied_at`, and it is load-bearing rather
  than tidy.** It makes a second call a no-op, so a re-run — or two peers harvesting one tap under
  parallel cycles (register B42) — cannot apply a restore twice. That is not merely untidy: a
  double-applied restore **re-deletes a row a later write legitimately re-created**. Same
  `apply_ladder_decision` shape, for the same reason.
- **Generated columns are dropped from the restore column list (`attgenerated = ''`).** That is
  `SES-220`'s lesson — they cannot be inserted into, so a restore that names them fails outright.

**AN ACCEPT ON A `shipped` CARD NOW WRITES THE TICKET `done` — IT IS THE ONLY THING THAT EVER DOES
(`SES-154`, `v7.0.205`; spec `docs/design/BRIEFING-COMMENTS-0823-DRAFT.md` decision 1).** Step 7's
close-out writes `delivered`; this harvest is where completion is actually conferred. Before-image
first, like every Supabase write, then set `status = 'done'` and run
`SELECT public.recompute_backlog_queue();` — **this is the call site that releases the ticket's
queue number**, which step 7 deliberately no longer does. Two boundaries so this cannot be
re-derived differently:

- **It applies to a `shipped` card only.** An Accept on a `gated_before_build` card is permission to
  build, not a verdict on work — it has no `delivered` ticket behind it, touches no ladder (B34, superseded
  2026-09-01 by `M6-07` — `SES-285`, annotated `SES-289`; B34 was right and stays right, its subject
  simply no longer arrives, and `apply_ladder_decision()` still short-circuits gated rows),
  and must never write `done`.
- **Reverse is the reject, and it already did the right thing.** Its existing rule — revert forward,
  restore before-images, reopen the backlog row carrying John's line — is unchanged and needs no
  edit: reopening a `delivered` ticket restores the prior open state, which is exactly what decision
  1 asks of a rejection. Note plainly rather than inventing it: **the spec's decision 2 renames this
  button to "Reject"; that rename is not this ticket and has not shipped**, so the page still says
  Reverse and so does this runbook. Do not write a rule against a button that does not exist yet.

**What this changes about waiting, which is the point of the ticket:** nothing. The runner never
blocks on an Accept. A delivered ticket is stepped past at step 5 and is unpickable by a drain in
SQL, so it cannot be built twice while it waits, and a cycle that finds nothing but delivered work
falls through to the board exactly as it does for any other blocked prefix.

**AN ACCEPT NOW CLEARS THE `design_status` FLAG ITS CARD'S ASK CARRIED, AND IT IS NOT A STEP YOU
RUN — IT IS A TRIGGER (`SES-219`, `v7.0.296`, migration `ses219_accept_clears_design_flag`; John,
attended architect session 2026-08-28, directive `7384b9e3`, verbatim: *"accept the flag-clearing
fix now so I stop doing this manually"*).** Filing a gated card writes `design_status` on the
ticket (step 5's block) so the next cycle reads the block instead of re-deriving it from prose.
Nothing ever cleared it. So John's tap answered the ask and the ticket went on advertising the
same ask, until he cleared the column by hand — which is what he was doing, three times in one
session on 2026-08-28 (cards `599e76bb`, `528ab5ba`, `6699d220`, all naming `SES-191`).

**Do not add a clearing step here.** `public.runner_items_accept_clears_flag()` fires on
`runner_items` when `decision` becomes `accept`, writes its own before-image, and clears the flag
— so this paragraph is a description, never an instruction. That placement is the whole design
choice `SES-219` left to its build cycle, and it was made on two grounds. This file records eight
times over (`SES-86` phase 3, `v7.0.146`, `SES-101`, `SES-111`, `SES-127`, `SES-128`, `SES-129`,
`SES-143`) that **a rule each cycle must remember is a rule that gets silently forgotten** — the
`record_skip()` precedent. And the ticket's own requirement names **two** writers, *"a decision
harvest (page tap **or** attended-session record)"*: an attended session UPDATEs `runner_items`
directly and never reads this tail, so a rule written here would bind one of the two writers and
miss the other. The trigger binds both.

Three boundaries, each of which is how a later edit breaks it:

- **`john-paced` and `designed` are NOT cleared, and widening the predicate to "any non-null
  `design_status`" is the edit this forbids.** `john-paced` is John's word about his own pace
  (`SES-166`) and this runbook forbids a cycle even *assigning* it — so a cycle's card being
  accepted must never retract it. That is the ticket's own scope guard. `designed` is
  **explicitly not a skip** (step 5's blocked-prefix table) and is step 6's fast path: clearing it
  discards a kickoff link `SES-112`'s CHECK guarantees exists, and sends the next cycle to
  re-design a ticket that already has a design. Only the two flags a cycle writes at filing time —
  `needs-john`, `needs-desktop` — are cleared.
- **NOTHING WAS BACKFILLED, and that is a safety property rather than caution.** Measured live at
  this ship: **four** open tickets carry `needs-john` while already holding an accepted card —
  `LAV-30`, `SES-182`, `SES-180`, `LOG-70`. One of them is the reason the backfill would be wrong:
  `SES-182` is under John's **explicit standing hold** (directive `58db64ae` item 6 — *"SES-182
  HOLDS until SES-191's boot-restore scores exit criterion 5 … do not flag it, do not pick it"*),
  so clearing its flag would hand the picker a ticket he has ordered left alone. Forward-only is
  the boundary `B34` (superseded 2026-09-01 by `M6-07` — `SES-285`, annotated `SES-289`; the
  forward-only reasoning it drew is unchanged and `M6-07` is built on it) and `SES-107` already
  drew for the ladder, applied here.
- **It loops rather than issuing one `UPDATE`, because `backlog_id` is NOT unique** — `CHI-48`
  occupies two rows (`SES-97`). §19v wants one before-image per row written; a single
  `UPDATE … WHERE backlog_id = …` writes two rows behind one image.

**Named deviation, disclosed rather than buried (the `SES-196` convention).** The ticket says *"the
flag the accepted card itself carried — a card filed by the cycle that set `design_status` on that
`backlog_id`"*, and the shipped predicate keys on the card's `backlog_id` **alone**, not on the
filing cycle. The narrower reading was checked against the live cases and **misses them**: card
`528ab5ba` was filed by cycle `69064827` while `SES-191`'s flag had been set by an earlier cycle, so
a filing-cycle test would not have cleared the very flag John cleared by hand. `backlog_id` is the
relatedness test the scope guard actually needs — *"an Accept on an unrelated card"* is an Accept
naming a **different ticket**.

**THE STREAK IS NEVER RESET ON PROMOTION — the count keeps running, and a rung is earned on every
5th Accept (John, 2026-08-21, question `q-ladder-streak-reset` answered **no** at 22:04Z; `SES-107`,
`v7.0.148`).** The written rule used to be *"Accept → streak +1 (5 consecutive → rung +1)"*, which
never said what happens to the streak **after** a promotion. Cycle `7392e345` hit that blank live
at 20:27Z — John's Accept took `tooling` from streak 4 to 5, promoting rung 6 → 7 — set the streak
to 0, and filed the question rather than letting an invented rule stand. John's answer was **no**,
with his own words on the card: *"which one just keeps the count going? no need to reset - why
would i do that?"*

**Why the reset existed, and why removing it alone would have been wrong.** Written as *promote at
5 **or more***, a streak left at 5 promotes again on the very next Accept, and again on the one
after that — **a rung per tap, forever**. That runaway is not what John asked for either; it is
simply the opposite failure, and it would have compounded the runner's own autonomy on a rule
nobody wrote. The form that gives him exactly what he asked for **without** the runaway is the one
now in force, and it is stated as a test so the ambiguity cannot come back:

```
promotion  ⇔  streak % 5 = 0        -- 5, 10, 15, … ; NEVER "streak >= 5"
after promotion:  streak keeps its value — it is not reset, not to 0 and not to anything else
```

Three boundaries, so no later cycle has to guess:

- **A `Reverse` still sets the streak to 0.** That is a different rule, John ruled on it
  separately ("leave it", directive `1d01ea85`), and it is untouched here. Only *promotion* stops
  resetting.
- **Forward only; the ladder's history is NOT re-derived** — register B34's boundary (B34 superseded
  2026-09-01 by `M6-07`; `SES-285`, annotated `SES-289` — the boundary itself is unchanged), and John
  answered `q-ladder-rewind` **no**. Note what this did and did not cost, because it was measured
  rather than assumed (`SES-107`): replaying tonight's `runner_ladder` before-images under the new
  rule yields **exactly the stored row**, because the two `Reverse`s at 21:21Z and 22:22Z each set
  the streak to 0 regardless, erasing the difference. The correction John was promised on the card
  is a **no-op on this row** — which is worth saying to him plainly rather than quietly skipping.
- **THE RULE IS EXECUTABLE NOW — DO NOT APPLY THE ARITHMETIC BY HAND (`SES-134`, `v7.0.315`,
  migration `ses134_ladder_executable`).** This bullet used to read *"no code implements the ladder…
  every cycle applies it by hand in SQL at harvest time… John's call, filed as a question, not done
  here."* He answered **yes** (`q-ladder-executable`, 2026-08-23T00:35Z) and it is built. For each
  card whose `decision` you just flipped, make **one call** — never your own `UPDATE`:

```sql
SELECT * FROM public.apply_ladder_decision('<your cycle id>', '<the runner_items row id>');
```

  It encodes every rule above and the two beside it, so none of them can be re-derived differently:
  Accept on a `shipped` card → `streak + 1` and promote **iff** `streak % 5 = 0` with the streak
  **not** reset; `Reverse` → `streak 0`, `rung - 1` floored at 0; a `gated_before_build` card →
  **nothing** (B34); B34 was superseded 2026-09-01 by `M6-07` (`SES-285`, annotated `SES-289`) and
  this short-circuit is unchanged, still enforced in SQL; a `rework` → nothing; a class with no
  ladder row (`P1`/`P3`/`P4`/`P6`) →
  nothing, and it says so in `reason`. It writes its own `runner_before_images` row (§19v), so the
  call is the whole of your obligation. `work_class` is resolved from the ticket's `priority_class`
  **digit**, never the string — `P9 - Bug Fixes · FLAGGED` is a different string and the same class.

  **It is idempotent by construction and that is load-bearing, not tidiness:**
  `runner_items.ladder_applied_at` makes a second call a no-op, so a re-run — or two peers
  harvesting one tap under parallel cycles (register B42) — cannot double-count a streak. A
  double-counted streak does not merely look wrong; it silently **manufactures a promotion**.

  **The grep this bullet used to cite is stale and was corrected rather than repeated:**
  `runner_ladder` now appears in `scripts/build-briefing.mjs` and one test, but **both only read**
  it — the builder's §13 render is a projection. Nothing but this function writes the ladder.

  **AN ANNOTATION IS NOT FREE TO REFLOW A LINE A GUARD READS — relocated here from the `SES-289`
  stamp by `SES-310` (`v7.0.393`) under `SES-164` step 2, because it appeared nowhere in this body.**
  <!-- FEATURE: SES-310 — SES-289 editor warning with no body home, relocated next to the site it protects. -->
  `tests/regression/SES-134-ladder-executable.js` pins two **literal strings** in the two paragraphs
  above — the gated-card row's bolded short-circuit word with its `(B34)` tag (`B34` was **superseded**
  2026-09-01 by `M6-07`; `SES-285`, annotated `SES-289` — the short-circuit itself is unchanged), and
  the bolded read-only verdict in the stale-grep correction — so `SES-289`'s withdrawal annotation had
  to follow that row's closing paren rather than sit inside it, and a later editor re-wrapping either
  sentence turns that test red. **Do not restate either pinned phrase verbatim anywhere else in this
  file either:** both of that test's negative controls mutate only the *first* occurrence, so a second
  copy leaves the clause passing after its own mutation — a vacuous control, which is the failure
  `SES-158` caught here once already. Read the guard before reflowing this bullet. This paragraph's own
  `B34` mention is annotated inline for exactly the reason it describes: check 9 decides within the
  enclosing block, so a bare mention here would flag even though the annotation sits two paragraphs up.

**`B34` was SUPERSEDED 2026-09-01 by `M6-07` (`SES-285`, `v7.0.359`; annotated here by `SES-289`). Its rendered rule block was removed by `SES-301` (`v7.0.392`) — a withdrawn rule keeps no rendered block (`SES-300`'s B12 precedent). B34 was right and stays right, its subject (a gated Accept) simply no longer arrives, and `public.apply_ladder_decision()` still short-circuits every `gated_before_build` row in SQL.**

**THE EDIT THIS FORBIDS: re-rendering the block back into existence.** <!-- FEATURE: SES-122 (c) —
`SES-301`'s editor warning, relocated here under session-hygiene check 7 step 2 when its stamp was
retired to hold the count at 5; grep found it NOWHERE else in this body. --> Relocated here from the
`SES-301` stamp (`v7.0.392`) by `SES-122` (c). `node scripts/render-rule-blocks.js --write` is one
command away and will happily put a quoted `Rule B34` line back under a restored marker — the guard
matches that line at the start of a line, so do not reproduce its literal form anywhere in this file
either. A restored block restates a withdrawn rule in live voice, the exact defect `SES-301` spent a
ship removing. The
sanctioned use of that command is the *other* direction — edit the registry row, re-export
`docs/governance/RULES-SNAPSHOT.md`, then re-render so a **live** rule's quoted line follows its row.
It is never a way to bring a superseded rule's block back, and flipping the row to `live` to make the
render legitimate is the sibling forbidden edit stated at step 8b-bis. Guarded by
`tests/regression/ses-301-b34-rendered-block.test.mjs`, both directions.

**John, 2026-08-21, directive `fb643367`.** Concretely: it does NOT touch
`runner_ladder`. Asked outright
whether a gated Accept should count toward the ladder, John answered **"no"**. The reason it
matters is not bookkeeping: the ladder measures whether the runner's *unattended judgment* can
be trusted, and it is fed by John's verdict on work the runner **already did**. A gated card is
the opposite transaction — the runner did not build, and is asking. Counting "yes, go ahead" as
five-sixths of a promotion pays the runner for asking permission, which is the one behaviour
that must always be free. So a gated Accept does exactly two things, both unchanged: it
authorises that one build, and it re-enters the ticket at queue #1 (register B23 — retired
2026-09-01 by `SES-285`, no replacement rule; annotated `SES-289`. `M6-02` is its inverse, so this
re-entry procedure is **annotated-as-withdrawn and unrunnable**: there is no gated card left to
Accept. The pin half survives live in `B5`). It writes
`decision`/`decision_reason`/`decided_at` like any other tap, and it leaves `rung` and `streak`
alone.

Two boundaries on that rule, stated so no later cycle has to guess:

- **It applies forward from the 2026-08-21T03:53Z harvest, and the ladder's history is not
  re-derived.** Two earlier harvests (`runner_items` `ae7b57c7` 00:19Z, `bfa4f42a` 02:19Z) did
  count gated taps. Unwinding them needs the ladder's streak-reset-on-promotion value, which at
  the time the written rule **did not define** and this platform had done both ways — so a
  re-derivation would have been inventing a rule, not applying one. It is named on the briefing
  instead. **That value is now defined** (John, `q-ladder-streak-reset` **no**, 22:04Z; the
  no-reset rule above, `SES-107`/`v7.0.148`), so the original *reason* has expired — but **the
  conclusion has not, and it is not reopened by this**: John answered `q-ladder-rewind` **no**
  at 17:20Z, so the history stands as-is on his word rather than on the absence of a value. If he
  ever says "rewind the ladder", that is the authorisation to re-derive, and the rule to re-derive
  under is now written down rather than being the first thing to ask him about.
- **A Reverse on a gated card still demotes — and that is now John's ruling, not a default
  awaiting one (John, 2026-08-21, directive `1d01ea85`, register B35).** `v7.0.118` left this
  half open on purpose. The symmetric argument — that declining permission should be
  ladder-neutral too, since the runner is otherwise penalised for asking and being told no — is
  a good one, and that cycle refused to apply it, because a cycle does not widen its own
  autonomy rule on an inference. So it was put to John in his own words. He answered
  **"leave it"**. The *behaviour* is therefore unchanged — a Reverse on a gated card sets the
  streak to 0 and demotes a rung, exactly as before — but its *status* is: it is settled.
  **Stop carrying it as an open question on the briefing, and stop flagging it in the docs as an
  unclosed asymmetry.** A later cycle that thinks it should change puts a fresh case to John; it
  does not reopen it by inference, in either direction.

**Pins (`SES-86` — the queue engine, register B5, `v7.0.140`):** a directive-box line matching
`TICKET-ID — move to N` sets that ticket's `pinned_position = N` (then run the recompute — the
pin takes its absolute slot, everything else renumbers around it); `TICKET-ID — release` clears
it. Latest call wins a collision (`updated_at` breaks the tie in the function); completion or
removal clears the pin automatically inside the recompute. A pin line is consumed as a pin, not
stored as a directive row. All other non-empty directive text in the page becomes a
`runner_directives` row (verbatim). A saved
usage reading (the three meter percentages John types in) becomes a `runner_usage_readings`
row: store the percentages verbatim, compute `est_tokens_since_prev` (sum of cycle token
estimates since the prior reading) and `tokens_per_pct` (that sum ÷ the all-models delta,
only when the delta is positive and the window is runner-only — overnight windows qualify;
otherwise leave it NULL rather than storing a confounded number). Update the
ladder with a before-image first, always. *(Supervised run: if the page is unreachable from
the cloud session, log that in the cycle row and continue — this run's decisions were already
harvested manually; whether cloud can reach it is one of the things this run measures.)*

A non-empty `answers` object in the page's `briefing-state` (`SES-99`) is harvested the same
way: for each answered `qid`, write a `runner_before_images` row first, then UPDATE
`public.runner_questions` SET `answer`, `answered_at`, `answer_note`, `status='answered'`,
`acted_cycle` = this cycle's id. An answer is John's word and outranks a cycle's own reasoning
on that question, exactly as a directive does. An unanswered question is **not** a "no" — it
carries forward. The page-side contract (rendering, the yes/no-askable rule, the 5-open cap)
lives in `briefing-page.md`'s question-list section — cited here, not restated.

**A non-empty `settings` object (`SES-143`, `v7.0.182`) is §2b's two switches, and it is the one
harvest that can change what the runner itself does.** Write it in the serial tail, before-image
first, exactly like every other harvest:

- **Scheduler half** — `UPDATE public.runner_settings SET scheduler_on = …, interval_hours = …,
  updated_at = now(), updated_by = '<your cycle id>' WHERE id = 1`. Reject an `interval_hours`
  outside `1..24` rather than storing it (the column's own CHECK will refuse it anyway); the page
  already refuses to record one, so a bad value here means the state was hand-edited.
- **Drain half — this is John NAMING a drain, and that is already sanctioned.**
  `drain_epic_next()` property 5 reads *"Nothing creates a drain row but John's own declaration —
  a directive row **or a briefing tap**."* A tick is that tap. Resolve `drain_epic` to an
  `epics.id`, then, **if no queued `drain-epic` directive already names it**, INSERT the directive
  and capture its scope per `SES-142` — one `runner_drain_scope` row per open `now`-tier member of
  that epic **at naming time**, which is the whole finish line from then on. An untick **cancels**
  the standing drain (`status='cancelled'`, before-image first); it never touches shipped work.
- **Daily-max half (`SES-147`, `v7.0.201`)** — `UPDATE public.runner_settings SET
  daily_max_tokens_millions = …` for the `daily_max_millions` key. **`null` is a REAL value here and
  is not the same as an absent key:** absent means *he never touched the box* (leave the DB alone);
  `null` means *he cleared it*, i.e. "no standing cap, budget exactly as before `SES-147`". Coercing
  either one to `0` stores a cap of zero tokens — a number he never typed, and one the column's own
  `CHECK (1..1000)` will refuse anyway, so the harvest would throw on a tap he had just made. Reject
  anything outside `1..1000` rather than storing it; the page already refuses to record one, so a
  bad value here means the state was hand-edited.
- **The runner still may never start one on its own initiative.** A tick is John's; an untick is
  John's; a cycle that finds neither writes nothing. That property is not negotiable and this
  harvest does not weaken it.
- **Say it back on the page.** `settingsNow()` already renders his un-harvested tap over the DB
  value, so the acknowledgement line is what tells him the tap was actually picked up — which
  means the rebuild must read `runner_settings` fresh, in this same tail, **after** these writes.

A non-empty `asks` object (`v7.0.145`, directive `edab5908`) is harvested the same way, and is
the one harvest that is **read-and-answer, not read-and-record**: each entry is a question John
typed on a card or a question row in his own words. INSERT each into
`public.runner_card_asks` (before-image `row_data = NULL`), then **answer every `status='open'`
row on its own card in the rebuild** — an ask he can see recorded but never answered is worse
than no ask box at all. **The insert is idempotent by construction and must stay that way:** the
page carries every ask in `briefing-state` forever, so **every** cycle re-reads asks it already
stored, and only the `uniq_card_ask (target_id, asked_at, question)` constraint stops the log
duplicating on every rebuild. Full contract, including the required More-info panel fields and
the required Yes/No consequence lines: `briefing-page.md`'s More-info section.

**2b. VISION COMMENT ROUTING — every Requirement becomes exactly ONE artifact, and John is told
which one (`SES-158`, `v7.0.227`; spec `docs/design/BRIEFING-COMMENTS-0823-DRAFT.md` decision 5,
John 2026-08-23).** Runs in the step-9 serial tail with the rest of the harvest, under the publish
lease. His framing, verbatim: *"a misroute costs John one correcting comment"* — and **he does not
pre-label the route.** That is the whole design constraint: the runner decides, and the only thing
that makes a wrong decision cheap is that the card says out loud what the comment became.

```sql
-- The trigger. 0 rows = nothing owed; this is the normal case and says nothing on the page.
SELECT id, target_ref, body, created_at
  FROM public.briefing_comments
 WHERE target_kind = 'vision' AND author = 'john'
   AND kind = 'requirement' AND harvested_cycle IS NULL
 ORDER BY created_at;
```

**Read the WHOLE thread before routing, never the flagged comment alone (decision 4).** A question,
its answer, and *"do that"* are **one** requirement, and the flagged row is usually only the last
third of it:

```sql
SELECT author, kind, body, created_at
  FROM public.briefing_comments
 WHERE target_kind = 'vision' AND target_ref = '<the row''s target_ref>'
 ORDER BY created_at;
```

**THE TWO OBLIGATIONS ARE SEPARATE, AND COLLAPSING THEM IS THE DEFECT THIS RULE EXISTS TO PREVENT.**
Decision 5 carries two sentences that read like one — *"routes … into corpus update / research
ticket / feature ticket"* and *"**every** interaction must leave the corpus richer … never just a
status flip."* Read as a single rule, `corpus-update` becomes merely one of three routes, and a
comment routed to `feature-ticket` then leaves the corpus **no richer** — flatly contradicting the
second sentence. So:

- **The ROUTE names the artifact the comment BECAME.** Exactly one of `corpus-update` /
  `research-ticket` / `feature-ticket`. Never zero, never two. It is stored in
  `briefing_comments.routed_to` on the requirement row.
- **The CORPUS WRITE is UNCONDITIONAL** — it runs on all three routes, `feature-ticket` included.
  `corpus-update` as a *route* means *"the artifact is the claim itself"*, never *"this is the one
  path on which the corpus gets written."*

**Choosing the route, with the fail-direction stated rather than left to taste:**

| Route | The thread is… | Artifact |
|---|---|---|
| `corpus-update` | teaching what to build or not build — a belief, a constraint, a rejection | a `public.vision_claims` row |
| `research-ticket` | asking something the corpus cannot answer yet | a backlog ticket to go find out |
| `feature-ticket` | naming a thing to build | a backlog ticket to build it |

**Uncertain between `research-ticket` and `feature-ticket` → `research-ticket`.** It is the cheaper
error: research that finds the answer obvious becomes a feature ticket next cycle, while a feature
ticket filed on an unresearched premise spends build capacity and lands on John's page as work he
has to reject. Uncertain whether it is a requirement at all → **it is a question** (decision 3's
cheap failure direction) — leave it, answer it on the card, and route nothing.

**THE ROUTING COMMENT IS MANDATORY AND IS THE HALF MOST LIKELY TO BE SKIPPED.** It is what makes a
misroute cost one comment instead of going unnoticed, and the route it is easiest to skip it on is
`corpus-update`, which produces no ticket id to report and therefore feels like nothing happened.
Write it in John's register, naming what the comment became — **ID + title**, never a bare id, per
the ticket-title rule at the head of this file. Order, before-image first on every write (§19v):

```sql
-- 1. the corpus write (unconditional, whatever the route) — a vision_claims row.
-- 2. then stamp the requirement row.
UPDATE public.briefing_comments
   SET routed_to = '<corpus-update|research-ticket|feature-ticket>',
       harvested_cycle = '<your cycle id>'
 WHERE id = '<the requirement row''s id>' AND harvested_cycle IS NULL
RETURNING id, routed_to;          -- 0 rows = a peer harvested it; leave it alone

-- 3. then the routing comment, back on the SAME target.
INSERT INTO public.briefing_comments (target_kind, target_ref, author, kind, body)
VALUES ('vision', '<the same target_ref>', 'runner', 'routing',
        '<what it became, ID + title, one sentence in John''s register>');
```

Four boundaries, each of which is how this gets built wrong:

- **`harvested_cycle IS NULL` in the UPDATE's `WHERE` is the idempotence**, the same shape as the
  decision harvest's `AND decision IS NULL`. Under parallel cycles two peers can read the same
  requirement; only the one whose UPDATE returns a row may write the routing comment, or John gets
  the same routing told to him twice.
- **Never route a comment the runner itself authored.** The trigger filters `author = 'john'` for
  exactly this reason — a routing comment is itself a `briefing_comments` row, and a predicate that
  forgot the author would route its own output forever.
- **Filing the ticket claims its id atomically**, one `feature_id_counter` block call, never a
  hand-count (`CLAUDE.md`; `SES-18` is the collision that rule is written from). Same boundary
  `heal-engine.js` keeps at step 8b.
- **EVERY ticket a cycle files is stamped at filing with `backlog_items.size_stamp` and
  `gate_count`** (John, directive `db84b784`, 2026-08-28, verbatim *"yes, build the burn-down with
  the size stamps"*; migration `ses_burndown_size_stamps`, whose column comments carry the
  definitions): `S` = one cycle with a known fix shape, `M` = 1–2 cycles or one design choice
  inside, `L` = multi-cycle / design-heavy / discovery risk; `gate_count` is the number of **known**
  external gate-crossings on the path to done (a John action, a secret, another repo, a blocking
  ticket, an un-drilled surface) and is the multi-day predictor — `SES-191` hid three. This applies
  to every filing site in this runbook: step 2b's routed tickets, step 4b's invention card when John
  accepts it, step 6's removal-proposal successors, and `heal-engine.js`'s `LOO-` rows.
- **A rejection is a KEPT ROW, never a deletion** — decision 5, and `SES-157`'s ruling that
  `vision/rejected-paths.md` is a retired stub. A rejected claim is `status = 'rejected'` with its
  `provenance` set (`ck_vision_claim_decided` enforces that), because rejections teach what not to
  build.

**No page-side surface exists for this yet, and that is deliberate.** The comment box and the
Question/Requirement toggle are `SES-156`, gated on John's Accept. This rule ships **before** its
inputs for the reason this file has already paid for eight times (`SES-86` phase 3, `v7.0.146`,
`SES-101`, `SES-111`, `SES-127`, `SES-128`, `SES-129`, `SES-143`): a rule that arrives after the
first comment gets improvised once, and the improvisation becomes the precedent. Guarded by
`tests/regression/SES-158-vision-routing.js`.

**3. Check the walls (two-track budget — John, 2026-08-20, `design-runner-gov-0820`).** A
wall-stop still runs the step-9 serial tail (its record must be written), then ends. **Known
approximation under parallel cycles (register B42, named rather than hidden):** each cycle
reads the day's spend at its own start, so N cycles starting together can each pass a wall the
sum of them exceeds — the caps are enforced per-cycle-start, not transactionally across the
fleet. At today's scale that slack is small; if John scales to tens of parallel routines, an
atomic allowance-claim (same pattern as the counters) is the upgrade, and it should be
proposed then, not silently assumed now.

**"Today" is an America/Chicago day, not a UTC day (John, 2026-08-21, directive `1d01ea85`,
register B35 — superseded 2026-09-01 by `M6-07`, `SES-285`, annotated `SES-289`; only B35's
Reverse-on-gated answer lost its subject, and this clock boundary is its answer (2), explicitly
unaffected and still binding).** Asked whether the spending day should end at midnight UTC — 7 PM where he is —
or at midnight where he is, John answered **"Midnight cst"**. Every "today" and "the day" in
this step therefore means a **America/Chicago calendar day**, on both tracks. Use this window
verbatim, in both the dollar sum and the token sum; do not re-derive it:

```sql
-- today, on John's clock. Substitute into any "today's spend" SELECT.
 WHERE started_at >= (date_trunc('day', now() AT TIME ZONE 'America/Chicago')
                      AT TIME ZONE 'America/Chicago')
```

Four things about this boundary, each of which has already bitten or would have:

- **It is not cosmetic.** The CST day begins at **05:00Z**, so most of a night's cycles fall
  outside it. Measured live 2026-08-21 at 13:16:54Z over the same `runner_cycles` rows: **12**
  cycles and `6,620,000` estimated tokens inside the UTC day, **4** cycles and `1,240,000`
  inside the CST day — a **5.3×** difference, and it is the *structure* (a 5-hour offset across
  a nightly cadence), not that particular ratio, that is load-bearing. A cycle sitting near the
  wall is stopped by one boundary and waved through by the other. **Take your own reading rather
  than quoting this one:** these figures moved by 420,000 in the fourteen minutes this clause was
  being written, because a cycle presumed dead came back and wrote its own token accounting.
- **It is NOT the same rule as the display-times rule**, and conflating them is the easy
  mistake: the times rule (step 9, and `briefing-page.md`) is **display-only** — store UTC,
  render CST. This one changes an **arithmetic boundary**. Both are John's, they are
  independent, and neither implies the other.
- **Forward only. Never retroactively shorten a grant John already made.** A stored
  `budget_override.expires_at` is honoured exactly as written, even when the new clock would
  have expired it earlier — re-deriving an existing grant under a later rule is the runner
  taking back something John gave. New "for the day" overrides are written to the next midnight
  America/Chicago.
- **§19v is silent on the boundary** (it states `$100/month, $5/day` and `10M tokens/day` and
  names no clock), so this defines an undefined term rather than superseding the architecture —
  no runbook↔§19v disagreement, and no briefing item owed on that account. Verified by reading
  §19v's budget paragraph, not from memory.

- **API dollars (real money, hard wall):** SELECT `runner_budget` for the current month — no
  row → `did_not_run`, END. Sum this month's and today's `api_cost_dev_usd + api_cost_qa_usd`
  from `runner_cycles`; over the month cap → `did_not_run`, END; over the day default →
  `did_not_run` END unless an unexpired `budget_override` directive covers it (then its
  `max_usd` is your ceiling this cycle). **Only true billable API calls count here** — your own
  session's thinking is subscription usage, tracked in tokens below, never in dollars.
- **Subscription tokens (the governor that replaced the phantom-dollar wall):**
  read the latest `runner_usage_readings` row (John's typed-in meter percentages).
  (a) `all_models_pct ≥ weekly_rest_pct` (85) → rest: `did_not_run`, reason "weekly meter at
  N% — resting", END. (b) No reading, or latest older than 48h → today's allowance =
  `stale_fallback_tokens` (3M). (c) Otherwise: calibrate `tokens_per_pct` from the estimated
  tokens logged between the two most recent readings vs. the meter delta (store it on the
  reading row); remaining weekly pool = `(100 − all_models_pct) × tokens_per_pct`; today's
  availability = pool ÷ days left in the meter week; runner allowance = availability ×
  `runner_share_pct` (50%), capped at `runner_day_token_allowance` (10M) until two readings
  exist to calibrate from. Sum today's `est_tokens_dev + est_tokens_qa`; at or over the
  allowance → `did_not_run`, reason "runner token share for the day spent (~N est)", END —
  **unless an unexpired `budget_override` directive covers today's token track, exactly as the
  dollar track above works** (register B32, John live 2026-08-20 21:0xZ: "allow overance for the
  day and keep sessions going"). Covering means: `type='budget_override'`, `status='queued'`,
  `max_tokens IS NOT NULL`, and `expires_at > now()`. Then `max_tokens` — never `max_usd`, which
  is dollars only — is your allowance for this cycle, and you log the override's directive id in
  the cycle row's `notes`. The rest wall (a) is NOT overridable: an override buys the day's
  allowance, never John's weekly meter, so `all_models_pct ≥ weekly_rest_pct` still rests.
  **The override never widens the API-dollar wall** — that is real money and needs its own
  `max_usd` override. Both new columns are nullable and fail closed: NULL `max_tokens` or a NULL
  / past `expires_at` means no override, and the wall stands.
  All token figures are estimates and are always labeled estimated.

**THE CALIBRATION IS DERIVED BY ONE CALL, NOT BY EACH CYCLE'S ARITHMETIC (`SES-128`,
`v7.0.163`, migration `ses128_reading_slots`).** Step (c) above describes calibrating
`tokens_per_pct` from "the two most recent readings", and **that instruction has never once been
carried out** — measured before this shipped, all eight stored `runner_usage_readings` rows carry
`tokens_per_pct = NULL`, so every allowance this runner has ever computed fell through to the
uncalibrated 10M cap or the 3M stale floor. The reason is not that cycles forgot: **the two most
recent readings are the wrong window.** John's meter is spent by his own manual sessions *and* the
runner, so any window mixing the two yields a rate that is confidently wrong. Run this instead,
before you compute the allowance:

**AND SINCE `SES-147` (`v7.0.201`) YOU DO NOT CALL IT DIRECTLY — ONE CALL RESOLVES THE WHOLE DAY
CAP, calibration included:**

```sql
SELECT * FROM public.resolve_day_token_cap('<your cycle id>');
```

`day_cap` is your allowance for the day. `cap_source` names which of the five rungs it landed on and
`cap_reason` is that rung in John's register — **put both in your cycle row's `notes`, so the number
traces to a rung rather than to a cycle's reading of this paragraph.** The function calls
`derive_token_allowance('<your cycle id>')` for you and returns its result as `calibrated_allowance`
/ `calibration_guard`, so the calibration is still stored on the morning row exactly as `SES-128`
requires — **do not also call `derive_token_allowance` yourself.** It is harmless if you do (it
writes only when `tokens_per_pct` actually differs, read from `pg_get_functiondef` rather than
assumed), but it is a second statement to remember, which is the failure this entire family of
corrections exists to remove. The retired direct call, for reading the paragraphs below:

```sql
SELECT * FROM public.derive_token_allowance('<your cycle id>');   -- now called FOR you
```

- **`guard = 'ok'`** → `day_allowance` is your allowance for the day, and the call has already
  stored `tokens_per_pct` on the morning row (writing its own before-image, §19v — the
  `record_skip` precedent).
- **`guard` anything else** → `tokens_per_pct` and `day_allowance` come back **NULL**, which is
  not a failure and never an error to report: it means no trustworthy window exists, so you fall
  back to step (b)/(c)'s existing guardrails exactly as today. The four guards are: no bracketing
  pair; a non-positive meter delta (a reset or a rolled-over week); an empty window; and a bracket
  **wider than 24 hours**.
- **Pass your cycle id, not NULL.** `derive_token_allowance(NULL)` is the read-only dry-run form —
  it computes and writes nothing. Useful for a probe, wrong for the real check, because then the
  calibration is never stored and the next cycle re-derives it from scratch.

**Why only a night→morning pair counts.** While John is asleep the runner is the only thing
spending, so the gap between his last reading of the night and his first of the morning is a clean
measurement. That is what the `slot` column exists for. **A reading with no slot never brackets a
window** — it is still a real reading for the rest wall and the 48h staleness check, it simply
cannot calibrate. The eight readings that predate this ticket are `adhoc` for that reason and were
deliberately **not** backfilled: `13:50Z` is 8:50 AM in Chicago and reads exactly like a
"morning", and slotting it on that resemblance would manufacture a pair John never declared.

**JOHN'S NUMBER ALWAYS OUTRANKS THE DERIVED ONE.** An unexpired `budget_override` directive with
`max_tokens` is the ceiling, full stop — register B32, and a derived allowance is exactly the kind
of number a later cycle would be tempted to treat as authoritative. **`SES-147` (`v7.0.201`) added
John's STANDING daily-max box to that ladder and moved the whole ladder into
`resolve_day_token_cap()`, so no cycle applies it by hand any more.** Five rungs, top down —
`cap_source` tells you which one you got:

| # | `cap_source` | The cap | Whose number it is |
|---|---|---|---|
| 1 | `override` | an unexpired `budget_override.max_tokens` | John's number for **this one day** |
| 2 | `stale-floor` | `runner_budget.stale_fallback_tokens` (3M) | the safety brake — **no reading, or the latest older than 48h** |
| 3 | `daily-max-box` | `runner_settings.daily_max_tokens_millions × 1,000,000` | John's **standing** number, typed into §2b |
| 4 | `calibrated` | `derive_token_allowance()`'s `day_allowance` when `guard='ok'` | measured from his night→morning meter pair |
| 5 | `uncalibrated-default` | `runner_budget.runner_day_token_allowance` (10M) | the standing default |

**Two of those rungs are counter-intuitive and both are deliberate. Do not "simplify" either.**

- **The 48h stale floor sits ABOVE the box, not below it.** John's spec, verbatim: *"a standing
  number must not defeat the staleness brake."* The obvious reading of *"the box is THE day cap"*
  puts it at rung 1, and that hands a runner with **no idea how much of John's meter is left** a 25M
  budget. Proven with a negative control rather than reasoned about: box `4` with every reading aged
  past 48h returns `3,000,000 / stale-floor` on the shipped build and `4,000,000` on the
  box-above-the-brake build, from identical fixtures.
- **A one-day override still beats the standing box.** A number he wrote for today is later, more
  specific word than a number he left in a box — the same reasoning that puts a pin above the
  automation lane and layer 1a above layer 1b.

**A blank box (`NULL`) is rungs 1/2/4/5 exactly as they were before `SES-147`** — that is what makes
this additive rather than a change to how the runner already budgets, and it is why `NULL` must
never be coerced to `0`. **The rest wall (`all_models_pct ≥ weekly_rest_pct`, 85) sits above all
five and is overridable by none of them.** `resolve_day_token_cap()` **reports** it as
`rest_wall_hit` so one call carries the whole token track — **reporting is not enforcing: you still
check wall (a) yourself, first, and rest the cycle when it is true.**

**One number in that function is an assumption, and it is named rather than buried.** Turning the
remaining weekly pool into *one day's* allowance needs the days left in John's meter week, and
**that value is stored nowhere** — `runner_budget` carries month, caps, share and rest, and no week
anchor (read live, not recalled). The function therefore divides by **7**, the worst case, which is
the fail-closed direction: it can only under-spend, never over. Question `q-meter-week-anchor` asks
John for the real reset day; when he answers, that divisor becomes real and the allowance gets
**larger, never smaller**. Do not quietly replace the 7 with a guess in the meantime.

- **Deploy quota:** yield to John — if his manual sessions are pushing heavily today, prefer a
  gated-before-build item over a push. Use `VERCEL_TOKEN` from `runner_secrets` if present (export as env for `scripts/check-deploy-current.js`); if absent, note the skip in the cycle row — never invent a deploy-state claim.
- **Anthropic account cap — a pre-flight, and it is NOT a wall (`SES-66`, `v7.0.313`).** Run it only
  when this cycle's plan includes a **live** Anthropic call (a `tests/regression` arm that calls the
  API, an agent-run probe); a doc-or-SQL cycle needs no key and skips it silently:

```
ANTHROPIC_API_KEY=… node scripts/check-anthropic-quota.js --json
```

  Exit **0** clear → proceed. Exit **1** capped → the account is over a usage limit, so **every**
  live call this cycle would fail regardless of the change under test: do not spend the cycle
  proving that. Record the verdict and the `resets_at` the message carried in the cycle row, and
  prefer work that needs no live call (or a `gated_before_build` card) — this is the *"yield"*
  posture the deploy-quota bullet above already takes, **never** a `did_not_run`. Exit **2** is
  *could not run* (no key in `runner_secrets`, the API unreachable) and is **not a pass**: note it
  exactly as a failed export is noted, and never record a cap you did not observe.

  **Why this exists, and it is the gap `SES-33` closed on the other side.** The 2026-07-30 incident
  (`design-dat-16`) had every live regression call fail instantly with `Anthropic call failed: 400`
  — an account-wide cap, not a code or deploy defect, proven cross-cutting when an untouched,
  unrelated case failed identically. Vercel's quota had `check-deploy-current.js`; this had nothing,
  so a session only discovered it mid-run, after spending the wall-clock.

  **THE EDIT THIS FORBIDS: shortening the check to `status === 400`.** That is the incident's own
  symptom, and 400 is equally the API's status for a malformed request or a bad model id — so the
  short form reports an ordinary request bug as an account cap and sends a cycle to wait out a limit
  it is not under. The classifier keys on the **message**; `tests/regression/SES-66-anthropic-quota-preflight.js`
  pins that with the retired form applied to the same fixture and asserted to lose. For the same
  reason the probe is a one-token `POST /v1/messages` and **not** `GET /v1/models`: a metadata read
  is not gated by a spend cap, so it returns 200 for a fully-capped account and the check would
  report "clear" on exactly the state it exists to catch.

## Phase 2 — the work

**4. Blocker sweep #1.** Verify dev serves: request the dev URL root with the
`x-vercel-protection-bypass` header (value from `runner_secrets`). A user-blocking failure
(5xx, blank page, broken run) preempts everything — fix it first, root-cause-first, no blind
fixes. *(Supervised run: the cheap reachability probe only; the full sweep spec is a 78d
item.)*

**4a. THE GREEN ANCHOR — record it while you are already looking (`SES-182` slice 1, `v7.0.332`;
the READ became a Supabase query in `SES-255`, `v7.0.339`).**
While you have `dev`'s head in hand, read CI's conclusion for that sha and hand it to the actuator.
**The engine reads no CI and holds no credential** — measured
at that ship, `runner_secrets` carries no GitHub secret of any kind — so the conclusion is passed
**in**, the same reason `heal-engine.js` and `tripwire-to-backlog.js` take their ids that way:

**WHERE THE CONCLUSION COMES FROM, AND WHY IT IS NO LONGER "YOUR OWN GITHUB TOOLING" (`SES-255`,
`v7.0.339`, migration `ses255_ci_run_conclusions`).** This line used to read *"through your own
GitHub tooling"*, and **that instruction was unexecutable in this environment on every cycle that
ever tried it.** Measured three times rather than reasoned about: the GitHub REST listing for a
single `ci.yml` run on `dev` at `per_page=1` returned **71,371** characters (cycle `b0a3dde5`),
**71,575** (this cycle's own re-measurement), each exceeding the agent tool-result cap and
overflowing into the `~/.claude/…/tool-results/` path **register B39 forbids an unattended cycle to
shell-process** — and raw HTTPS to `api.github.com` is separately refused by the session proxy
(`403 GitHub access is not enabled for this session`) **regardless of credential**, including with
the `GITHUB_TOKEN` this environment does carry. There is no bounded `sha → conclusion` read on any
surface a cycle has: `actions_list` takes no `head_sha` and no minimal-output flag, the bounded
`actions_get` / `get_check_run` need an id obtainable only from the oversized listing, the
`pull_request_*` forms need a PR number and a `dev` push is not a PR, and a git-level read carries
no check conclusions at all. **So the direction is inverted: CI publishes its own grade.**

```sql
-- The row ci.yml's report-conclusion job wrote. Prefer the head sha; fall back to the newest row
-- whose commit_sha is an ANCESTOR of head (CI usually has not graded a just-pushed head yet), which
-- you verify with `git merge-base --is-ancestor <row sha> <head>` -- never by assuming.
SELECT commit_sha, run_id, jobs, concluded_at
  FROM public.ci_run_conclusions
 ORDER BY concluded_at DESC
 LIMIT 20;
```

Hand `jobs` to `--jobs` **verbatim** and `run_id` to `--run-id`. **THREE VERDICTS, NOT TWO, and the
third is the one a rebuild drops:**

| What `jobs` says | What you do |
|---|---|
| every conclusion `success` | run the command — the engine takes its `record-green` branch |
| any conclusion `failure` | run the command with `trigger=ci-red` — this is a real red |
| anything else (`cancelled`, `skipped`, an empty array, no row) | **could not tell — invoke nothing**, and note it exactly as a failed export is noted |

**THE EDIT THIS FORBIDS, and it is the tempting one because `isRunGreen()` already refuses a
`cancelled` as green:** collapsing the third row into the second. `isRunGreen` returning false is
not the same claim as *"this run was red"* — `concurrency: cancel-in-progress` cancels superseded
runs routinely, so a `cancelled` handed in as `ci-red` sends `decide()` down the revert branch on a
run that **graded nothing**. Same asymmetry step 4a-bis already draws for the deploy probe: unknown
is not red, because the fail direction is away from acting. **A missing row is likewise not a red**
— the reporting job cannot report its own failure, so its absence means *stale*, never *bad*, which
is `scripts/rollback-on-red.js`'s own stated fail direction.

**What this did NOT change, named so a later cycle does not "finish" it:** the engine is untouched,
`TRIGGER_SOURCES` is unchanged, and the cycle still mediates `--jobs` — John's accepted `SES-182`
design (*the conclusion is passed in, never fetched*) is preserved exactly. Only this read
instruction moved. Guarded by `tests/regression/SES-255-ci-conclusion-reporting.js`.

```
SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/rollback-on-red.js --apply --json \
  --cycle-id=<your cycle id> --sha=<dev head sha> --run-id=<CI run id> \
  --watermark=<latest applied migration version> \
  --jobs='[{"name":"…","conclusion":"success"}, …]' \
  --migrations='[{"version":"…","name":"…"}, …]'
```

**`--migrations` is `SES-182` slice 2 (`v7.0.333`) and it matters only on a RED**, so a green sweep
may omit it. It is the migrations that landed in the range, read with **one call** —
`SELECT * FROM public.migrations_in_range('<green anchor watermark>', '<current watermark>');` —
whose exclusive-from / inclusive-to boundary lives in that function precisely so no cycle
re-derives it. Hand the rows in; **the engine never fetches them**, for the same reason it never
fetches the CI conclusion: `supabase_migrations` is not exposed through PostgREST and
`runner_secrets` holds no credential for it. **Omitting it on a red is not "no migrations landed" —
it is "unknown", and the engine fails closed to card-only on it.**

On a green run this stores the pointer (`runner_green_states`, retention 50) and nothing else. **The
rules — what counts as green, what counts as code-only, who may be reverted, and why a verifier
block is not a trigger — live in `scripts/rollback-on-red.js`'s header, cited here and not
restated**, so these two files cannot drift the way step 5 and step 7 did before `v7.0.114`.

**Forgetting this line is safe by construction, and that is why it is a step rather than a trigger.**
This file records eight times over that a rule each cycle must remember is a rule that gets silently
forgotten (`record_skip`'s precedent) — the usual argument loses here for `SES-213`'s reason, the
**fail directions are asymmetric**: a sweep that never runs leaves the pointer *stale*, so a later
red simply finds an older anchor or none and cards instead of reverting. It can never produce a
wrong revert. Exit **2** is *could not run* and is **not a pass** — note it exactly as a failed
export is noted, and never record a green you did not observe.

**4a-bis. DEPLOY-SERVING-RED — the second trigger, wired (`SES-182` slice 3, `v7.0.334`).** Step 4
already asks whether dev serves. This turns that same look into the trigger `TRIGGER_SOURCES` has
admitted since slice 1 and nothing has ever produced. One call, right after the reachability probe:

```
VERCEL_AUTOMATION_BYPASS_SECRET=… VERCEL_TOKEN=… node scripts/check-deploy-serving.js --json
```

Exit **0** `serving-green` → nothing to do; **carry on, and do NOT hand this to the actuator.**
Exit **1** `serving-red` → the JSON carries an `engine` object; run step 4a's command with its
`trigger`, `sha` and `jobs` (a `null` `engine` means the serving commit could not be resolved —
there is nothing to attribute, so nothing is triggered, and a down dev is still **this step's**
blocker to fix). Exit **2** is *could not run / could not tell* — note it exactly as a failed export
is noted, and **never** treat it as either verdict.

**THE EDIT THIS FORBIDS, and it is the tempting one because step 4a's command looks identical:
handing a GREEN deploy probe to the actuator as `jobs`.** That takes `decide()`'s `record-green`
branch and writes the probed commit into `runner_green_states` as the anchor every later red is
measured against — on the evidence that **a web server answered**, which is not evidence that CI
graded anything. The green anchor means *both blocking CI jobs concluded success*, and step 4a is
its only writer. The probe is red-only: `engineArgsFor()` returns nothing on green and the jobs it
emits on a red always carry a **failure** conclusion, so the green branch is unreachable from it by
construction rather than by a rule a cycle must remember. Pinned by
`tests/regression/SES-182c-deploy-serving-red.js`, whose control runs the retired
pass-everything-through form on the **same** green fixture and asserts it reaches `record-green`.

**The commit judged is the one the alias is SERVING, never `dev`'s head** — `SES-015` measured that
lag on this project at a median of 37s but a p90 of 852s and a max of 2,973s, so the two are
routinely different commits and reverting the wrong one is the one direction this whole ticket must
never fail in. **Unknown is not red:** an unreachable deployment, a 401/403 from deployment
protection (this probe's own credential, not the site's health) or a 429 all report `unknown` and
trigger nothing — otherwise a bad second on the runner's own network reverts a healthy dev. **And a
single bad response is not a red:** three consecutive red samples are required and any one green
sample makes the whole probe green. **The rules, the three verdicts, the entry-bundle check and the
probe's own NAMED BLIND SPOTS (a client-side render failure reads green — an HTTP probe cannot see
it) live in `scripts/check-deploy-serving.js`'s header — cited here, not restated**, so these two
files cannot drift the way step 5 and step 7 did before `v7.0.114`.

**4a-ter. DEPLOY-QUOTA HEADROOM — the ceiling `SES-33` hit becomes a measured number with an alarm
(`SES-47`, `v7.0.345`; John, 2026-08-31, directive `e2c05416`, attended architect session, his word
verbatim *"option 1"*).** He ruled the fork the ticket left open: **stay on the free tier — the
100-deploys/day cap is deliberately accepted, NOT raised** — and build the tracking instead. One
call, right after the serving probe:

```
VERCEL_TOKEN=… node scripts/check-deploy-quota.js --json
```

Exit **0** `deploy-quota-clear` → nothing to do; carry on. Exit **1** `deploy-quota-alert` → the
day's deployments are **at or past 80** of the 100 cap: **push John once** (see the crossing rule
below), put `used` / `remaining` / `byProject` in your cycle row's `notes`, and **prefer a
gated-before-build item over a push this cycle** — the same *yield* posture step 3's deploy-quota
bullet already takes, never a `did_not_run`. Exit **2** is *could not run* (no `VERCEL_TOKEN`, the
API unreachable) and is **not a pass**: note it exactly as a failed export is noted, and never
record a headroom figure you did not observe.

**ONE PUSH PER CROSSING, NOT ONE PER CYCLE — and the designation is the one step 4b already uses.**
Send the push **iff no `runner_cycles` row in the current America/Chicago day carries
`DEPLOY QUOTA ALERT` in `notes`** (the step-3 CST day window), and write that marker into your own
notes when you send it. Eight cycles a day past the line would otherwise send John eight copies of
one alarm, which is how an actionable notification stops being read — `record_skip()`'s
`skip_count` boundary, arriving here. Under parallel cycles two simultaneous first-fires may rarely
both push: self-limiting and harmless, exactly the slack step 4b accepts for the invention pass.

**WHAT A RED HEADROOM NUMBER DOES NOT AUTHORISE, and it is the tempting reading because the fix
costs $20:** upgrading. John's ruling carries its own standing prohibition, verbatim — *"If tracking
later shows sustained pressure, the $20/mo question returns to John with measured numbers — no cycle
may upgrade on its own"* — and it is consistent with the no-paid-tiers ruling `cff4fd5f`. A cycle
that finds sustained pressure files the measured case as a `gated_before_build` card; it never buys.

**The window is a TRAILING 24 HOURS and must not be "corrected" to a calendar day.** Vercel's own
quota reset boundary is not observable from the API, from `runner_secrets`, or from anything a cycle
holds, so a trailing window — which is `>=` any fixed-window count over the same traffic by
construction — is the only form that can alert **early** rather than late. The rules, the
account-wide count (the cap is an account limit, so the `?app=` filter `check-deploy-current.js`
uses would under-count) and the pagination requirement live in
`scripts/check-deploy-quota.js`'s header — **cited here, not restated**, so these two files cannot
drift the way step 5 and step 7 did before `v7.0.114`.

**Declared remainder, named rather than left to be found:** John's ruling has two halves and only
the alarm shipped. *"Deploy-count headroom rendered on the briefing"* is **not** built, because
directive `27b5d8cb` (his *"b with the bridge"*) bars an unattended cycle from republishing the page
until the database-rendered briefing lands — so the render would be invisible until an attended
session republished. `SES-47` is therefore `partial`, not delivered, with that half on its ship card.

**4a-quater. IP SPEND-GATE BLOCKS — John hears about a new block, on the push channel (`HAR-34`,
`v7.0.349`; John, attended architect session 2026-08-31, standing decision `0f292cfa`, verbatim
*"i don't need email notifications at thist ime"*).** `HAR-33`'s access gate has recorded every
block on the row it blocked since `v7.0.76` — `blocked_at` / `block_reason` / `blocked_attempts` —
and **nothing has ever told John one happened**; he had to go and look at `ip_spend_report`. One
call, right after the deploy probes:

```sql
SELECT * FROM public.ip_block_alert_claim('<your cycle id>');
```

**0 rows is the normal, quiet case and says nothing on the page.** 1+ rows → **push John once**,
carrying `masked_ip`, `org`, `blocked_at` **rendered CST**, `block_reason` and `blocked_attempts`,
and put the same figures in your cycle row's `notes`. The call has already stamped the rows, so the
push is the whole of your remaining obligation and a re-run is a no-op.

**THE TICKET SAID "email or text"; JOHN RE-SCOPED IT HIMSELF, and that is why this is not gated.**
`0f292cfa` in full on this point: the alert *"is to be built on the push channel cycles already use
(the same mechanism as the cycle-open push), needing no credentials and no John input — its
`needs-john` flag is addressed by this ruling"*, and *"any ticket blocked on 'needs an email/SMS
provider' is **mis-blocked**"*. The premise's other half was re-verified live at this ship rather
than quoted: `grep -niE "sendgrid|resend|nodemailer|smtp|twilio|postmark|mailgun"` over
`package.json`, `api/`, `lib/`, `src/`, `scripts/` still returns **zero** — there is still no
outbound mail path, which is exactly why the push channel is the whole design.

**THE PREDICATE IS A TIMESTAMP COMPARISON — `block_notified_at < blocked_at` — NEVER
`block_notified_at IS NULL`, and that is the half a rebuild drops.** An address that was blocked,
alerted, cleared by John and then blocked **again** is a second event and the one he most needs to
hear about; the IS-NULL form alerts on it once, ever, and is silent for every later block on that
row for the life of the row — the "files once, never again" limitation `heal-engine.js` carries
deliberately, arriving here where it would be wrong. `tests/regression/HAR-34-ip-block-alert.js`
runs that retired form on the **same** fixture and asserts it **loses**, a difference rather than a
property both share.

**THE EDIT THIS STEP FORBIDS, and it is the tempting one because the raw value is right there:
adding `caller_ip` to what the call returns.** This row exists to be read out into a push
notification — i.e. **off-platform**. `LOG-124` (`v7.0.39`) is the live incident where a visitor's
raw IP became publicly readable, and `.claude/rules/supabase-column-grants.md` is written from it.
The function returns `masked_ip` (the generated `caller_ip_masked` column, read from `pg_get_expr`
at this ship rather than recalled: v4 → `xxx.xx.` + the last two octets, v6 → `xxxx:` + the last 9
characters) and **cannot** return the raw address, which is a property of the function rather than
a rule a cycle must remember.

**THE CLAIM IS `FOR UPDATE SKIP LOCKED`, NOT A GUARDED `UPDATE`, and the reason is that this call
claims a SET of rows rather than one** (relocated into this step by `SES-289` from the retiring
`v7.0.349` stamp — `SES-164` step 2, the one warning of that stamp's five that appeared **zero**
times outside it). N parallel cycles (register B42) each lock a disjoint subset, so John gets
exactly **one** push per block however many peers sweep, and locking **before** the before-images is
what lets §19v's *"no before-image, no write"* hold without a losing peer leaving stray ledger rows
— `stall_watchdog()`'s `40001`-rollback shape expressed as a lock.

**Nothing was backfilled, and the consequence is stated rather than left to be found.** The one
historical block on the board at this ship (`2026-08-08`, 24 cached addresses, 1 blocked) was
**never** alerted, so the alarm's first real fire carries it — dated, and named in the push as the
inherited backlog rather than as something that just happened. Stamping it "already notified"
would have been a value nobody observed, which is the `SES-104` defect (`ses103_permission_stall_tripwire`
backfilled a constant heartbeat and a later reader could not tell it from a real one).

**Rollback class, disclosed rather than discovered later:** the migration adds a column to an
existing table, an in-place `ALTER` that `capture_migration_down()` refuses by design, so a red
range containing it is **card-only** and this ship is not auto-rollbackable.

**4a-quinquies. THE RUNNER'S OWN SILENCE — a gap between fires becomes a measured number with an
alarm (`SES-269`, `v7.0.357`).** Every probe above watches something else. **Nothing has ever
watched whether this runner fired at all**, and the two things that look like they do are watching
different questions: `stall_watchdog()` closes a cycle row that is **open** and has gone quiet — a
silence has no open row — and `deepbench-staleness-watchdog` reads `runner_usage_readings` and
`PARKED` directives, not absent fires. One call, right after the IP block claim:

```
SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/check-cycle-cadence.js --json
```

Exit **0** `cadence-clear` → nothing to do; carry on. Exit **1** `cadence-alert` → **push John once
per hole** (the crossing rule below), and put `worst` (its hours and both endpoints, rendered CST),
`thresholdHours` and `intervalHours` in your cycle row's `notes`. Exit **2** is *could not run* (no
credentials, a REST failure, fewer than two rows to measure between) and is **not a pass**: note it
exactly as a failed export is noted, and never record a cadence you did not observe.

**THE MEASUREMENT IS A GAP BETWEEN FIRES, NOT THE AGE OF THE NEWEST ROW — and that is the half a
rebuild drops.** The ticket's own Fix line reads *"a 'no fire in N hours' line"*, whose literal
implementation is `now() - max(started_at)`. **That form can never report a silence that has already
ended**, and the only cycle in a position to report one is by construction alive: at the real
recovery — `2026-08-28T03:42:00Z`, the first fire after a **38.97-hour** hole opening
`2026-08-26T12:43:36Z` — the newest row was **zero minutes old**, so the alarm would have said
*clear* on precisely the event it exists for, for ever. Measured, not argued: this ship's own live
run returned `currentGapHours: 0.16` beside `worst.hours: 38.97`, the two forms' answers side by
side. `tests/regression/SES-269-cycle-cadence.js` runs the retired form on the same fixture at the
same instant and asserts it **loses**.

**THE TICKET'S PREMISE CARRIES THE SECOND TRAP, AND IT WAS MEASURED RATHER THAN QUOTED.** `SES-269`
says *"2026-08-27 produced ZERO rows"*. True of the **UTC** day — and on **John's** clock, the
boundary this step-3 mandates for every *"today"* (directive `1d01ea85`, register B35 — superseded
2026-09-01 by `M6-07`, `SES-285`, annotated `SES-289`; its clock answer is unaffected and binding),
**2026-08-27 held two rows** (`03:42Z` and `04:42Z` UTC = 22:42 and 23:42 CST). So a
*"was there a day with no rows?"* test — the obvious build, and the one the ticket's own title
suggests — **does not fire on the incident the ticket is written from**, and no day-bucket form on
any clock can see a hole shorter than a day. Both controls are in the guard.

**ONE PUSH PER HOLE, NOT ONE PER CYCLE OR ONE PER DAY.** The script returns a `suppressionKey` keyed
on **that gap's own end** (its start, while it is still open). Send the push **iff no
`runner_cycles` row carries that exact key in `notes`**, and write the key into your own notes when
you send it. A per-day marker would re-push a 39-hour hole on each calendar day it touched and a
per-cycle one would push hourly for a week — `record_skip()`'s `skip_count` boundary arriving here:
an alarm John receives eight times stops being read.

**RELOCATED HERE FROM THE RETIRING `v7.0.345` STAMP (`SES-269`, the `SES-164` step 2 that makes a
trim safe, run by grep rather than recollection): AN UNKNOWN MUST NOT BE RENDERED AS THE SAFEST
NUMBER.** `SES-47`'s `verdictFor()` first read `Number(used)`, and `Number(null)` is `0` — finite and
non-negative — so an undeterminable count printed as *"zero deployments today, all clear"*. The
`typeof` test therefore comes **first**, before any coercion, in every probe of this family: it now
governs three (`check-deploy-quota.js`, `check-deploy-serving.js`, `check-cycle-cadence.js`), which
is why the warning belongs in this body rather than only beside the one script that paid for it.

**WHAT THIS DELIBERATELY DOES NOT DO, named rather than left to be found.** A detector hosted inside
the runner **cannot fire during a silence** — nothing is running to fire it — so this reports a hole
at the first fire after it. The channel that *could* speak during one is John's own 6-hourly
`deepbench-staleness-watchdog` routine, and **an unattended cycle may not edit his routines**: that
is his switch on his own automation, the same class as the step-1b settings gate, and taking it would
be the widening this file forbids everywhere else. **That half needs a session John attends.**

**The ticket's briefing line is the OTHER half, and it is BUILDABLE — do not read it as blocked.**
Its home is §2b's `deriveAutomation()` in `scripts/lib/briefing-automation.mjs`, which already reads
`runner_cycles` and renders *Last run* / *Next scheduled run*. Directive `27b5d8cb` bars an
unattended cycle from **publishing** the page, never from building it — the bridge's own words are
*"unattended cycles build the page and record it"* — so the render is ordinary runner work that
simply will not be visible until an attended session republishes. `SES-269` therefore ships
`partial` with `blocked_by` deliberately **NULL**, which is John's own criterion verbatim
(`07dea95e`): *"keeps partial re-pickable when the remainder IS buildable."* The drain handing it
back is the design, not the `SES-218` defect.

**4b. Invention pass — once per CST day, before selection (`SES-88`, register B12 — superseded 2026-09-01
by `M6-04`, `SES-285`, annotated `SES-289`; the daily pass, its research inputs and the vision-corpus
scoring are unchanged, but the disposal route is not: proposals are admitted or rejected by `SES-283`'s
enhancement-lane admission test, never by a card, so step 5 of this pass is **annotated-as-withdrawn and
unrunnable** — `v7.0.138`).**
Deterministic designation, no coordination needed: run this pass **iff no `runner_cycles` row in
the current America/Chicago day carries `INVENTION PASS` in `notes`** (check with the step-3 CST
day window; under parallel cycles two simultaneous first-fires may rarely both run it — two
proposals instead of one, self-limiting and harmless, never a double build). The pass:

*The rendered `B12` rule block that stood here was removed by `SES-300` when `M6-04` superseded the
rule (`SES-285`, `v7.0.359`; annotated by `SES-289`, `v7.0.367`). A withdrawn rule does not keep a
rendered block: the block restated it in live voice, which is the same two-homes defect one layer
down from the prose `SES-289` annotated. `B12`'s registry row survives in
`docs/governance/RULES-SNAPSHOT.md`, and the step header above states which half of the pass is
still live and which half is unrunnable.*

1. **Egress probe (precondition C3, measured not assumed):** one live WebSearch. If it fails,
   write `INVENTION PASS: egress blocked` in `notes`, skip the rest — tomorrow's pass retries.
   The first success closes C3 permanently; say so in the cycle row.
2. **Research:** market/competitor/whitespace + the platform's own usage signals, grounded in
   `docs/vision/market-map.md`, `thesis.md`, and `customer.md` — the corpus is the scoring
   frame, not your generic priors. The `P1 - Improves John's Skills` lens ranks first (A4).
3. **Generate exactly as many proposals as the invention trust rung** (`runner_ladder`,
   `work_class='invention'` — rung 1 = one proposal). Volume widens only by ladder — the rung
   is the cap, never a cycle's own judgment (the step header above).
4. **Score against the vision corpus** and run §19v's R&D gate: research → cheapest-variant
   feasibility check → logged go/no-go with traceable reasoning (§19d sniff test — a proposal
   whose "why" can't be traced to corpus claims + evidence is a feature mill, kill it).
5. **File the surviving proposal as a `gated_before_build` `runner_items` card — ANNOTATED AS
   WITHDRAWN AND UNRUNNABLE (`SES-289`): the card surface it files into no longer exists.** `B12`
   was superseded by `M6-04` on 2026-09-01 (`SES-285`), and the replacement route is `SES-283`'s
   enhancement-lane admission test. Left in place rather than rewritten — the rewrite needs
   `SES-286`'s reversal window. Value case,
   the corpus claims it scores against (cite claim ids), cost guess, and the exact first build.
   **No backlog ticket yet:** John's Accept turns the card into a queued ticket (B17 — superseded
   2026-09-01 by `M6-05`; B23 — retired 2026-09-01, no replacement; both `SES-285`).
   Reverse kills it and records the rejection as a `vision_claims` row with
   `status='rejected'` (`SES-157` — `vision/rejected-paths.md` is a retired stub, never
   appended).
6. Write `INVENTION PASS: ran, N proposals, card <id>` (or `: no survivor` — an honest zero
   beats a forced proposal) in `notes`, then **continue to step 5 normally** — the pass is
   bookkeeping plus research, not this cycle's build (B24 logic; the cycle still delivers one).

**5. Pick ONE item.** Selection layers, in order (register B30):
**(1a) One-off directives** — `runner_directives` `WHERE type='directive' AND status='queued'`,
oldest first: a directive is the mission, mark it `in_progress`. **(1b) A standing epic drain**
— see the block immediately below; it sits *under* 1a, because John's latest specific word
outranks a standing build order (the same reasoning that puts a pin above the automation lane).
(2) **John's automation queue — NO LONGER A LAYER YOU EXECUTE BY HAND. It is in
the board (`SES-86` phase 3, `v7.0.133`, directive `f47e5a95`).** It used to read: go to
`docs/RUNNER-GOV-0820-REQUIREMENTS.md`'s C4 section, work out which of his tickets is the next
incomplete one, and pick it before touching the class-sorted backlog. **That prose is now
`backlog_items.automation_rank`, the leading `ORDER BY` key of `recompute_backlog_queue()`** — so
his order arrives as queue positions 1..N like everything else, and layer (3)'s two statements
below are the whole of steps (2) and (3) together. Nothing to remember, nothing to re-derive.
(3) The backlog by class — **read from `public.backlog_items` via SQL, never by parsing the markdown
files (`SES-83` (d), `v7.0.112`; John's "table is authority" call, Accepted 2026-08-21T00:19Z).**
**The order is now STORED, not re-derived on every read (`SES-86` phase 2, `v7.0.130`,
register B4).** `backlog_items.queue` holds each ticket's position, maintained by one idempotent
full renumber, `public.recompute_backlog_queue()`. Recompute first, then read — two statements,
both verbatim:

```sql
-- (1) Recompute. Idempotent: returns the number of rows whose position actually moved,
--     so a board that did not change returns 0 and writes nothing.
SELECT public.recompute_backlog_queue();

-- (2) Read the top of the queue. Claims filter SELECTION, never the numbering.
--     design_status and kickoff_link are PROJECTED, never filtered on (SES-114): a flagged
--     ticket keeps its number and you skip it by reading it, exactly as status does.
SELECT backlog_id, queue, tier, priority_class, status, design_status, kickoff_link,
       left(regexp_replace(coalesce(description,''), '^\*\*P[0-9]+[^*]*\*\*\s*', ''), 200) AS gist
  FROM public.backlog_items
 WHERE queue IS NOT NULL
   AND (claimed_by IS NULL OR claimed_at < now() - INTERVAL '24 hours')
 ORDER BY queue
 LIMIT 5;
```

`queue IS NULL` means **out of the standings entirely** (B4, as amended by `SES-113`) — it is set
for exactly the tickets the old `WHERE` excluded by hand (`status IN ('done','removed')`, or no
`priority_class`), so the filter cannot drift from the numbering the way two hand-maintained
copies of one `ORDER BY` could. **Gated tickets still get a number** (B15): gated-ness is a lane
flag, never a missing position.

**A `removal proposed` ticket NOW HOLDS ITS NUMBER — and is skipped procedurally, right here
(`SES-113`, `v7.0.158`, migration `ses113_removal_proposed_keeps_slot`).** John's ruling
2026-08-22, verbatim: **"what if I reject the proposal?"** A removal-proposed ticket is one
**awaiting his verdict**, exactly like a `needs-john` ticket — and the two were being treated
oppositely: `needs-john` kept its number and was merely skipped, while removal-proposed was
stripped from the standings the instant the proposal was filed and vanished from "Next up", the
"Next 3" line, the `now`-tier census and the snapshot's ordering. His Reverse then had to
re-insert it from nowhere. The asymmetry was the bug; it is gone.

**What that means for YOU, at this query, and it is not optional.** The read above filters on
`queue IS NOT NULL` and claims — **it does not filter on `status`**. So a removal-proposed
ticket is now *visible to selection*, and building one would mean building a ticket whose premise
the runner itself has argued is **dead**, while John's verdict is still pending. `status` is
already a projected column of that query for exactly this reason: **when the top of the queue is
`status = 'removal proposed'`, DROP TO THE NEXT TICKET (B24) and leave its number alone.** Do
not re-card it — the removal card is already filed and undecided, and a second one is noise on
John's page. Do not clear its queue, and do not "tidy" it to `removed`: **no unattended removal,
ever** (step 8c) — `removed` is written only by harvesting John's Accept.

Two consequences worth knowing before you edit any of this. **John's Reverse is now zero-motion
re-entry:** the ticket already holds its earned slot, so "no, keep it" restores `status` and
`revalidated_at` and moves nothing — where it used to land wherever the next renumber happened
to put it. And the skip above is now **one of three**, read from the same query — see the block
immediately below, which is where `SES-114` stopped them being three separate rules a cycle has
to remember.

**THE BLOCKED PREFIX IS READ AT A GLANCE, NOT RE-DERIVED EVERY CYCLE (`SES-114`, `v7.0.165`).**
Five different flags mean *this ticket keeps its number and you step past it* (the table's
sixth row, `designed`, is not a skip), and until this ticket they lived in separate places with
only `status` visible to the selection query. Read them off the two columns the query now
projects, in this order, and drop to the next ticket (B24 — superseded 2026-09-01 by `M6-06`,
`SES-285`, annotated `SES-289`; its *"exactly one build per cycle"* half is explicitly **not**
withdrawn and still binds, so the drop itself is unchanged) on any of them:

| What you see at the queue top | What it means | Who clears it |
|---|---|---|
| `status = 'removal proposed'` | The runner argued the premise is dead; John's verdict is pending (`SES-113`) | John, on the removal card |
| `status = 'delivered'` | Built and pushed by a cycle; John's Accept is pending (`SES-154`) | John, on the ship card |
| `design_status = 'needs-john'` | A decision is owed on a filed `gated_before_build` card | John, on that card |
| `design_status = 'needs-desktop'` | The remaining work is on a surface an unattended cycle may not touch (`.claude/`, register B39) | A session John attends |
| `design_status = 'john-paced'` | The remaining work is John ratifying cards **already on the page** (`SES-166`, `v7.0.209` — today only `SES-84`, whose ask is §12's vision claim cards) | John, on those cards, at his own pace |
| `design_status = 'designed'` | **Not a skip** — the design already exists; see step 6's fast path | — |

Three of the five — `removal proposed`, `needs-john`, `needs-desktop` — are a `record_skip()`
call before you drop (`reason_kind` `removal-proposed` / `needs-john` / `needs-desktop` — or
`permission-gate` when the block is the `.claude/` gate specifically); `delivered` and
`john-paced` are stepped past **silently, with no `record_skip()`**, because their ask already
lives on a card John's page carries (the two paragraphs below say why). **A contested claim is
still NOT a skip** — it clears itself in 24h and John can do nothing about it.

**`delivered` and `john-paced` are the two rows in that table that are NOT `record_skip()` calls,
and both for SES-127's own boundary rather than as exceptions to it (`SES-154`, `v7.0.205`;
`SES-166`, `v7.0.209`).** A skip row
exists to put an ask on John's page that nothing else is carrying. A `delivered` ticket already has
one — its undecided `ship` card, which asks him for the very tap that clears the status — so
recording a skip as well gives one ask two homes and puts the same ticket in front of him twice,
which is precisely how §10 stops being read. Step past it silently and let the card do its work.
It also needs no `resolved_at`: §10 derives "still skipped" from the ticket's status, and John's
Accept moves it to `done` with no write from you. Note where this skip does and does not bite: the
drain's pick predicate excludes `delivered` **in SQL** (migration `ses154_delivered_status`), so a
delivered member can never be handed to you as a drain pick — this procedural skip is for layer 3's
class-sorted board read, which filters on `queue` and claims but never on `status`.

**`john-paced` is the same boundary applied to a ticket that is not delivered (`SES-166`,
`v7.0.209`, migration `ses166_john_paced_design_status`; John, 2026-08-23: it "should not"
appear as something he must address).** The ticket's remaining work is John ratifying cards the
page already carries — for `SES-84` — *the vision corpus*, that is §12's vision claim cards, three
per rebuild — so the ask has a home and a skip row would be its second. Found live: `SES-84` wore
`needs-john`, whose row above records a skip, and `record_skip()` re-asserted it into §10.1
*Needs your decision* three times in one day with an Unblock button that had nothing to unblock
(its own reason text admitted "no unattended build is left"). Step past a `john-paced` ticket
silently — no `record_skip()`, no `resolved_at` bookkeeping — and let its cards do their work; the
ticket flips `done` on its own terms (for `SES-84`: when every claim is ratified or reworked).
Never write `john-paced` yourself: like every `design_status` re-flag that changes what John is
told he owes, assigning it is his call, made in an attended session.

**Measured before this shipped, because the waste was real and this cycle paid it too.** The
step-5 query projected `status` and nothing else, so a `needs-desktop` ticket looked exactly like
a buildable one and the only way to tell was to read its description and reason the blocker out
again. Live `runner_skips` at `23:10Z` 2026-08-22 held `SES-106` and `SES-110`, at queue **1** and
**3** — the top of John's standing Automation drain — and their `skip_count` went 1 → 2 while this
cycle re-established, for the third time that day, what two earlier cycles had already
established. Three re-derivations of one answer, on a 3-hour cadence.

**The honest half: the flag had to be made TRUE, not just visible.** Census at `23:11Z`, before a
line changed: `design_status` was `designed` on 23 rows and `NULL` on the other 573 — **zero rows
carried `needs-john` or `needs-desktop`**. Projecting the column alone would have shipped a skip
that can never fire and a QA that passes while nothing changes. So the filing-time write below
ships in the same commit, and the two live permission-gate rows were corrected to `needs-desktop`
from **their own descriptions** (`SES-106`: *"that half needs a session John attends"*;
`SES-110`: *"the `.claude/` session-setup half is needs-desktop"*), before-image first.
`CHI-89` was deliberately left alone: `removal proposed` lives in `status`, and giving one fact a
second home is how two copies start disagreeing.

**`NULL` is not `auto`.** 545 open rows carry `NULL` and run the full ceremony, which is what
`auto` also means — but they are not the same claim, and no cycle may backfill `auto` onto a row
nobody has classified.

**LAYER 1b — A STANDING EPIC DRAIN (`SES-111`, `v7.0.156`, migration `ses111_drain_epic`).**
John's ask, filed with the Automation epic 2026-08-22: *"run the Automation epic to completion
non-stop."* A drain is a `runner_directives` row he writes **once** — `type='drain-epic'`,
`epic_id` naming the epic — meaning *work **the members he named**, cycle after cycle, until none
are left.* Run it as **one call**, before layer 2/3's recompute-and-read:

```sql
SELECT * FROM public.drain_epic_next('<your cycle id>');
```

**THAT ONE CALL NOW ADVANCES PAST COMPLETED DIRECTIVES ITSELF — you do not loop it, and you must
not have to (`SES-189`, `v7.0.215`, migration `ses189_drain_advance_past_retired`).** Until this
shipped the function read exactly ONE queued directive (`ORDER BY created_at LIMIT 1`) and, on
`open_now = 0`, retired it and **returned** — so a cycle whose call landed on a complete directive
spent its whole drain call on bookkeeping and fell through to the board, and John's *next* standing
drain was not read until the following cycle. Found live 2026-08-23 with M0/M1/M2 queued in
sequence and M0 already complete: one retirement per cycle, one stale directive each, M2's first
pick two grid slots out. The scan is now a bounded loop that keeps advancing while directives
retire and acts on the first `pick` / `blocked` / `unscoped` / `none`.

Three things about that change, so a later editor does not undo it:

- **It changes WHEN in a cycle the next directive is read, never WHO decides.** No predicate moved.
  Retirement still requires every **named** member (`SES-142` scope) `done`/`removed`, with
  `delivered` still deliberately absent from that side (`SES-154`); the pick predicate is
  byte-identical; property 5 stands — nothing here creates a drain row.
- **Each retirement still writes its own `runner_before_images` row before its UPDATE.** N
  retirements in one call write N before-images; the ledger loses nothing.
- **It was put in the function rather than in this step for a reason this file has already paid
  for six times** (`SES-86` phase 3, `v7.0.146`, `SES-101`, `SES-111`, `SES-127`, `SES-128`,
  `SES-129`): a rule each cycle must remember is a rule that gets silently forgotten. It also fixes
  the **second** call site for free — step 9's tail Gate B (`SES-139`) calls the same function, and
  a step-5-only loop would have left the chain declining to continue while a real pick sat behind a
  completed directive.

**THE FINISH LINE IS A FIXED LIST JOHN NAMED, NOT THE LIVE `now` TIER (`SES-142`, `v7.0.179`,
migration `ses142_drain_scope`).** John's ruling, 2026-08-23, in chat, verbatim: ***"the user must
name when the drain is done… The use case is the epic automation — all its current tickets in the
now bucket are complete."*** Until this shipped, both predicates read the epic's **live** `now`
tier — and cycles file new tickets into a drained epic continuously, so the finish line receded as
fast as the runner approached it and a standing order John gave with an end in mind was becoming an
open-ended mandate the runner granted itself. **Measured, and the defect selected the very cycle
that fixed it:** John named **18** members on directive `b74009ea`; the live `now` tier held
**19**; the extra one was `SES-142` **itself**, filed `03:51Z` *after* the naming — and
`drain_epic_next()` returned it as the `pick`. The scope now lives in
`public.runner_drain_scope` (one FK row per named member, `unique (directive_id, item_id)`), and a
ticket filed into the epic **after** naming never joins a standing drain: it queues normally and
waits for John.

**Five outcomes, and the whole rule is in them — do not re-derive it:**

- **`none`** — no drain declared. The normal case: ignore this layer entirely and read the board
  exactly as before. **Selection with no drain standing is byte-for-byte what it was in
  `v7.0.155`.**
- **`pick`** — build `backlog_id` (claim it with step 5's atomic claim, same as any ticket). It is
  the lowest-`queue` **named** member you can claim. **Since `SES-196` (`v7.0.252`) it is also the
  lowest-`queue` member that is not flagged `needs-john` / `needs-desktop` / `john-paced`** — the
  picker skips those itself, so a flagged member is no longer handed to you to `record_skip()`. Its
  existing skip row already carries the ask (tail (8)'s `SES-196` block has the measurement).
  **And since `SES-218` (`v7.0.295`) it is also a member whose remainder is not blocked on another
  ticket** — see the `blocked_by` property below.
- **`blocked`** — the drain is live and named members are still open, but none you can claim right
  now: a peer holds them, they are `delivered` awaiting John's Accept, (since `SES-196`) every
  one that remains is flagged and waiting on him, or (since `SES-218`) every one that remains is
  blocked on another open ticket. **`blocked_detail` names which** — it is never a
  silent empty. **Fall through to the class-sorted board and build normally.** A drain must never
  end a cycle build-less — register B24's rule (B24 superseded 2026-09-01 by `M6-06`; `SES-285`,
  annotated `SES-289` — the one-build-per-cycle half survives that supersession and is what binds
  here), binding here for the same reason.
- **`unscoped`** (`SES-142`) — a drain exists but **John has named no member list for it**. Behave
  exactly as for `blocked` — fall through and build from the board. It is a **separate word from
  `blocked` on purpose**: reusing `blocked` would give one outcome two meanings, and the thing it
  must never do is quietly fall back to the live-tier predicate, which is the bug wearing a
  default's clothes. It fails closed and does **not** retire the drain. The only way to reach it is
  a future drain declared without a list; the standing drain `b74009ea` carries its 18 since this
  ship.
- **`retired`** — **every named member the gate ruled required** (`milestone_required`, `SES-304`)
  is `done`/`removed` — or, for a drain whose list carries no such ruling, every named member
  (`SES-310`, `v7.0.393`). <!-- FEATURE: SES-310 — the finish line is the required set, not the whole named list. -->
  **Non-required and deferred members are reported in `blocked_detail`, stay on the board, and
  remain pickable under Prime Directive §2(c); they are not the finish line.** The function has
  already written the
  before-image and closed the directive; nothing is owed. Fall through. **Since `SES-189` this
  outcome means "this call closed at least one drain and found nothing else actionable behind it",
  and it may have closed MORE than one** — the ids it carries are the *last* directive retired. It
  is still the word for "a drain finished here", so the ledger and the briefing keep reading it the
  same way; `none` remains reserved for "there was no queued drain-epic row at all".

Five properties that are load-bearing, each written into the migration header so they travel with
the code. **Anyone editing this must preserve all five:**

- **The epic is an FK, never prose in `body` — and so is the SCOPE (`SES-142`).** `CHECK
  ((type='drain-epic') = (epic_id IS NOT NULL))` — a drain must name an epic, nothing else may.
  The member list is `runner_drain_scope` rows keyed on `backlog_items.id`, **never a `text[]` of
  ids**: `backlog_id` carries no unique constraint (`CHI-48` occupies two rows, `SES-97`), so an id
  array silently pulls in both. `runner_drain_scope.backlog_id` is a naming-time snapshot for
  provenance and is **never joined on**. Same prose→column correction as `SES-86` phase 3 and
  `v7.0.146`, for the same measured reason.
- **A drain is NEVER consumed.** Layer 1a's *"mark it `in_progress`"* would end the standing-ness
  on cycle 1, which is the entire feature. `drain_epic_next()` touches `status` only to retire.
- **`delivered` BELONGS IN THE PICK PREDICATE AND NOT IN THE RETIREMENT ONE (`SES-154`, `v7.0.205`
  — relocated here from the retired header stamp by `SES-164`, because it was the ONE editor warning
  in that pile with no copy anywhere in this body).** `drain_epic_next()` holds **two** predicates
  over the same named scope and this is the distinction a later editor is most likely to collapse.
  The **pick** predicate EXCLUDES `delivered` — otherwise the drain hands the same delivered ticket
  back every cycle and never advances. The **retirement** predicate must **NOT** exclude it: a drain
  retires on John's **acceptance**, never on the runner's own say-so. Adding `delivered` to the
  retirement side returns `open_now = 0` and **retires** where the correct build returns `blocked`,
  closing John's standing directive on the runner's word — the exact authorisation defect `SES-142`
  was filed to end, rebuilt.
- **The NAMED LIST REPLACES the tier predicate — it is not kept alongside it (`SES-142`).** This
  property used to read *"`now` tier only"*, from John's boundary on `SES-110` (*"finish the
  `<epic>` tickets"*). His 2026-08-23 ruling supersedes it: the list is captured **from** the `now`
  bucket at naming time and is thereafter the whole scope. **Do not re-add a `tier` clause** — that
  would leave a second moving predicate in place, so re-tiering a named ticket to `next` would
  silently drop it out of a drain John declared over it. Proven live in QA: with `SES-141` re-tiered
  to `next`, the shipped build still picks it and the retired build drops it and picks `SES-140`.
- **`blocked` is NOT `retired`, and this is the parallel-cycles trap (register B42).** The two
  predicates differ on purpose: **retirement** asks whether any **named** member is still open,
  claims ignored; the **pick** asks which named member *you* can claim, claims honoured (24h
  expiry, the B37 bar). Conflate them and two peers holding the last two claims between them each
  cancel John's standing order while both tickets are still being built. Proven live: sole member
  claimed by a peer → `blocked`, `open_now=1`, directive untouched.
- **It never self-activates.** Nothing creates a drain row **or a scope row** but John's own
  declaration — a directive row or a briefing tap. The runner may read one; it may never write one.
  This is the property that keeps the feature from being a widening of the runner's own autonomy,
  and it is not negotiable.

**A REMAINDER BLOCKED ON ANOTHER TICKET IS NOT WORK EITHER — `backlog_items.blocked_by`
(`SES-218`, `v7.0.295`, migration `ses218_blocked_by`; John's directive `07dea95e`, attended
architect session 2026-08-28).** The pick predicate filtered `queue`, `status <> 'delivered'`, the
three flags and claims, and **never whether the remainder was blocked on another ticket** — so a
cycle that deliberately left work `partial` behind a blocker got that same ticket handed back on
every call. Found live 2026-08-28T21:02Z by cycle `6080ef8d` in its own tail: `drain_chain_gate`
returned `continue` with `drain_pick = SES-191`, the ticket that cycle had just left `partial`
pending `SES-216`. It declined the continuation on the finding rather than spending a cycle
re-deriving that there was nothing to build. **This is `SES-154`'s defect in a third costume** and
that ticket's own words transfer exactly: *"otherwise the drain hands the same delivered ticket back
every cycle and never advances."*

**THE ONE-LINER THIS FORBIDS, and it is why a ticket was filed instead of a patch:**
`AND b.status <> 'partial'` in the pick predicate. **`partial` is NOT uniformly do-not-re-pick** — a
partial whose remainder *is* buildable **should** come back, and `SES-51` and `SES-180` each shipped
a further half from `partial` on 2026-08-28. The blanket clause strands exactly those. John set the
criterion himself, verbatim: *"keeps partial re-pickable when the remainder IS buildable … while
excluding a partial whose declared remainder names an open blocking ticket."*

Four boundaries, each of which is how this gets rebuilt wrong:

- **The clause is in the PICK predicate ONLY — never the RETIREMENT one.** Third time this
  boundary has had to be stated (`SES-154` for `delivered`, `SES-196` for the flags). Adding it to
  the retirement side returns `open_now = 0` and **retires**, closing John's standing directive on
  the runner's own say-so — the `SES-142` authorisation defect, rebuilt. A drain every remaining
  member of which is blocked is **`blocked`**, never `retired`.
- **`delivered` UNBLOCKS a dependent, though a delivered ticket is not itself pickable.** John's
  own sentence is the authority: *"After (1) ships, `SES-191`'s remainder becomes buildable"* —
  **ships**, not *is accepted*. The two clauses answer two different questions — `status <>
  'delivered'` asks *"is there work HERE?"* and this one asks *"has the code I depend on landed?"*
  — so the sets are deliberately different and **collapsing them to one breaks one of the two**:
  treat `delivered` as still-blocking and the dependent sits excluded behind a blocker already on
  `dev`, which is this same stall one ticket further along.
- **NOTHING CLEARS IT, and nothing should have to.** The clause is a `NOT EXISTS` over the
  **blocker's live status**, so the member is re-admitted the instant the blocker reaches
  `done`/`removed`/`delivered` with no write anyone must remember — the same shape as
  `record_skip()`'s row being cleared by the ticket going `done` rather than by a cycle deciding it
  has waited long enough. A rule each cycle must remember is a rule that gets silently forgotten.
- **It is keyed on `backlog_items.id`, never `backlog_id`** (`SES-142` / `SES-86` phase 2:
  `backlog_id` carries no unique constraint and `CHI-48` occupies two rows, so a text key silently
  means both), and `ck_backlog_items_blocked_by_not_self` rejects a self-reference.

**NEVER write `design_status = 'needs-john'` or `'john-paced'` on a blocked ticket to get it out of
the picker.** Both put an ask on John's §10 that he cannot act on — the blocker is another ticket,
not a decision of his — and `SES-166` is written from exactly that failure; the runbook also forbids
a cycle assigning `john-paced` at all. `blocked_by` is the column for this, and it says the true
thing.

**Named deviation, disclosed rather than buried (the `SES-196` convention): the clause is
status-agnostic, not scoped to `partial`.** John's sentence says *"a partial whose…"*. It is not a
widening: `blocked_by` is a **new column, `NULL` on every row of the board**, written only ever
deliberately, so partial-only and status-agnostic are byte-identical on today's board and can differ
only on a row some future cycle explicitly marks — where making the column inert because the row is
`open` rather than `partial` would give one column two meanings depending on a second column.
`partial` was the symptom; `blocked_by` is the fact, and the predicate reads the fact. **No row was
backfilled at this ship** — `SES-216` was already `delivered`, so setting it on `SES-191` would have
stranded a ticket whose dependency had landed.

**Fourth costume, closed by `SES-247` (2026-09-02, v7.0.380) — a partial whose remainder is not
buildable now, for a reason that is not a ticket.** Found live 2026-08-29: `drain_chain_gate()`
handed back `SES-246` twice and `SES-245` once, each a `partial` the closing cycle had just declared
"not buildable in this cycle" with no `blocked_by` to say why. `SES-247` proposed a new column
(`blocked_note` + a pointer at a `runner_questions` row); read against `M6-01` and `SES-305`, none
is needed — every case is one of three, and each already has its column. **When you close a ticket
`partial` with a declared remainder, decide which:**
- **(a) the remainder awaits another ticket** → write `blocked_by` (the `SES-218` clause above); it clears itself the moment the blocker lands.
- **(b) the remainder awaits a decision** → there is no such state: under `M6-01` you decide it now, **record it as a decision row per 7b — the ticket note carries the handle, not the reasoning alone** (`SES-286`, `v7.0.395`), and either build the remainder or leave the partial **re-pickable** — John's criterion, *"keeps partial re-pickable when the remainder IS buildable"*. Two of the three 2026-08-29 hand-backs were questions for John; they are decisions a cycle makes now, reversible under `M6-02`. <!-- FEATURE: SES-286 (b) — the handle, not the reasoning alone. -->
- **(c) genuinely not buildable now for a non-ticket reason** (a machine John has → `needs-desktop`; an external party, a real-world wait) → write `defer_status = 'yes'` with `defer_reason` naming the condition. `SES-305` keeps it out of the pick and the pre-boot gate — **pick predicate only, never the retirement one**, exactly as `blocked_by` — and the drain census reports it every fire (*"N deferred (…)"*), so it is visible without a question attached (`M5-10`'s standard). Whoever resolves the condition clears the flag; the census is what stops that write being forgotten.

The forbidden one-liner stays forbidden — `partial` is NOT uniformly do-not-re-pick, and a
buildable remainder coming back is the design. `drain_chain_gate()` inherits all three branches
through `drain_epic_next()`; nothing was added to the chain gate itself.

**A FINISHED MEMBER IS NOT WORK EITHER, AND THE PICK PREDICATE NOW SAYS SO IN ITS OWN WORDS —
`status NOT IN ('done','removed')` (`SES-275`, `v7.0.354`, migration
`ses275_drain_pick_status_clause`).** The three clauses above each added a reason a *live* member is
not work. This one is about a member that is **finished**, and it had no clause at all: the pick
predicate excluded `done`/`removed` only through `b.queue IS NOT NULL`, on the strength of its own
comment — *"'done'/'removed' need no clause (the recompute strips their queue)"*. **That is an
invariant maintained by OTHER writers, never by this function**: whoever sets a ticket `done` must
also run `recompute_backlog_queue()`. The retirement predicate in the same function has always
carried the clause explicitly, so the two halves of one function already disagreed about whether the
invariant may be assumed.

**Measured live, not reasoned about.** At `2026-08-31T23:11:30Z` an attended session set `SES-244`
to `done` without running the recompute; the row kept **queue 265**, and at `00:2xZ` the next
cycle's `drain_epic_next()` returned `outcome = 'pick'` with `backlog_id = 'SES-244'` — **a done
ticket handed back as this cycle's work.**

**THE DAMAGE IS THE OUTCOME WORD, NOT A WRONG BUILD, and reading it the other way is how this gets
under-fixed.** Step 5's atomic claim carries `AND status <> 'done'`, so the claim returns 0 rows and
the cycle drops to the next ticket (B24 — superseded 2026-09-01 by `M6-06`, `SES-285`, annotated
`SES-289`; the drop and the one-build-per-cycle rule behind it are unchanged) — no duplicate build is
reachable from here. What *is*
reachable is the chain: tail (8)'s **Gate B fails only when this call returns anything but `pick`**,
and **Gate C reads the pick's `design_status`**, which is `NULL` on a finished row — so **both gates
pass** and the chain opens a continuation on a drain with nothing claimable. That is the
`SES-197` / `SES-218` inversion one level down: the chain running on because the terminator was
handed the wrong word.

**THE EDIT THIS FORBIDS: adding this clause to the RETIREMENT predicate.** It is already there. This
is the **fourth** time that boundary has had to be written down — `SES-154` for `delivered`,
`SES-196` for the flags, `SES-218` for `blocked_by` — and the failure is identical every time: a
pick-side clause moved to the retirement side returns `open_now = 0` and **retires**, closing John's
standing directive on the runner's own say-so.

**`SES-310` READS `milestone_required` ON THE RETIREMENT SIDE, AND THAT IS NOT THIS EDIT.** <!-- FEATURE: SES-310 — why the required-set retirement rule is not the forbidden move. -->
Every clause the paragraph above protects is a **pick-side** clause — `delivered`, the
`design_status` flags, `blocked_by`, `defer_status` — and each one is a judgment a *cycle* makes at
pick time, which is exactly why a drain retiring on one would retire on the runner's own say-so.
`milestone_required` is the opposite kind of fact: it is set **only at a milestone's gate decision**
(`SES-304` / `M5-04` — *"set at its gate decision and never re-judged per question"*), by John or by
the gate sitting under `M6-01` with `M6-02`'s 72-hour reversal window, and **never by a cycle's
pick-time judgment**. So a drain whose required members are all finished retires on **the gate's
word**, which is the authorisation this boundary exists to protect — the M5 gate record, 2026-09-02:
*"completion is a property of the required set."* Three things stay true and are the reason this is
safe rather than merely argued: **pick-side clauses still never move here**; a drain whose named list
carries **no** `milestone_required` row keeps the all-members rule unchanged, so the new rule engages
only where a finish line has actually been ruled; and **deferral still never exempts a *required*
member** — a deferred required member holds the drain open, because that is a signal the gate must
re-rule rather than a reason to retire.

**RUNNING THE RECOMPUTE IS NOT A SUBSTITUTE, and that is why this is a migration and not a data
repair.** The finding cycle did run it (**336 rows moved**), which stripped `SES-244`'s queue and
made the very same call return `blocked` correctly. That repairs the board it found; it does nothing
about the next writer of `done` who skips the recompute — and **a rule each cycle must remember is a
rule that gets silently forgotten**, the `record_skip()` precedent this file records eight times
over. The clause is the structural form of the same fact.

**The `blocked_detail` census base carries the identical clause, from ONE list** (`c_finished`,
held beside `c_flagged` and `c_unblocking`) rather than two hand-copied literals: `SES-196` requires
that census to run *"over exactly the base the pick predicate reads"*, and a finished member counted
into none of the `FILTER`ed populations sends John to the *"read the scope by hand"* branch on a
drain whose real state is perfectly describable.

**AND THE NON-REQUIRED BUCKET IS DELIBERATELY ABSENT FROM THAT SUM — do not "complete" it**
(`SES-310`, `v7.0.393`; relocated here from that stamp by `SES-312` under session-hygiene check 7
step 2, because it appeared **zero** times in this body). <!-- FEATURE: SES-312 — SES-310's census-sum warning gets a body home before its stamp rotates out. -->
`v_nonreq_open_n` counts **different tickets** than `v_open_now` does, so adding it into the
read-the-scope-by-hand sum would explain a *required* member's unclaimability with a fact about
somebody else's ticket. For the same reason the census's opening phrase says *"required member(s)"*
**only** when `v_req_n > 0`: a drain whose named list carries no `milestone_required` row is still
on the all-members rule, and announcing a finish line it does not have is the same error stated
forwards.

**Corrected, because it was measured rather than recalled (`SES-142`, `v7.0.179`).** This paragraph
used to read *"the Automation epic cannot currently drain to completion — `SES-110` is `partial`
with one `.claude/` half an unattended cycle may not make."* Read live this cycle,
`SES-110` **and** `SES-106` are both `status = 'done'`, so that specific blocker is gone. The real
reason the drain could not terminate was never `SES-110`: it was the **live-tier predicate this
ticket replaced**, which the runner's own filings extended faster than it drained. Termination now
depends only on John's 18 named members closing — a set no cycle can add to.

**THE AUTOMATION LANE SITS ABOVE ALL SIX ORDER CLAUSES (`SES-86` phase 3, `v7.0.133`, directive
`f47e5a95` — John, 2026-08-21T16:21Z).** His line, verbatim: *"keep closing automation tooling
tickets first before getting to the classified backlog."* `backlog_items.automation_rank` holds his
C4 step number (1–6; NULL = not in the lane) and is the function's **leading** key, `NULLS LAST`.
Three things about it:

- **Why it stopped being prose.** As a doc section, layer 2 was something each cycle had to
  remember to consult, and the forgetting was silent. Measured on the live board at `16:29Z`
  2026-08-21, immediately before this shipped, his automation tickets sat at queue **2, 241, 242,
  243, 244, 280, 281** of 551 — five of seven past position 240, reachable only by a cycle that
  went and read C4 by hand. It had already failed: the `v7.0.130` briefing told John in writing
  that *"the next unattended cycle will be building product, not tooling, for the first time"*,
  and he overruled it within the hour. After the change, queue **1–5** are his open automation
  tickets in his own order and the class-sorted backlog resumes at 6.
- **It retires itself, which is his "until automation is complete".** A `done` ticket leaves the
  ranked set, so when the last lane ticket closes, the leading key matches nothing open and the
  order reverts to the six clauses — no migration, no edit, no cycle deciding it is over. Do not
  add an "is the lane finished?" check; that is the thing this replaced.
- **When pins land, a pin outranks the lane.** B23's "a gated card's Accept re-enters at queue #1"
  — B23 retired 2026-09-01 by `SES-285`, no replacement rule (annotated `SES-289`), so that
  re-entry is **annotated-as-withdrawn and unrunnable**; the pin half survives live in `B5` —
  still has nowhere to store a pin. Add it as the key *above* `automation_rank`, never below:
  John's live tap is later word than a standing build order.
- **A NEW automation ticket claims the TOP of the lane, and one call does it —
  `SELECT public.claim_automation_lane_top('<TICKET-ID>');` (`SES-101`, `v7.0.147`, migration
  `ses101_automation_lane_top`).** Nothing assigned `automation_rank` at filing time, so a newly
  filed automation ticket landed in the class-sorted backlog exactly like the seven tickets that
  sat at queue 241–281 *before the lane existed*. **John's ruling is that it goes above the
  existing lane, not below** — question `q-lane-top`, answered **yes** 2026-08-21T20:47Z, from his
  directive `48ae1939` line 4: *"if you create more automation tickets keep making them top of
  queue."* The slot is therefore `min(open lane) − 1`, **never `max + 1`**. Three things worth
  knowing before you edit it: it is **idempotent** (a ticket already at the open lane's minimum is
  left alone, so a second call cannot ratchet it further negative); it **runs the queue recompute
  itself**, because making the caller remember a second statement is the exact class of forgetting
  this ticket exists to remove; and it reads the **open** lane only, so `done`/`removed` tickets
  keep their historical rank (`ADM-1` = 1) without competing. It is **not** `SECURITY DEFINER` and
  `EXECUTE` is revoked from `PUBLIC` — see the grants note below. **Measured, because the drift was
  already real:** the last three automation tickets filed before this shipped were hand-assigned to
  the *bottom* of the lane (`SES-99` = 7, `SES-100` = 8, `SES-101` = 9), the opposite of what he
  answered.
- **Revoking a function's `EXECUTE` from `anon, authenticated` does NOTHING — you must revoke from
  `PUBLIC` (found live, `SES-101` QA, `v7.0.147`).** This is the exact function-level twin of
  `.claude/rules/supabase-column-grants.md`: Postgres grants `EXECUTE` to `PUBLIC` by default, and
  a narrower revoke cannot subtract from the broader grant. The first migration's
  `REVOKE EXECUTE … FROM anon, authenticated` **reported success and changed nothing** —
  `has_function_privilege('anon', …)` still returned `true`. The working form is
  `REVOKE EXECUTE ON FUNCTION … FROM PUBLIC, anon, authenticated;` followed by an explicit
  `GRANT … TO postgres, service_role;`. **Assert both directions** — the denied role denied *and*
  the permitted role still permitted — exactly as the column rule requires; a one-directional
  check passes on a function nobody can call at all.

**John's rules live inside the function now — that is the point, and it does not make them
optional.** The function's `ORDER BY` is the retired query's, clause for clause: tier
`now → next → later`, then `P1 - Improves John's Skills` → `P10 - Tooling`, then beta-marked
first, then newest filed, then oldest (John, 2026-08-20); `backlog_id` last so two readers of the
same board always see the same #1. Five things about that ordering are load-bearing and were each
found live. **Anyone editing `recompute_backlog_queue()` must preserve all five** — they are
repeated in the migration's own header comment (`ses86b_backlog_queue_numbers`) so they travel
with the code:

- **Order the class numerically, never lexically.** `ORDER BY priority_class` is a text sort and
  puts `P10 - Tooling` *ahead of* `P2 - Inventive` — exactly backwards. Hence the digit extract.
  **Measured against the live board 2026-08-21 (`v7.0.130`'s negative control), because "it looks
  right" is not a test:** numbering the same 550 tickets lexically produces **17,616** class
  inversions and **81,281** tier inversions; the shipped function produces **0** of each. That
  gap is what makes the QA discriminating — an implementation that merely gave every ticket
  *some* number would pass a completeness check and fail this one.
- **`priority_class` carries suffixes.** Live values include `P9 - Bug Fixes · FLAGGED` (19
  tickets). Matching the ten legend strings by equality silently drops every one of them;
  extracting the digit tolerates the suffix.
- **Beta-marked means the retired *declaration*, not the word.** `ILIKE '%beta%'` matches 130
  tickets against the declaration form's 110; the 20-ticket gap is prose, 10 of it the session
  slug `beta-doc-0728c` quoted as evidence inside unrelated bug tickets. Use the regex form.
- **`title` is not a title for imported tickets** — phases (a)/(b) stored the class string there
  (`'P9 - Bug Fixes.'`). The human sentence is the first bolded clause of `description`, which is
  what `gist` extracts. Anything that *displays* the queue (briefing "Next up", "Next 3") must
  use `gist`, not `title`, until the stored column is repaired.
- **The `claimed_by` filter is SES-86 phase 1 — claim-on-pick (John, 2026-08-21, live in chat:
  tickets are the coordination point across ALL sessions, manual and scheduled).** A claimed
  ticket is invisible to selection until its claim expires (24h — the same evidence bar as
  step 0b's silent-cycle rule). See the claim step below.
- **`id` is the final tie-break, and `backlog_id` is NOT unique (`SES-86` phase 2, found live by
  its own QA).** The sixth and last `ORDER BY` clause is the primary key. It exists because
  `backlog_id` carries no unique constraint and **`CHI-48` occupies two rows** (queue 152/153;
  filed as `SES-97`). Two rows identical on all five preceding keys make `row_number()`
  **non-deterministic** for that pair, so the renumber could swap them and report work on a board
  where nothing moved — measured: `550 → 0` (which looked like idempotence and was luck), then
  `435 → 2 → 0`. Adding `id` changes no position that was ever well-defined; it only decides ties
  that previously had no defined answer. **Do not drop it**, and do not assume a ticket ID
  identifies one row: `UPDATE … WHERE backlog_id = 'CHI-48'` writes both.
- **`status='partial'` does not mean the phase you are about to build is unbuilt.** It means
  *some* of the ticket shipped — layer 3's current #1, `ADM-1`, shipped v1 on 2026-08-20 and
  stays `partial` only because v1.5 was deferred. Read the ticket and its harvest before
  building; `SES-86`'s lifecycle status is the structural fix.

**That constraint is GONE — `SES-85` landed (`v7.0.128`) and the whole board is pickable.**
Measured live 2026-08-21 at 16:0xZ, after this cycle's first renumber: **550 open tickets, 0
unclassed, all 550 numbered `1..550`** (now 280, next 23, later 247; 10 tickets `done`). The
figure this paragraph used to carry — "456 of 550 unpickable, leaving 94" — was true at the close
of `v7.0.112` and is now false; a cycle quoting it would under-read its own queue by 6×. **Take
your own census rather than quoting this one** — including of the sentence that used to sit here.
`v7.0.130` reported the queue's top as `DAT-003`, `ADM-1`, `AGT-015`, `LOG-126`, `CHI-89` and drew
the conclusion that the runner would now be "building product, not tooling"; John read that on the
briefing and overruled it (directive `f47e5a95`), so since `v7.0.133` the top is the automation
lane and the class sort resumes beneath it. Measured 2026-08-21T16:4xZ: 549 open, 0 unclassed, all
numbered `1..549`, lane at 1–5. **Classify its lane against
§19v: anything gated — or uncertain — becomes a `gated_before_build` `runner_items` row with
your reasoning — then the ticket goes pending and you DROP TO THE NEXT available queued
ticket and continue (register B24: a card is bookkeeping, not a build — never end the cycle
over one; only walls and blockers end a cycle build-less).** Exactly ONE build per cycle,
never more. A gated card's later Accept re-enters that ticket at queue #1 (register B23 —
tap-order stacking, recompute renumbers beneath).

**FILING THE CARD ALSO WRITES THE TICKET'S `design_status` — same act, not a later one
(`SES-114`, `v7.0.165`).** The card is the *ask*; the row is the *state*, and until this ticket
only the ask existed, which is why the next cycle had to rediscover the block from prose. So in
the same breath as the `runner_items` insert, **before-image first** (§19v):

```sql
-- 'needs-john'    = the card asks John to DECIDE something.
-- 'needs-desktop' = the remaining work is on a surface an unattended cycle may not touch.
-- ('john-paced' also exists — John ratifying on-page cards, SES-166 — but it is NEVER yours
--  to write here: no gated card carries it, and assigning it is John's call. Step 5's table.)
UPDATE public.backlog_items
   SET design_status = '<needs-john|needs-desktop>', updated_at = now()
 WHERE backlog_id = '<TICKET-ID>'
RETURNING backlog_id, design_status;
```

Two boundaries. **Never write `removal proposed` here** — that is a `status`, `SES-113` owns it,
and duplicating it into `design_status` gives one fact two homes. And **never clear the flag
yourself**: it is cleared by the thing that unblocks the ticket — John's tap, or the attended
session that makes the edit — exactly as `record_skip()`'s row is cleared by the ticket going
`done` rather than by a cycle deciding it has waited long enough.

**EVERY SKIP YOU MAKE IS A ROW, NEVER A SENTENCE (`SES-127`, `v7.0.162`, migration
`ses127_skip_records`).** Whenever you step past a ticket for a reason **John** has to clear —
a gated card already filed, a `removal proposed` verdict pending, a `needs-john` /
`needs-desktop` `design_status`, a `.claude/` permission gate — record it with one call, before
you drop to the next ticket:

```sql
SELECT public.record_skip('<your cycle id>', '<TICKET-ID>',
       '<gated|removal-proposed|needs-john|needs-desktop|permission-gate|other>',
       '<one sentence in John''s register: why it is skipped and what would unblock it>');
```

**Measured, because this was already failing silently.** Before this shipped, fifteen
`public.runner_*` tables existed and **none stored a skip** — so every skip this platform ever
made lived as prose inside `runner_cycles.notes` (live example: cycle `1df7d9c6`, 19:12Z, *"Step
5: queue #1 `SES-110` skipped per B24 …"*, a 2026-08 quotation — B24 was superseded 2026-09-01 by
`M6-06`, `SES-285`, annotated `SES-289`). That sentence is real, correct, and completely
invisible to John, who does not read the ledger. §10 of the briefing is what it feeds.

Four things about the call, each of which prevents a real failure:

- **It is idempotent and you are meant to call it every time.** A repeat skip of the same ticket
  for the same reason bumps `skip_count` and `last_skipped_at` on the existing row rather than
  adding a second one — which is what stops John's standing drain (25 open `now`-tier members,
  eight cycles a day) from showing him the same row 8×/day.
- **Do NOT record a skip you can resolve yourself.** A contested ticket claim (0 rows, a peer
  holds it) expires in 24h with nothing for John to do, and `claimed-by-peer` is deliberately
  absent from the `reason_kind` vocabulary — the section is titled *waiting on **your** input*,
  and filling it with rows he cannot action is how an actionable section stops being read.
- **You do not resolve it afterwards.** §10 derives "still skipped" by joining `backlog_items`
  and filtering `status NOT IN ('done','removed')`, so building the ticket later removes the row
  from the section with no write from you. `resolved_at` is only for a ticket that is still open
  when its blocker goes away.
- **It writes its own before-image**, both paths (§19v), so this one call is the whole of your
  obligation.

**The moment the pick is made, CLAIM the ticket — one atomic write, before any work
(SES-86 phase 1, John-approved 2026-08-21).** The write is the reservation, exactly like the
lease and the counters — never check-then-claim in two statements:

<!-- {{rule:B40}} · rendered from public.governance_rules — do not hand-edit the quoted line(s)
     below. Edit the registry row, re-export docs/governance/RULES-SNAPSHOT.md, then run
     `node scripts/render-rule-blocks.js --write`. Checked by that script's default mode (SES-175). -->
> **Rule B40** — Claim a backlog ticket atomically via claimed_by/claimed_at columns at pick time (any session, manual or scheduled); a claim expires after 24h so a dead session can't strand a ticket.

```sql
UPDATE public.backlog_items
   SET claimed_by = '<your cycle id or session name>', claimed_at = now(), updated_at = now()
 WHERE backlog_id = '<TICKET-ID>'
   AND status <> 'done'
   AND (claimed_by IS NULL OR claimed_at < now() - INTERVAL '24 hours')
RETURNING backlog_id;
```

**1 row → the ticket is yours. 0 rows → another session (manual or scheduled) holds it — drop
to the next available queued ticket, exactly as B24 drops past a gated card.** This is what lets
John's manual sessions and scheduled cycles share one board without duplicate builds: manual
sessions run the same claim (session-setup skill step 2c). Directives (selection layer 1) are
already serialized by `in_progress`; this covers layers 2 and 3. **Release the claim AFTER the
push — never in the write that sets the ticket's status (John, question `q-claim-release-order`
answered yes 2026-08-21T22:05Z; `SES-106`, `v7.0.150`).** This paragraph used to say the
opposite, and the opposite could not be obeyed: the claim is the token the push gate re-asserts
(step 0), so a cycle that cleared it in the status write had nothing left to prove one step
later and its own re-assertion returned 0 rows — which the gate defines as *"do NOT push"*. The
order is therefore fixed: status write (before-image first, **claim untouched**) → queue
recompute → re-assert → push → **then** one holder-guarded release. On an abort or a wall-stop
there is no push, so the release happens at the point the cycle stops instead. A
claim you never release expires on the 24h boundary, so a dead session cannot strand a ticket;
QA proved all three arms live on real rows (fresh → 1, contested → 0, 25h-stale → re-claimable).
**The moment the
pick is made, rename this session** to `"<TICKET-ID> — <short name>"` (e.g. "SES-83 (b) —
import NEXT+LATER") so John's runs list shows the work at a glance; on a wall-stop, rename to
`"did not run — <wall>"` back at step 3. No title mechanism available → note it in the cycle
row (register B22).

**5a. READ WHAT YOUR CLASS EARNED — one statement, at pick, before any design (`SES-122` (c),
`v7.0.399`; scoped by `M6-13`).** <!-- FEATURE: SES-122 (c) — the caps stop being literals a cycle
recites and become a number it reads. --> The scope caps are no longer flat: they are a baseline
plus one file and one task per rung the ticket's work class holds above
`runner_settings.cap_relax_rung`. Read it once, here, with the pick in hand:

```sql
SELECT * FROM public.class_autonomy('<PRIORITY CLASS>');
```

Write the answer into this cycle's `notes` as `files N (+k) / tasks M (+k)` — `N`/`M` the baseline
3 and 4, each `k` the returned `extra_files` / `extra_tasks`. Step 7 grades the ship against those
numbers. Four things not to get wrong, all of them consequences of where the grant lives:

- **It is a fact about the class, never about the epic or the ticket.** The same class earns the
  same widening on any epic — the same shape step 7a's auto-done bar has.
- **Never re-derive the arithmetic yourself.** That comparison has one home and it is the SQL
  function; its thresholds are stored columns, not literals (`SES-146`).
- **It fails closed.** No class on the board, a class the ladder does not track, a failed RPC —
  all return zero extras, so a lookup that goes wrong NARROWS your cap and can never widen it. A
  blank rung reads NULL, not 0; rung 0 is a real rung (`invention` sits at it).
- **The one-feature cap is not on the ladder at all.** A rung buys breadth of edit, never a second
  feature — so a widened cap is never a licence to fold a second ticket into this cycle (register
  B22's rename discipline is the reader-facing half of the same boundary).

**6. Full ceremony — no shortcuts, you earn no exemption.** **STEP ONE OF ANY BUILD IS
PICK-TIME PREMISE REVALIDATION (`SES-87` — the revalidation flow, register B7, `v7.0.139`):**
before designing anything, re-verify the ticket's premise against live code/data — does the
gap still exist, or did an intervening ship close it? Premise holds → set
`revalidated_at = now()` and build. Premise dead → set `status = 'removal proposed'`, file a
briefing card carrying the ticket (ID — title) plus the evidence the premise died (commit,
measurement, superseding ticket), run the queue recompute, and **drop to the next queued
ticket per B24** — never build a dead premise and never remove unattended.

**`design_status = 'designed'` MEANS THE DESIGN ALREADY EXISTS — build from `kickoff_link`,
do not re-design it (`SES-114`, `v7.0.165`).** 18 open numbered tickets carry it (census
`23:11Z` 2026-08-22). The row cannot claim it without its artifact — `SES-112` shipped
`CHECK (design_status <> 'designed' OR kickoff_link IS NOT NULL)` — so the link is guaranteed
present, and re-deriving a kickoff for a ticket that has one is the same waste in a different
costume. `auto` or `NULL` runs the full ceremony below exactly as today. **Revalidation is NOT
skipped by this** — a designed ticket's premise can die like any other, and the fast path starts
after the revalidation above, never instead of it.

Then: read the
item's backlog row, the governing `ARCHITECTURE.md` section(s), every `.claude/rules/` file
whose paths you will touch, and the real source files. Inventions additionally pass the R&D gate first (research →
cheapest-variant POC, measured → logged go/no-go; §19d sniff test — traceable reasoning, never
a feature mill). **Re-assert the lease (step 0) before the counter claim** — a version claimed
after you were stolen from is a permanent gap at best — then claim your version atomically
(`dev_version_counter`, SQL in
`docs/runbooks/session-setup.md`). Write the kickoff doc
(`docs/kickoffs/<version>-<ID>-<name>.md`). Implement within the scope caps (one item, ≤3
files, ≤4 tasks).

**IF YOUR BUILD APPLIES A MIGRATION, CAPTURE ITS DOWN FIRST — one call, immediately BEFORE
`apply_migration` (`SES-182` slice 2, `v7.0.333`, migration `ses182_capture_migration_down`):**

```sql
SELECT * FROM public.capture_migration_down('<your cycle id>', '<the up''s name>',
  '[{"kind":"function","identity":"public.foo(integer, text)"},
    {"kind":"table","identity":"public.bar"}]'::jsonb);
```

**Before, never after, and the ordering is the whole mechanism**: the function derives the down
from the objects' **live prior state** — an object that does not exist yet downs to a drop by
identity; an existing function downs to its captured definitions **plus** the stale-overload drop
and the `count(*)` assertion `.claude/rules/supabase-function-signature.md` requires; an existing
view downs to `CREATE OR REPLACE` with its captured definition. Run it afterwards and it captures
the state your up just wrote, which is a down that restores the bug. It writes its own
before-image (§19v), so the call is the whole of your obligation.

**A `refused` classification is a RESULT, not an error to work around.** Grants/ACL changes and
in-place `ALTER`s of an existing object come back refused, on purpose — re-applying an exploded ACL
correctly is `.claude/rules/supabase-column-grants.md`'s entire subject and a wrong one is a live
exposure. The consequence is stated rather than hidden: a red range containing that migration is
**card-only**, so the ship is not auto-rollbackable and step 8a says so on the card. That is the
fail-closed direction, and it is not a reason to hand-write a down instead — a hand-authored down
is the *"authored from memory"* the design forbids.

**You still call it for a migration you expect never to roll back.** The capture is what makes a
LATER cycle's red range reversible, and the cost is one statement; the cycle that skips it is not
the cycle that pays. Nothing back-fills it — `capture_migration_down` reads prior state, and after
the up that state is gone. **Model discipline (John, 2026-08-20, register B21):** you are the Opus 5
orchestrator — delegate by task shape via the Agent tool: judgment-dense steps (kickoff design
for P1–P5 work, root-cause diagnosis, invention scoring, P1–P4 classification) to a
**Fable 5** subagent (`model: claude-fable-5`); mechanical steps (doc sweeps, imports,
formatting) to a **Sonnet 5** subagent (`claude-sonnet-5`). State the clone's absolute path in
every subagent prompt. Attempts-per-tier ≤ 1 — a failed attempt re-runs that piece one tier
up or files a gated-before-build item; never grind. If the Agent tool is unavailable in this
environment, note that in the cycle row and continue on Opus 5 — the first cycle to try it is
the verification.

**A subagent that has not returned is not a result (`SES-83` (d) cycle 4, corrected `v7.0.117`).**
A delegated probe that is still `running` at close-out has told you **nothing** — not "blocked",
not "slow", not "failed". Cycle 4 read ~21 minutes of silence from a background probe as evidence
of a block, wrote that reading into the ledger, `CLAUDE-STATE.md`, `docs/SESSIONS.md`, the briefing
and a push notification, and closed. The agent then returned **success**: three tool calls, no
denial, no prompt — 2,090,008 ms of latency, not a block. Delegating the probe was right and is
what made the error recoverable; converting its silence into a finding was not. So: **either wait
for the agent, or report the question as still open** — never a third thing. Two mechanics make
waiting cheap, and a cycle that delegates anything load-bearing should use both: (1) have the
subagent append a one-line `STARTING …` / `RESULT …` breadcrumb to a scratchpad file **outside**
the paths under test after every step, so a hang still leaves evidence of exactly which step hung;
(2) block on the breadcrumb with a bounded background wait rather than guessing from elapsed time.

**7. QA bar, then ship at ONE ship point.**
- `npm install && npm run build` green (a `src/`/`api/`/`lib/` change that fails build never
  ships).
- The regression suite green where it applies (`tests/regression/run-all.js`).
- A **discriminating** self-QA on the new path — state the test, then ask: would it still pass
  if the change did nothing? If yes, it is not QA. Prefer live end-to-end; a seam proof
  (import the repo's own module against real Supabase) is acceptable and **must be labeled a
  seam proof** in the evidence. Every Supabase write your QA makes gets a before-image row
  first and is cleaned up after.
- Exposure rule: surface-visible work ships behind a default-off flag; fixes ship live (§19v).
- **The ship is inside THIS cycle's caps — the `files N (+k) / tasks M (+k)` numbers step 5a wrote
  into `notes`, never a remembered 3/4** (`CAP-SCOPE-FILES` / `CAP-SCOPE-TASKS` as amended by
  `SES-122` (c), `v7.0.399`; both rows are `live` and their text is in Section 2 of
  `docs/STANDARDS.md`). Grading a promoted class
  against the bare literals would block a ship the ladder had already paid for; grading an
  unclassed one against someone else's `+k` is the same error pointed the other way, which is why
  the numbers live on the cycle row rather than in anyone's head.
- **7a. THE REVIEWER LANE — get a verdict before you write the ticket's status (`SES-181`,
  `v7.0.247`, migration `ses181_runner_verdicts`).** Run it after the QA bar above and before the
  close-out write. **RENDER `CLAUDE-STATE.md` FIRST — it is the first line of this step, not part of
  the close-out below (`SES-213`, `v7.0.299`):**

```
SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/render-claude-state.js
SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/verifier.js \
  --cycle-id=<your cycle id> --ticket=<TICKET-ID> --version=v<your version>
```

  **THE VERDICT IS THE LADDER'S INPUT (`M6-07`, `SES-122` (a), `v7.0.397`) — run this the moment
  the verifier prints `recorded as runner_verdicts <id>`:** an `approve` promotes the ticket's work
  class (streak +1, and a rung on every fifth), a `block` resets that class's streak and **leaves
  its rung exactly where it was** — a red gate is the verifier's judgment on one ship, never John's
  reversal of a delivery, so it costs the streak and not the rung — and the call is idempotent per
  verdict, so a re-run counts nothing twice.

```sql
SELECT * FROM public.verdict_ladder_signal('<verdict id>');
```

  **WHY THE RENDER MOVED UP, and it is the whole of `SES-213`: without it the verdict grades a tree
  that is stale BY CONSTRUCTION.** The regression gate spawns `run-all.js` with no `env` of its own
  (`verifier.js`'s `runGate`), so it inherits the credentials on the line above and the *credentialed*
  half of `tests/regression/SES-177-claude-state-renderer.js` runs inside the verifier — and that
  half spawns `render-claude-state.js --check`, which compares the committed `CLAUDE-STATE.md`
  byte-for-byte against what the ledger renders. The render is a pure function of the cycles whose
  `outcome` is already `shipped`; **your predecessor's row does not reach `shipped` until its step-9
  tail, i.e. AFTER it rendered and pushed.** So a cycle that verifies before rendering compares its
  predecessor's file against a ledger that has since gained its predecessor — drift, `[FAIL]`,
  `gate_regression=red`, `block`, on a change that is perfectly sound.

  **Measured, not argued (`SES-213`, `v7.0.299`).** All **26** `block` rows in `runner_verdicts` at
  that ship carried the identical triple `build=green / regression=red / hygiene=green`, against 30
  `approve` rows carrying all-green — and the discriminator is exactly whether the predecessor
  shipped: a predecessor that closed `gated_before_build` or `did_not_run` never joins the shipped
  set, so the file still matches and the gate is green. The building cycle watched the transition
  happen to it on an unedited tree: `--check` **exit 0** at `23:44Z`, cycle `dc047a05` closed
  `shipped` at `23:46:57Z`, `--check` **exit 1** minutes later with **zero file changes** in between.

  **THE EDIT THIS FORBIDS, and it is the tempting one:** moving this render *inside*
  `scripts/verifier.js` so no cycle has to remember it. That script's founding property is
  verdict-only — *"this script CANNOT EDIT… touches no file in the tree"*, its own header and charter
  Multi-agent verification item 1 — and spawning a file-writer is that invariant laundered, not kept;
  it would also have the verifier grade a file it had just authored. The usual argument wins the
  other way here (*a rule each cycle must remember is a rule that gets silently forgotten* —
  `record_skip`'s precedent, eight times over) because **the fail directions are asymmetric**:
  forgetting this line reproduces exactly the old behaviour — a spurious block, ship `delivered`,
  card John — which is loud, fail-closed and visible on the scoreboard, **never a false approve**. A
  render that itself fails (exit 2) leaves the file untouched and produces the same honest block;
  note it and carry on.

  **What this does NOT claim.** It shrinks the staleness window from *one whole ship, by
  construction* to *a peer closing `shipped` in the seconds between your render and your verdict* —
  under parallel cycles (register B42) that race is possible and is named rather than claimed away.
  And two close-out writes still land after the verdict in **every** legal ordering, because they
  must: `BACKLOG-SNAPSHOT.md` has to be exported *after* the ticket status write it captures, and the
  `docs/SESSIONS.md` entry is hand-written at close-out. Neither is gate-checked, so neither costs a
  verdict today — written down so the next reader does not mistake it for an oversight and "fix" it
  by moving the status write above the verdict, which would break the auto-done bar below.

  Exit **0** = `approve` (all three mechanical gates green), **1** = `block`, **2** = *the verifier
  could not run* — note that in the cycle row exactly as a failed export is noted, and never treat
  it as either verdict. **THE FAIL-CLOSED RULE HAS TWO HOMES ON PURPOSE — `verdictFor()` in the
  script AND `ck_runner_verdicts_fail_closed` in the database — because this script will not stay
  the only thing that inserts a verdict row** (`SES-181`, `v7.0.247`; relocated out of that ship's
  retiring header stamp by `SES-213`, `v7.0.299`, because it was the one warning in that pile with
  no copy anywhere in this body — the `SES-164` step that makes a trim safe). Writing the status
  test as `exitCode !== 1`, or defaulting an absent gate to pass, approves a change whose build
  never ran. **The three gates, the fail-closed rule (`skipped` is not `green`) and the
  eligibility test live in `scripts/verifier.js`'s header — cited here, not restated**, so these two
  files cannot drift the way step 5 and step 7 did before `v7.0.114`.

  **AND WHAT `runner_verdicts.reasoning` MUST CONTAIN — relocated verbatim in substance out of the
  retiring `v7.0.299` stamp by `SES-182` slice 2, because it was the one warning in that pile with
  no copy anywhere in this body (the `SES-164` step that makes a trim safe).** The row must record
  *what the gate blocked on*, and the obvious `res.stderr || res.stdout` does not: `run-all.js`
  prints `[FAIL] <file> -- <message>` on **stdout** while the ubiquitous `GATE_BYPASS_SECRET`
  warning is a `console.warn` on **stderr**, so a stderr-preferring tail recorded the warning and
  never the failing test on all 26 block rows to date — a ledger that could not say why it blocked.
  `summarizeGateOutput()` is therefore **pure and exported**: it reads BOTH streams, prefers
  `[FAIL]` lines over lines that merely came last, and stays bounded by the named `DETAIL_CAP`
  (the retired literal `400` truncated mid-failure). Keeping it pure is the load-bearing half —
  the retired tail was buried inside `runGate()` and observable only through a real 20-minute gate
  run, which is exactly how it survived 26 rows. Do not inline it back.

  **A `block` IS NOT A WALL AND MUST NOT BECOME ONE.** John's split on card `10de5fb5`, verbatim:
  *"verdict-only… completes nothing, blocks nothing, scoreboard visible."* At verdict one a block
  means what a cycle already did — ship `delivered` and card John — so no step may use exit 1 to
  abort a push. The verdicts exist to be compared against his own taps; a lane that started by
  blocking would be earning authority it has not measured.

  **AND THE ONE THING IT DOES CHANGE: the auto-done bar, which is now LADDER-DRIVEN.** When the
  verdict is `approve` **and** the run reports `auto_done_eligible`, the close-out status below is
  **`done`**, not `delivered`, and the recompute releases the ticket's queue number. Anything else —
  a block, an ineligible ticket, an exit 2 — writes `delivered` exactly as before.

  **What makes a ticket eligible is a MEASUREMENT, not a class name (`SES-122` (b), `v7.0.398`).**
  The M6 gate — `docs/RUNNER-GOV-M6-REQUIREMENTS.md`, *"What M6 promises"*, promise 2, decided
  2026-09-02 on `SES-122`'s own row — ruled that *"a rung buys auto-done eligibility for its class"*.
  So the bar is: **the ticket's class is eligible when its work class's rung ≥
  `runner_settings.auto_done_rung`**, read from `public.class_autonomy(priority_class)`
  (`SES-122` (a), `v7.0.397`) and never re-derived by the caller — that comparison has one home and
  it is that function. **A rung is a fact about the work CLASS, not about the epic**, so a promoted
  class takes the bar wherever its ticket sits: `tooling` is at rung 13 against `auto_done_rung` 3,
  so a `P10 - Tooling` ship auto-dones on any epic, while `bug_fix` is at rung 1, so a
  `P9 - Bug Fixes` ship stays `delivered` — Selfbuild epic or not — until that class earns rung 3.

  **Charter decision 2 and §2f are RETAINED AS THE FLOOR, not repealed.** A class the ladder has
  *not* promoted still falls through to the older path, unchanged: `docs/SELFBUILD-CHARTER.md`
  decision 2 (John, 2026-08-23) approves auto-accept for *this project's* `P10 - Tooling` deliveries
  and says so in its own text — *"supersedes SES-154's John-only-writer rule **for this epic family
  only**; general graduation is M6's gate."* — with the Prime Directive's §2f widening on top of it
  (`SES-243`) while the directive stands. This whole block is a **named exception to `SES-154`, not a
  repeal of it**. The scope is enforced in the script by reading the ticket's epic and class **off the
  board** and the rung **off the ladder**, never off a flag the cycle passes itself. The ship card is
  filed either way, so **Reverse is always one tap** — an auto-`done` ticket John reverses reopens
  exactly as any other.

  **AND UNKNOWN IS NOT INNOCENT ON EITHER LOOKUP.** No class on the board, a class the ladder does
  not track, a failed `class_autonomy` call, absent credentials — every one of them leaves the ladder
  grant OFF and falls to the floor above; none of them widens anything. The `auto_done_reason` the
  run prints and stores says WHICH of those it was, because *"the ladder declined"* and *"nobody
  asked the ladder"* are different facts about a ticket that stayed `delivered`, and that column is
  the only place either survives. `class_autonomy` reports an untracked class's rung as **NULL, not
  0** — rung 0 is a real rung, `invention` sits at it — so a blank rung is never read as the bottom
  one.

  **A CYCLE MAY NOT AUTO-DONE ITS OWN VERIFIER WORK — AND YOU DO NOT HAVE TO REMEMBER THAT.**
  Charter, item 3 of the project's own premises: *"no change certifies itself; a fresh-context
  verifier must pass it."* A delivery whose diff touches `scripts/verifier.js` or either of the other
  two gate scripts is graded by the very code it changed, so the bar is unavailable to it — the
  script reads its own diff (`SELF_CERTIFYING_PATHS`) and reports `auto_done_eligible` false with
  that reason. **It is in the code and not in this paragraph deliberately**: this file records eight
  times over that a rule each cycle must remember is a rule that gets silently forgotten, and the
  cycle most likely to forget this one is the cycle editing the verifier. A diff git cannot read
  fails the same direction — unknown is not innocent. `SES-181`'s own ship was refused the bar it
  shipped, by the check it shipped. **A RUNG DOES NOT BUY PAST THIS (`SES-122` (b)):** the ladder
  grant above skips the epic and class tests and nothing else — charter premise 3 is not a class
  rule, so no amount of earned autonomy reaches it. `SES-122` (b) is its own witness: `tooling` sat
  at rung 13 and its diff touched `scripts/verifier.js`, so it was refused the ladder-driven bar it
  had just built.

- Close-out ticket update — **a Supabase write, not a file edit** (`SES-83` (d) cycle 3,
  `v7.0.114`): set the ticket's `backlog_items.status` (and `priority_class` if it changed) with a
  `runner_before_images` row first. **THE STATUS YOU WRITE IS `delivered`, NEVER `done` (`SES-154`,
  `v7.0.205`; spec `docs/design/BRIEFING-COMMENTS-0823-DRAFT.md` decision 1, John "yes"
  2026-08-23) — **with exactly one named exception, step 7a's auto-done bar, which since
  `SES-122` (b) (`v7.0.398`) is the M6 gate's ladder rule — a work class whose rung has reached
  `runner_settings.auto_done_rung`, on any epic — over the charter's own `Selfbuild` / `P10 - Tooling`
  carve-out as its floor, and applies only on an `approve` verdict the verifier reports eligible.**
  A ship is the runner saying it finished;
  `done` is John saying he accepts it, and outside that carve-out
  only the step-9 harvest of his Accept writes that. This is the whole of acceptance-gated
  completion, and the bit that makes it more than a rename: **you do not wait.** The card goes on
  his page, the ticket sits `delivered`, and the cycle moves on to other work — a delivered ticket
  is stepped past at step 5 (the blocked-prefix table) and is excluded from drain picks in SQL, so
  it can never be re-picked while it waits. Use `partial` exactly as before for work that genuinely
  stopped half-done; `delivered` means *finished and awaiting his verdict* — **and LEAVE THE CLAIM ALONE here: it is released after the
  push, in its own statement below (`SES-106`, `v7.0.150`).** This bullet used to read *"and
  clear the claim in the same UPDATE (`claimed_by = NULL, claimed_at = NULL`)"*, which
  contradicted the re-assertion gate two bullets down — a cycle cannot treat the claim as a hard
  gate on the push after its own close-out has already dropped it. John settled the order
  himself (`q-claim-release-order`, **yes**, 2026-08-21T22:05Z): release after the push. **Then run
  `SELECT public.recompute_backlog_queue();`** — completed/removed is one of B4's recompute
  events (`SES-86` phase 2, `v7.0.130`). It is idempotent and returns 0 when nothing moved, so
  running it is never wrong. **What it will NOT do any more, and that is deliberate: your ship no
  longer strips the ticket's number (`SES-154`, `v7.0.205`).** This clause used to read *"and a
  ticket that just went `done` must lose its number before John sees the board"* — true of `done`,
  and exactly wrong for `delivered`. A delivered ticket is awaiting his verdict, so it **keeps its
  queue slot**, for the same reason a `removal proposed` one does (`SES-113`): he can still see it
  in the §8 matrix while he decides, and his Accept becomes zero-motion re-entry rather than a
  renumber. So `recompute_backlog_queue()` is **unchanged** by `SES-154` — measured on a fixture
  rather than assumed: a delivered ticket sitting at queue 2 was still at queue 2 after a recompute
  that moved 0 rows. The number is released when the tail's Accept harvest writes `done` and runs
  the recompute there. This line used to read "`FEATURES*.md` row (status + P-class)"
  and was left behind by cycle 2's trim — those files hold no ticket rows to edit, so it
  contradicted this same runbook's step-5 selection query. A cycle that still edits a
  `FEATURES*.md` row is writing to a stub.
- Close-out edits in the same commit set: **`CLAUDE-STATE.md` is GENERATED — do not hand-edit it
  (`SES-177`, `v7.0.228`).** Set your cycle row's `version` (and `push_sha`) and run
  `SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/render-claude-state.js`; the version lines and
  the three session bullets are derived from `runner_cycles` joined to your ship card's
  `plain_after`/`plain_worth`, so **a cycle that leaves `version` NULL renders itself as "(no version
  claimed)"** — that is the row being wrong, not the renderer. The standing "Next session" prose now
  lives in `docs/runbooks/standing-brief.md`, is maintained **by hand**, and the renderer **refuses
  (exit 2) rather than emit a file that would lose the link to it** — John's condition on gated card
  `37b22393`. **You have ALREADY RUN IT — it is step 7a's first line since `SES-213` (`v7.0.299`),
  and re-running it here is a deterministic no-op** (nothing between the two touches its inputs: the
  status write below is to `backlog_items`, which the renderer never reads). Run it here only if you
  skipped 7a's copy.

  **It renders the last three cycles whose `outcome` is already `shipped`, and your own row does not
  close until the step-9 tail — so the file you commit still does not carry YOUR OWN ship, and the
  next cycle's render is what adds it.** That much is inherent and unchanged. **What `SES-213` closed
  is the different, harmful half:** the file used also to be missing your *predecessor's* ship at
  verdict time, which made the regression gate red by construction on every cycle that followed a
  ship — 26 of 26 blocks. Rendering at 7a folds the predecessor in **before** the gate reads the
  file, so the lag that remains is only ever your own row, which no gate checks. Do **not** "solve"
  the remainder by writing `outcome='shipped'` before the tail: the check constraint has no
  in-progress value and an early close is how a cycle ends up recorded as
  finished work it has not finished. Then: `docs/SESSIONS.md` entry (still hand-written — it is the
  history home), and version-header comments on touched files.
- **Backlog snapshot (SES-83c, `v7.0.107`) — in the same commit set, every ship:**
  `SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/export-backlog-snapshot.js` (both values
  from `runner_secrets`, exported as env, never written to a file). It regenerates
  `docs/backlog/BACKLOG-SNAPSHOT.md` from `public.backlog_items` — the table's only repo-side
  copy, which is what makes the board restorable and gives its history a git log. The output is
  deterministic (no timestamp in the body; provenance is the ticket count + a payload `sha256`),
  so a cycle that changed no ticket prints `unchanged`, writes nothing, and commits nothing —
  a diff here always means the board actually moved. Exit **2** is "could not run" (missing env,
  PostgREST error), never a pass: treat it like any other failed check — investigate, and if the
  export cannot run, say so in the cycle row rather than shipping a silently stale snapshot.
  `--check` (exit 1 = drift) is the read-only form for a cycle that wants to know whether the
  snapshot is current without writing it. **This step-7 export captures the board through your
  own close-out (the ticket you just set `delivered`, its recompute) but NOT John's harvest — those
  writes land in the step-9 serial tail, AFTER this push — so a step-7-only snapshot is
  systematically one harvest stale (`SES-109`, `v7.0.149`, found live by cycle `ff23297c`). The
  tail re-exports it once the harvest has landed; see the tail's snapshot sub-step below. Do NOT
  try to close the gap by moving the harvest earlier: B42 put those writes in the serial tail on
  purpose, because they race under parallel cycles.**
- **Scoreboard stamp (`SES-303`, `v7.0.382`, John's Shape B) — every ship, immediately after the
  snapshot and before the standing brief, one call, no file:**
  ```sql
  SELECT * FROM public.snapshot_platform_scoreboard('ship', '<ticket>', '<push sha>', <hygiene flag count or NULL>);
  ```
  It writes one `platform_scoreboard` row — no-ship cycles and their tokens this weekly window,
  shipped cycles, tokens per shipped cycle, cycles per shipped ticket, the worst silence between fires
  over 7 days — computed from `runner_cycles` by the function itself; you supply only the hygiene
  flag count from your own tripwire run (`NULL` = unmeasurable, never `0`). This row is the
  ticket's **before**; `public.ticket_outcome` reads the newest row at least 72 hours later as its
  **after** (`M5-12`'s window) and grades the ticket's `enhancement_claim` ("metric: down|up") as
  `held` / `did_not_hold` / `unmeasurable` / `unclaimed` / `pending`, with all five deltas beside it
  so a regression nobody claimed still shows. **Stamp on every ship, claim or not** — a ticket with
  no claim still moves the series, and the series is what the next reviewer reads.
  **`unclaimed` (`SES-309`, `v7.0.390`) means the row never declared a claim** — a filing omission a
  reviewer should see, not a verdict about the work — while `none: <why no scoreboard number
  applies>` is how a ticket declares it has none, and that reads `unmeasurable`. Before `SES-309`
  both collapsed into `unmeasurable`, which is what made the board silent: every chartered ship
  graded the same as a ticket nobody had bothered to file a claim for.
  **TWO WARNINGS A LATER SESSION GRADING A CLAIM WILL OTHERWISE HIT** (relocated here from
  `SES-309`'s retired header stamp by `SES-122` (b), `SES-164` step 2 — they had no other home in
  this file). (1) `ticket_outcome`'s **after** row is the newest scoreboard row ≥ 72 h after the ship
  **across the whole table**, not one matched to the ticket — so a fixture whose after-row is not the
  newest row on the board grades against **somebody else's ship** and reads `did_not_hold` for
  reasons that have nothing to do with the claim. (2) The metric name is not free text: CHECK
  constraint `ck_backlog_outcome_claim` calls `public.outcome_claim_is_valid(text)`, whose seven
  metric names are that function's sole home, so an invented or mistyped metric is **rejected at
  filing** rather than surfacing as a silent `unmeasurable` three days later.
- **Standing brief (`SES-265`, `v7.0.356`) — in the same commit set, every ship, immediately after
  the snapshot:**
  `SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/render-standing-brief.js` (both values from
  `runner_secrets`, exported as env, never written to a file). It regenerates the marked block in
  `docs/runbooks/standing-brief.md` — board census, `design_status` split, scheduler settings and
  the standing drain — from the live tables. Exit **0** = rendered; **1** is `--check`-only drift;
  exit **2** is *could not run* (missing env, REST failure, missing/non-unique markers, a missing
  judgment sentinel, or a head/tail that moved) and is **never a pass** — same convention as the
  export above.

  **WHY THIS HAD TO BECOME A LISTED STEP, and it is the whole of `SES-265`.** `standing-brief.md`'s
  own block has claimed since `v7.0.236` that it is *"rendered from the tables by
  `scripts/render-standing-brief.js` at every ship"* — and **this runbook never invoked it**, so
  nothing rendered it at any ship. Measured at this fix rather than argued: the block was stamped
  `2026-08-24 23:32Z`, **seven days and ~120 versions stale**, and its numbers were not merely old
  but *operationally wrong* — it advertised **9** `needs-john` tickets against a live **32**, a
  standing daily max of **40M** against John's **196M**, and a standing drain of
  **M2, 3 of 10 open** when the live drain is **M5, 11 of 11**. Every session reads that block at
  start. This is `SES-177` (b)'s own defect class reproduced inside the file that shipped to kill it.

  **THE HALF THAT EXPLAINS THE SEVEN DAYS, and it is why the usual argument loses here.** This file
  records eight times over that *a rule each cycle must remember is a rule that gets silently
  forgotten* (`record_skip`'s precedent) — the normal remedy being to put it in code rather than in
  prose. It could not be put in the gate, because **nothing grades this file**:
  `tests/regression/SES-177b-standing-brief-block.js` runs entirely **on fixtures, without
  credentials** (its own header: *"Both run WITHOUT credentials on purpose"*), so unlike
  `CLAUDE-STATE.md` — whose committed copy `SES-177`'s credentialed half `--check`s inside the
  verifier, which is the whole of `SES-213` — a stale standing brief turns **no gate red**. There
  was no failing signal to notice; the only thing that would have caught it is the invocation this
  bullet adds. **Do not "fix" that by adding a credentialed `--check` of the committed file to the
  regression suite**: that reproduces exactly the by-construction red `SES-213` spent a ship
  removing, because the board moves under every cycle and the committed block is stale the instant
  a peer files a ticket.

  **IT GOES HERE, AFTER THE STATUS WRITE — NOT AT STEP 7a BESIDE `render-claude-state.js`, and the
  ordering is load-bearing rather than tidy.** The two renderers look interchangeable and are not.
  `render-claude-state.js` sits at 7a because the verifier's regression gate reads its output, so it
  must precede the verdict (`SES-213`). This one is read by no gate, and its inputs are
  `backlog_items` — **the very table this step's close-out just wrote and recomputed**. Rendered at
  7a it would capture the board *before* your own `delivered` write and ship a census one cycle
  stale by construction: the `SES-109` staleness defect that put `export-backlog-snapshot.js` after
  the status write, arriving one bullet later for the same reason. It belongs beside the snapshot
  because they read the same table at the same moment, not beside the other renderer because they
  are both renderers.

  **What it will NOT do, so a later cycle does not go looking:** it never writes outside its two
  markers — it splices, then compares head and tail byte-for-byte and exits **2** having written
  nothing on one byte of difference. So the hand-maintained judgment prose beneath the block is
  untouched by this step, **including where that prose contradicts the block** (it still says the
  scheduler runs *"3 hours — 12/3/6/9"* against a live `interval_hours` of 1). That disagreement is
  not this step's to reconcile: the block's own line 49 already rules that where the two differ,
  **the block is right and the sentence below is stale — say so rather than reconciling them by
  hand.** Repairing that prose is a hand edit and a separate ticket.
- **PROVE THE VERSION YOU ARE SHIPPING WAS ISSUED TO YOU — a second hard gate on the push
  (`SES-153`, `v7.0.233`, migration `ses153_issued_versions`).** Run it immediately before the
  re-assertion below:

```
SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/check-version-claim.js \
  --version=v<your version> --session=<the string you passed as updated_by_session>
```

  **Exit 1 → do NOT push.** Either the counter never issued that number to anyone (it was
  hand-counted) or it issued it to a **different** session, and pushing it is the collision this
  ticket is written from. Claim one atomically (`session-setup.md` §3) and renumber this work —
  never contest a number already issued. Exit 2 is *could not run* (missing env, REST failure) and
  is **not a pass**: note it in the cycle row exactly as a failed export is noted. Exit 0 with kind
  `predates-ledger` or `ledger-empty` is **not a verified claim either** — say which you got.

  **Why the obvious cheaper check is the wrong one, and must not replace this.** *"Is my version ≤
  `dev_version_counter`?"* does not catch the live case: on 2026-08-23 the attended session
  `successional-review` pushed `v7.0.195` and `v7.0.196`, and **both were ≤ the counter's 196** —
  196 had been issued, just to cycle `c4148d2a`'s claim, not to it. The counter is one row that
  remembers only its last claimant, so only a **ledger** can answer *"issued to whom"*. That ledger
  is fed by a trigger on the counter itself rather than by a step each session must remember,
  because the sessions that cause this are by definition the ones not following the procedure.

  **`issued_to` STAYS FREE TEXT — do not FK it to `runner_cycles`** (relocated verbatim in substance
  from the retired `v7.0.233` stamp by `SES-218`, because it was the one editor warning in that
  stamp with no copy anywhere in this body — the `SES-164` step that makes a trim safe). The FK
  looks right because the adjacent `runner_before_images` already wears one, and it is `SES-150`
  exactly: it would exclude **attended** sessions, which are the only population that has actually
  caused this bug. Runner-up trap from the same stamp: a text-only key does not deduplicate
  `'v7.0.196'` against `'7.0.196'`, and **both spellings occur live** in `runner_cycles.version`, so
  `uq_issued_versions_numeric` is UNIQUE on `(major, minor, patch)`.
  **The ledger starts at `v7.0.233` and was NOT backfilled** — the counter forgets — so anything
  below that floor is honestly reported as not assertable rather than flagged or waved through.
  `--audit` is the sweep form (every `runner_cycles.version` at or above the floor that the ledger
  never issued); its remainders are named on `SES-153`'s ship card.

- **Re-assert the lease, then one batched push.** The re-assertion `SELECT` (step 0) is a **hard
  gate on the push**: run it, and only on 1 row proceed with
  `git fetch origin dev && git rebase origin/dev && git push origin HEAD:dev`. Never
  per-artifact pushes. 0 rows → do not push; follow the stolen-from procedure in step 0. Keep
  the `git fetch` too — it catches a different failure (a successor that shipped without taking
  your lease), and `633fe486` survived on that accident alone.
- **Release the ticket claim — now, once the push has landed, and not one step earlier
  (`SES-106`, `v7.0.150`; John's `q-claim-release-order`).** One statement, holder-guarded so a
  cycle whose claim expired and was re-taken can never clear its successor's:

```sql
UPDATE public.backlog_items
   SET claimed_by = NULL, claimed_at = NULL, updated_at = now()
 WHERE backlog_id = '<your TICKET-ID>' AND claimed_by = '<your cycle id>'
RETURNING backlog_id;   -- 0 rows = already re-claimed by someone else; leave the new holder alone
```

  On an abort or a wall-stop this is still where the release happens, just without a push in
  front of it — release at the point the cycle stops. Nothing here can strand a ticket either
  way: an unreleased claim expires on the 24h boundary.

**7b. Every decision is a row with a handle (`SES-286`, `v7.0.395` — `M6-02`, `M6-05`, `M6-06`).** <!-- FEATURE: SES-286 (b) — the runbook finally calls the ledger part (a) built. -->
Part (a) (`v7.0.394`) shipped `public.runner_decisions`, `runner_settings.reversal_window_hours`,
`runner_before_images.decision_id` and six functions; **this block is where a cycle calls them**,
and until it existed every `M6-*` rule marked `script` was prose. The `SES-184` / `SES-185` gate
decisions, the `SES-82` de-scoping and the 33 `needs-decision` conversions were each "reversible
under `M6-02`" **by the availability of before-images alone** — there was no id to hand back, no
expiry, and no ladder effect. This block is not a step you reach once per cycle: it is the shape of
**every** judgment write, wherever in the cycle you make one.

**WHAT COUNTS AS A DECISION — this is its one home, and every other site cites it rather than
restating the list.** Any write you make **on judgment rather than on a rule's mechanical output**:
resolving a `needs-decision` ticket, deferring one (`defer_status = 'yes'`/`'stuck'`), removing one
under `M6-03`, re-tiering or re-homing it, amending a required set, ruling a gate, amending a
directive. **Not a decision:** step 7's own close-out status write on a green verdict (that is the
verifier's output, and its Reverse lives on the ship card), a queue recompute, a claim, a
before-image, a scoreboard stamp. A decision that files a ticket files it in the same transaction
(`M6-05`).

**ONE STATEMENT — copy this.** It records the decision, images every row the decision is about to
touch, and makes the write, inside one transaction:

```sql
DO $$
DECLARE
  v_dec uuid;
  v_img jsonb;
BEGIN
  -- kind: ticket-status | ticket-scope | gate | removal | directive | settings | rule
  v_dec := public.record_decision(
    '<your cycle id>', NULL,
    '<kind>',
    '<TICKET-ID or NULL>',
    '<one-sentence summary of what you decided>',
    '<the reasoning — what you read, what you ruled, why>',
    public.ladder_work_class('<the ticket''s priority_class, or NULL>')
  );

  -- One of these pairs per row the decision touches, each naming the decision.
  SELECT to_jsonb(b) INTO v_img
    FROM public.backlog_items b WHERE b.backlog_id = '<TICKET-ID>';
  INSERT INTO public.runner_before_images
    (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  VALUES ('<your cycle id>', NULL, 'backlog_items', (v_img->>'id'), v_img, v_dec);  -- pk_value is the row's PRIMARY KEY (the uuid in v_img->>'id'), never the ticket id: reverse_decision() addresses a row by its pk and refuses one it cannot cast (SES-286b follow-up, measured: a ticket-id pk_value reversed nothing and reported refused=1)

  UPDATE public.backlog_items
     SET <the judgment: status / tier / defer_status / scope>, updated_at = now()
   WHERE backlog_id = '<TICKET-ID>';

  RAISE NOTICE 'decision % reversible until %', v_dec,
    (SELECT d.expires_at FROM public.runner_decisions d WHERE d.id = v_dec);
END $$;
```

`record_decision()` raises unless **exactly one** of `cycle_id` / `session_name` is set
(`ck_decision_attribution`): an unattended cycle passes its cycle id then `NULL`, an attended
session does the opposite (`session-setup.md` step 3d). `ladder_work_class()` maps the ticket's
**named** class to the ladder's work class and returns `NULL` for a class the ladder does not track
— pass `NULL` when the decision is about no ticket, and it then finalises without moving any rung.

**WHY THIS IS ONE `DO` BLOCK AND NOT TWO STATEMENTS, and it is load-bearing rather than tidy.**
`now()` is frozen for the length of a transaction, so the image's `created_at` and the row's
`updated_at` come out **equal**. `reverse_decision()` refuses any row whose live `updated_at` is
**later** than the image it would restore from — the restore engine's own predicate, there to stop
a reversal clobbering somebody else's later write. Record the decision in one statement and make
the write in the next, and the row's `updated_at` postdates the image by exactly that gap: the
reversal then counts the row `refused`, restores nothing, and **still returns
`outcome = 'applied'`**. The decision is silently un-undoable, which is the single failure this
mechanism exists to prevent. If images were already written before the decision id existed, do not
redo them — pass their ids to
`public.attach_before_images('<decision id>', ARRAY['<image id>']::uuid[])`, which fills
`decision_id` only where it is still NULL and never re-points an image at a second decision.

**THE HANDLE GOES ON THE TICKET AND INTO YOUR CYCLE `notes`, in these words:**
`Decision <id> — reversible until <expires_at, CST>: select public.reverse_decision('<id>', 'John', '<why>');`
**The handle is the decision id and nothing else** — never a before-image id, never a card id.

**WHAT HAPPENS NEXT, WITHOUT ANYBODY DOING ANYTHING.** Silence past
`runner_settings.reversal_window_hours` — 72 today, and it is a **column, never a literal**
(`SES-146`) — finalises the decision at the next sweep (step 9's `(7b)`) and promotes the work
class it named, by `SES-107`'s streak rule (`M6-07`). A reversal restores the rows the decision
touched, demotes that class, and is itself recorded as a `kind = 'reversal'` row carrying
before-images of everything it wrote, so its effect is recoverable — but `reverse_decision()`
**refuses to reverse a reversal**, by design: re-applying the decision it undid is a NEW decision
and is recorded as one, with its own window.

**THE BOUNDARY (`M6-06`): no `runner_items` card, no escalation, no waiting.** You decide, you
record, you carry the handle, and the cycle moves on. A decision is not a question wearing a
different name: nothing in this block opens a briefing card and nothing in it blocks.

## Phase 3 — evidence

**8. Blocker sweep #2.** Re-run step 4's probe. If your own ship broke dev: revert-forward
immediately, restore your before-images, set the cycle `outcome='reverted'` — it counts as a
Reverse on the ladder.

**8a. AUTO-ROLLBACK ON RED — the sweep that watches a push after its cycle is gone (`SES-182`
slice 1, `v7.0.332`; John's build authorisation 2026-08-30, card `2c136c5b`).** Re-run step 4a's
call, now with the post-push sha. It is the **same command** — the engine decides which of green,
revert, card-or-nothing this is; a cycle never classifies by hand.

**Re-run step 4a-bis here too (`SES-182` slice 3, `v7.0.334`), and mind what it is answering.** CI
grades the commit; the deploy probe grades what the public is actually being served, and after your
own push those are different questions for as long as the build lag lasts — up to 49 minutes,
measured. So a green CI sweep here does **not** stand in for it, and a `serving-green` from it does
**not** stand in for CI: neither writes the other's conclusion, and only step 4a ever writes the
green anchor.

- **`revert-and-card`** → the engine returns a `revert_plan`, possibly a `schema_plan`, and files the
  incident card. **It does not push and it applies no DDL, and must never be given either
  authority:** the claim re-assertion (step 0), the issued-version proof (`SES-153`) and the
  fetch/rebase ladder (B42) all live in *this* step, and a script that reached past them would be
  the `SES-019` shape. Run the plan's command here, behind those same gates, then close
  `outcome='reverted'` **qualified in `notes`** as a sweep rollback. **The outcome vocabulary is NOT
  widened** — `runner_cycles_outcome_check` admits five values and a sixth would give one fact a
  second home.
  **When a `schema_plan` comes back `reversible` (`SES-182` slice 2), apply its steps through
  `apply_migration` AFTER the code revert lands, IN THE ORDER GIVEN — newest-first.** That order is
  not cosmetic: downs applied oldest-first re-create what a later down expected gone. The plan is
  all-or-nothing by construction (`steps` comes back empty whenever any member is missing), so
  there is never a subset to exercise judgment about.
- **`card-only`** → the card is the whole action, and the card **names** what stopped it. A range
  carrying a migration is card-only whenever **any** member of it lacks a stored `auto-downable`
  down — never captured, captured and `refused` (grants/ACL and in-place `ALTER`s are refused
  deliberately), or the list simply not supplied. **There is no partial schema rollback:** a schema
  half-undone is a state no green anchor describes, so an un-rolled-back migration plus a loud card
  is the recoverable direction and a guessed down applied to production is not.
- **`none`** → nothing to do, silently. A red on a push no cycle claims is an attended session's or
  a stranger's, and the machine yields to humans.

**A red verifier verdict is NOT a trigger, and this is John's ruling rather than the engine's
taste** (2026-08-30, card `2c136c5b` Q1): auto-revert fires on **CI-red and deploy-red only** —
facts — while a verifier `block` **freezes the ship and cards John** — judgment. His reason is a
measurement: the lane's first 15 recorded blocks were all false (`SES-213`), so revert power waits
for an earned track record, which is M6's graduation subject. **The edit this forbids:** adding a
verdict trigger to `decide()`. It is refused in code (`TRIGGER_SOURCES`) and pinned by
`tests/regression/SES-182-rollback-on-red.js`, whose control runs the *same* facts under both
triggers and asserts they differ.

**8b. Heal sweep (`SES-89`, `v7.0.108`) — detect, file, never fix.** Run the Heal engine over the
platform's own failure ledger and let anything recurring become a normal queued ticket:

```
SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/heal-engine.js --json
```

Exit **1** means the dry run has **unfinished work for you to apply**, and since `SES-308`
(`v7.0.389`) it means either of two things: it found recurring failure signatures that are over
threshold, **classified `product`** (`SES-276`), and not yet filed; **or** it computed
fix-confirmation **verdict**s that are not yet persisted (`pendingVerdicts > 0` in the JSON). Exit
**0** is "nothing new **and** nothing pending" — the normal, quiet case. Exit **2** is "could not
run" (missing env, REST failure, `--apply` without a cycle id, or `--apply` with signatures to file
and no ids): note it in the cycle row and never treat it as a pass.

**On ANY exit 1, re-run with `--apply --cycle-id=<your cycle id>`.** Add `--backlog-ids=LOO-<n>,…`
**only** when the dry run's JSON `detections` array is non-empty — that and only that is when you
first claim an id block of that size in **one** `feature_id_counter` call (SQL:
`docs/runbooks/session-setup.md` §3b). A verdict-only apply needs **no ids and must not claim
any**: there is nothing to file, so a claimed block would be burnt. List any filed `LOO-` ids in the
cycle row's notes and on the briefing, and quote `pendingVerdicts` there too.

**THE EDIT THIS STEP FORBIDS, and it is the tempting shortcut because it needs no code (`SES-308`,
`v7.0.389`; relocated out of that ship's retiring header stamp by `SES-122` (a), `v7.0.397`,
because it was the one warning in that pile with no copy anywhere in this body — the `SES-164`
step that makes a trim safe):** making this step re-run `--apply` **unconditionally, every cycle**.
That turns a read-only sweep into a writing one on every fire, and `--apply` is the branch that
files tickets; the whole reason the dry run exists is that **detection never auto-fixes**. Exit 1 is
a **signal**, and the dry run still writes NOTHING — asserted, not assumed.

**WHY THIS PARAGRAPH CHANGED, and it is the whole of `SES-308`.** This step used to say exit 1
meant signatures to file, and *"only then"* re-run with `--apply`. But **a confirmed fix is by
definition a run with nothing new to file** — the failure stopped, so there is no detection — and
the dry run therefore exited **0** and no unattended cycle ever re-ran with `--apply`. The verdict
was computed, printed in the engine's `fix-confirmation:` line, and discarded, every cycle, since
`SES-276`. Measured at this ship rather than argued: every row in `public.runner_heal_signatures`
carried `updated_at = 2026-09-02T16:14:42Z` — the one supervised `SES-277` drill cycle — so **no
unattended cycle had ever written signature state at all**. Two things shipped with it: a signature
already in state `recurred` no longer re-reports the same reappearance on every run (it would have
made every fire re-apply and re-increment `recurrence_count`), and `--apply` no longer demands
`--backlog-ids` up front — that gate ran *before* the nothing-to-file branch, so the verdict-only
re-run this paragraph now instructs would have exited 2 every time.

**Since `SES-276` (`v7.0.372`) this is heal v2, and three things about the step changed.**

- **It reads THREE streams, not one.** `durable_hops`, `ci_run_conclusions` and `runner_cycles`,
  all normalised behind one failure record. The M4 gate review found v1's single input had gone
  dead; re-measured 2026-09-02, `durable_hops`'s newest row of any status was **2026-08-23** while
  `ci_run_conclusions` was live through that morning with 32 of 57 rows carrying a failed job.
  **`durable_hops` is kept** — dead today, not retired — and the run reports its zero rows as a
  measured zero (`durable_hops 0→0`), never as absence.
- **Every record is classified `product` / `process` / `unclassified`, and only `product` may
  file.** `process` is the runner's own noise (a known race, listed with its evidence in
  `KNOWN_RUNNER_RACES`); `unclassified` is a record the row cannot decide. **Neither ever files.**
  A signature whose members disagree collapses to `unclassified` — mixed evidence is not evidence.
- **Fix-confirmation exists.** `public.runner_heal_signatures` (migration
  `ses276_runner_heal_signatures`, down registered `auto-downable`) holds one row per signature. A
  filed signature that goes quiet for `confirmation_window_days` (default 7, the named constant
  `DEFAULT_CONFIRMATION_WINDOW_DAYS`, **persisted per row so a verdict carries the window that
  produced it**) is recorded `confirmed_fixed`; a reappearance is recorded as a **recurrence against
  the original**, never filed as a duplicate. That table is `SES-303`'s read seam for outcome
  telemetry — join `backlog_id` to `state` / `confirmed_fixed_at` / `recurrence_count`, no parsing.

**Read-only means read-only.** A run without `--apply` writes nothing to any of the three tables it
can write (`backlog_items`, `runner_before_images`, `runner_heal_signatures`). Proven at the
`SES-276` ship: two full dry runs against live data left `runner_before_images` at 3,790,
`backlog_items` at 785 and `runner_heal_signatures` at 0.

**What that first live run reported, recorded because a zero is a result:** 38 records in the
14-day window — `durable_hops 0→0`, `ci_run_conclusions 58→32`, `runner_cycles 6→6` — classified
**0 product / 9 process / 29 unclassified**, 6 signatures, **0 tickets it would file**. The 9
`process` are the three CI runs where the runner was grading its own in-flight close (`SES-261`)
and all six failed cycles (stall-watchdog closes, closed-by-successor, one lease race). The 29
`unclassified` are reds on the blocking `Tripwire + regression` job: that one job runs BOTH the
governance-doc tripwire (process) and the regression suite (product), and `ci_run_conclusions.jobs`
records **job-level conclusions only**, so the row cannot say which half failed. **Do not "fix"
that by promoting not-runner-pushed reds to `product`** — 29 of the 32 live CI failures are exactly
those, and they are the doc-drift and race noise the PM lens warned about. What promotes a CI red
to `product` is a failing job that cannot be produced by runner state, i.e. `Build (blocking)`.

Four things this step deliberately does:

- **It reads `durable_hops`, not `ai_activity_log`.** The `SES-89` ticket said the latter; verified
  live 2026-08-20, `ai_activity_log` has 34,449 rows and **no status or error column at all**, so
  there is no error rate in it to read. `durable_hops` is the real ledger: 260 `failed` rows, all
  260 carrying classifiable error text. Regression trends and Vercel logs were dropped for the same
  reason — nothing persists them to query. (`SES-276` widened the inputs beside it; it did not
  reopen this.)
- **It never mints its own ticket id.** The atomic block claim is an `UPDATE … RETURNING` with
  arithmetic, which PostgREST cannot express and this project has no RPC for. The cycle claims the
  block through the connector and passes it in — that is what keeps CLAUDE.md's atomic-counter rule
  intact instead of quietly hand-counting.
- **The INSERT before-image convention starts here.** Every prior `runner_before_images` row records
  an UPDATE and carries the old row in `row_data`. A heal filing is an INSERT, so there is no prior
  state: it writes `row_data = NULL`, meaning **"this row did not exist — Reverse is a DELETE of
  this pk."** The before-image is written first and its success is what authorises the ticket
  insert (§19v: no before-image, no write).
- **Feature-owns-its-bugs still binds (§19v).** A failure caused by *this* cycle's own ship is
  sweep-#2 and revert territory, never a ticket — filing a bug in the thing you just built is a QA
  failure wearing a ticket's clothes. Only pre-existing signatures are legitimate here.

Heal tickets are `P9 - Bug Fixes` in tier `now`, live in `backlog_items` only (`source_file =
'heal-engine'`), and ride the normal queue — **the fix runs the full ceremony in a later cycle.**
Since `SES-83` (d) (`v7.0.112`) selection reads the table, so a heal ticket is pickable the moment
it is filed — it does **not** need to appear in `FEATURES.md` first, and it never will; the
snapshot export (step 7) is its git-committed copy. **`source_file='heal-engine'` must go on the
ignore-list of any future markdown→DB reconciliation**, or it will delete every heal ticket as an
orphan.

**8b-bis. Tripwire sweep (`SES-205`, `v7.0.301`) — same shape as 8b, one line further on.** The
truth tripwire's `FLAG` findings become `backlog_items` rows instead of console output nobody
re-reads. Run it right after the heal sweep:

```
SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/tripwire-to-backlog.js --json
```

Exit **1** means eligible check classes are not yet filed. Only then, claim an id block of that
size in **one** `feature_id_counter` call (prefix `SES`; SQL: `docs/runbooks/session-setup.md` §3b
— never one id and a hand-count, `SES-18`) and re-run with
`--apply --cycle-id=<your cycle id> --backlog-ids=SES-<n>,…`. Exit **0** is "nothing new" — the
normal, quiet case. Exit **2** is "could not run" (missing env, REST failure, `--apply` without a
cycle id or ids): note it in the cycle row and **never treat it as a pass**. List any filed ids in
the cycle row's notes and on the briefing.

Four things this step deliberately does, each of which is how it gets rebuilt wrong:

- **It files ONE row per CHECK CLASS, never one per finding.** Measured at this ship: 48 `FLAG`
  findings, **45 of them check 3d alone**, collapse to four tickets. One per finding buries the
  board rather than surfacing it — `SES-205`'s own boundary, and the figure got worse rather than
  better between its filing (18 of 33) and its build (45 of 48).
- **The signature is the CHECK ID, not the detail.** Check 6's detail carries a KB figure that
  moves on every ship; a detail-keyed hash files a new ticket every run, which is this ticket's
  defect one level down. Do not "strengthen" the key by folding the detail back in.
- **`WARN` never files, and a GATING check never files.** The tripwire itself calls its WARNs known
  and deferred (*"compliant, nothing to do"*, *"not new drift"*), and a gating `FLAG` already fails
  CI at `--gate` — it cannot go unnoticed, and unnoticed is the whole of what this step fixes. The
  gating set is **imported** from `check-session-docs.js`, so widening `SES-199`'s policy widens
  this exclusion with it and the two cannot drift.
- **Same three boundaries as 8b, unchanged:** it never mints its own id, it writes a
  `runner_before_images` row (`row_data = NULL`) before every insert and only its success
  authorises the write, and **filing is not fixing** — rows land `open` / `next` /
  `P10 - Tooling` and run the full ceremony in a later cycle. `source_file='tripwire-to-backlog'`
  joins `'heal-engine'` on the ignore-list of any future markdown→DB reconciliation.

**Known limitation, stated rather than hidden — it is heal-engine's, inherited deliberately:** the
dedup matches **closed** tickets too, so a check that files once never files again even if its
member set later turns over completely. That is the right default for an unattended loop, and the
live list is always one command away (`node scripts/check-session-docs.js`). Guarded by
`tests/regression/SES-205-tripwire-backlog.js`.

**THE EDIT THIS FORBIDS: flipping a registry row back to `live` to silence a flag.** <!-- FEATURE: SES-310 — two SES-289 editor warnings with no body home, relocated beside the mechanism they concern. -->
Relocated here from the `SES-289` stamp by `SES-310` (`v7.0.393`) under `SES-164` step 2, because it
appeared **nowhere** in this body. Checks 9/10/11 read the rule registry through
`docs/governance/RULES-SNAPSHOT.md` and flag a withdrawn rule still stated in **live voice** — and
the checker's own *other* suggested remedy is to flip the offending registry row's status back to
`live`. Taking it would undo `SES-285`'s withdrawals by the back door: those rules are genuinely
withdrawn, and a document is never evidence about a rule's status. **The only legitimate ways to
clear one of these flags are to annotate the passage** — naming the rule id, its state, the
superseding rule, the ticket and the date, in the passage's own voice — **or to rewrite the procedure
once a replacement mechanism actually exists.** Never edit the registry to quiet a document.

**THE MECHANICAL TRAP THAT MAKES SUCH AN ANNOTATION SILENTLY USELESS, same relocation:** check 9
decides within an **enclosing block** — a blank line, a list item, a heading, or a bold lead-in at
line start each begin a new one — so a retirement marker must sit in the **same block** as the
rule-id mention it annotates. An annotation placed on a following line that itself begins with `**`
starts a *new* block and leaves the mention bare, still flagging, while looking done. Every marker in
this file therefore carries its vocabulary (*superseded* / *retired*) on, or beside, the mention's
own line.

**AND A LOCAL GREEN ON CHECKS 9/10/11 IS A FALSE GREEN ON A WINDOWS CHECKOUT.** <!-- FEATURE: SES-286 (b) — the one SES-300 editor warning with no body home, relocated under SES-164 step 2 rather than archived with its stamp. -->
Relocated here from the retiring `v7.0.368` stamp by `SES-286` (`v7.0.395`) under `SES-164` step 2,
because it appeared **nowhere** in this body. Those three checks are line-ending sensitive; this
repo checks out **CRLF** on Windows and CI checks out **LF**, so a run against an attended
worktree's working copy can report clean on a commit CI then flags. Proven live in `SES-289`: **0
flags local, 4 in CI, same commit.** Verify on an LF snapshot (`git -C <worktree> archive HEAD` into
a scratch directory, or `git show HEAD:<path>`) or read CI — never take the local run as the answer.

**8c. Background revalidation sweep (`SES-87` — the revalidation flow, register B7 — superseded
2026-09-01 by `M6-03`, `SES-285`, annotated `SES-289`; the revalidation half of B7 is unchanged and
still binds, only its *"no unattended removal"* clause was replaced — a premise that fails twice
consecutively now removes its ticket automatically, reversible inside its 72-hour window) — on spare
capacity, never instead of the build.** Query the sinking tail — age triggers, premise decides:

```sql
SELECT backlog_id, queue, left(title,80) AS title
  FROM public.backlog_items
 WHERE status NOT IN ('done','removed','removal proposed')
   AND (revalidated_at IS NULL OR revalidated_at < now() - INTERVAL '30 days')
   AND updated_at < now() - INTERVAL '30 days'
 ORDER BY queue DESC NULLS LAST
 LIMIT 3;
```

Also sweep, regardless of age, tickets whose text hits retired vocabulary (`Beta-gate`,
`Post-beta`, "FEATURES.md row", the pre-rename class digits) — a retired-vocabulary premise is
the cheapest death to detect. For each (≤3 per cycle): premise still real → `revalidated_at =
now()`, nothing else; premise dead → `status = 'removal proposed'` + briefing card with
evidence + queue recompute. **No unattended removal, ever** — `removed` is written only by
harvesting John's Accept on the card. Card harvest rules (in the step-9 tail): **Accept** →
`status='removed'`, queue recompute (terminal); **Reverse** → prior status restored,
`revalidated_at = now()` (the 30-day quiet); **Rework** → his line rewrites the description,
ticket re-queues.

**THE `M6-03` PATH — A SECOND CONSECUTIVE FAILED REVALIDATION REMOVES THE TICKET, AND THAT REMOVAL
IS A DECISION ROW (`SES-286`, `v7.0.395`).** <!-- FEATURE: SES-286 (b) — 8c's automatic removal gets its handle. -->
Record it per **7b** — one `public.record_decision()` call in the same transaction as the status
write: `kind = 'removal'`, `backlog_id` = the ticket, the reasoning naming both failed
revalidations, and the before-image of that status write carrying the returned `decision_id`. Then put the handle on the ticket. **The window is what makes acting on the second
failure safe** — the removal executes now and John can undo it with one line for
`runner_settings.reversal_window_hours`, which is a different and better thing than a proposal
sitting on a page nobody taps. Twice consecutively, never once: a single failed revalidation is as
likely to be a transient read as a dead premise.

**Since `SES-113` (`v7.0.158`) a removal-proposed ticket KEEPS its queue number while it waits,
so two of those three harvests changed shape** — the step-5 block carries the rule and John's
reason for it. **Reverse is now zero-motion re-entry:** the ticket already holds its earned slot,
so restoring `status` + `revalidated_at` moves nothing, where it previously had to be re-inserted
from nowhere and landed wherever the renumber happened to put it. **Accept is unchanged and still
terminal** — `removed` leaves the eligible set, so that recompute genuinely does release the
slot. The recompute at filing time still runs: it no longer strips the ticket, but it is what
settles the rest of the board around it.

**8d. Milestone gate-review sweep (`SES-179`, `v7.0.220`) — one review per cycle, never instead of
the build.** At every epic retirement the charter requires a review by two governance-lane lenses
(§Multi-agent verification item 7), and it is the **only** sanctioned path for adding members to a
later milestone (§Closure discipline item 3). Run this after 8b/8c:

```sql
-- The oldest RETIRED drain whose epic has no gate-review card yet. 0 rows = nothing owed.
SELECT d.id AS directive_id, e.id AS epic_id, e.name AS epic_name, d.acted_cycle, d.created_at
  FROM public.runner_directives d
  JOIN public.epics e ON e.id = d.epic_id
 WHERE d.type = 'drain-epic'
   AND d.status = 'done'
   AND NOT EXISTS (SELECT 1 FROM public.runner_items ri WHERE ri.epic_id = e.id)
 ORDER BY d.created_at
 LIMIT 1;
```

1 row → run the review per **`docs/runbooks/gate-review.md`** (the three mandatory directions, the
two lenses, the burndown query, the card's shape and the four prohibitions live there — **cited
here, not restated**, so these two files cannot drift the way step 5 and step 7 did before
`v7.0.114`). **Run the review's transaction (`gate-review.md` § *The decision and the successors,
one transaction*) in the step-9 tail — record, successors, drain, in that order and in one `DO`
block — and put the decision handle in `notes`** (`SES-312`, `v7.0.401`). <!-- FEATURE: SES-312 — the review's own transaction replaces "file its card". -->
0 rows → nothing owed; say nothing.

Four properties, each of which is how this gets built wrong:

- **It is a SWEEP over evidence, not a branch on `drain_epic_next()` returning `retired`.** That
  call has **two** sites (step 5 and step 9's Gate B, `SES-139`) and since `SES-189` one call may
  retire **more than one** directive while returning only the last one's ids — so a call-site
  branch misses retirements by construction. Measured, not reasoned: **M0 and M1 both retired
  ungated** (`01758f26` by cycle `e42f8d4e`, `69e61a6c` by `4b874066`, 2026-08-24) before this step
  existed, and a sweep catches them where a branch never could.
- **`NOT EXISTS … ri.epic_id = e.id` is the whole idempotence**, and it works because
  `runner_items.epic_id` is set on gate-review cards and on **nothing else** — which is now a
  **constraint rather than this sentence**: `ck_runner_items_epic_id_review_only` (`SES-254`,
  `v7.0.338`, migration `ses254_epic_id_review_only`) admits `epic_id` only on a row that is
  `kind = 'gated_before_build'` with a NULL `backlog_id`. A card filed without it is invisible
  here and the same review is filed every cycle, forever.
  **Until `v7.0.338` nothing enforced that in either place, and the cost was live:** four cards
  carried `epic_id` while not being reviews — `SES-45`, `SES-210`, `SES-211`, `SES-182`, all on
  M3 — so this sweep read M3 as already reviewed **permanently**, and its gate review was found
  by hand rather than by the step that exists to find it. **THE EDIT THIS FORBIDS: also narrowing
  the query above to that same discriminator.** With the CHECK in force the bare join can only
  match a review card by construction, so a second copy here is one fact with two homes that can
  drift — the `SES-116` / `SES-113` / `SES-86` phase 3 defect one level up, and the copy in prose
  is the one no test can execute. Pinned by `tests/regression/SES-254-epic-id-contract.js`.
  **Four properties of that migration, relocated here from the retiring `v7.0.338` stamp by
  `SES-275` (`v7.0.354`) because each appeared ZERO times anywhere in this body — the `SES-164`
  step 2 that makes a trim safe, checked by grep rather than recollection.** *(1) Order is
  load-bearing:* the four violating rows are repaired to `epic_id` NULL — one before-image each,
  §19v — **before** the CHECK is added, because added first it rejects them and the migration
  fails. *(2) `VALID`, never `NOT VALID`:* a `NOT VALID` CHECK is still enforced on UPDATE, so
  leaving violators behind one makes those rows **un-updatable** — and the decision harvest
  UPDATEs `runner_items` to record John's taps, so that failure lands on a card he had just
  tapped (the `SES-116` lesson). *(3) Nulling the four is not data loss,* surveyed rather than
  assumed: a grep over `scripts/` `src/` `api/` `lib/` `tests/` returned 22 `epic_id` hits and
  **not one reads `runner_items.epic_id`** — the briefing's §15 burn-down and §8 matrix both read
  `backlog_items.epic_id`, a different column on a different table — and each row's full prior
  state is in `runner_before_images`, so a Reverse restores it byte-for-byte. *(4) Its down came
  back `refused`, and that is a result rather than a gap:* an in-place `ALTER` of an existing
  table is refused by `capture_migration_down()` by design, so a red range containing
  `ses254_epic_id_review_only` is **card-only** and that ship is not auto-rollbackable.
- **`cancelled` is excluded on purpose.** A cancelled drain is John withdrawing a standing order
  (`b74009ea`, the Automation epic) — not a milestone finishing. Writing the predicate as
  `status <> 'queued'` hands him a verdict on work he had just called off.
- **The review DECIDES and FILES, inside one decision it records with a handle** (`SES-312`,
  `v7.0.401`). <!-- FEATURE: SES-312 — property 4 stops describing a tap that no longer arrives. -->
  It writes `decision = 'accept'` on its own `runner_items` row, registers the whole thing through
  `public.record_decision()` so it carries a 72-hour reversal handle, files the successor members it
  named **in that same transaction** (`M6-05`), and declares the next milestone's drain there too.
  `drain_epic_next()` property 5 keeps its **single** exception — directive `0970abad` — and the
  review's declaration **is** that exception. **The anti-widening guarantee did not move, it
  changed instrument:** it used to be John's tap and it is now the decision's before-images
  (`row_data NULL` per filed row, all carrying one `decision_id`), so a review that files a member
  it never named is one `reverse_decision()` from undone. It may still file **only** members named
  in its own findings, and a drain outside `0970abad`'s exact shape is still John's alone to write.
  **This replaced a tap that had stopped arriving:** `SES-285` retired the card/tap surface, so
  under the old property 4 no review could be accepted, no successor could be filed and no drain
  could be declared — the M5 review's `runner_items` row had to be written by hand at the M6 gate
  to keep this sweep from re-running it.

**9. Write the record, then die.** (Times shown to John — briefing, notifications — are CST
(America/Chicago), labeled CST; ledger timestamps stay UTC. John, 2026-08-20.) `runner_items` row (kind, **`backlog_id` as a BARE ticket id — see the rule immediately below**,
title, value case, before → after, QA evidence with proof-type label, dev link, flag slug if
any, cost split, model, **plus the three plain-language columns `plain_cant` / `plain_after` /
`plain_worth`**).

**`backlog_id` IS A JOIN KEY AND IS NOW ENFORCED AS ONE — the display string goes in
`display_ref` (`SES-116`, `v7.0.174`, migration `ses116_backlog_id_bare_check`).** This line used
to read *"backlog ID + Type + named P-class per the Language block above"*, and **that sentence is
the root cause of the defect `SES-116` fixes**: it told every cycle to compose
`'SES-115 (Tooling · P10 - Tooling)'` and store it in a column that joins to
`backlog_items.backlog_id`, so **every card→ticket join silently returned nothing** — the help-me
ticket, the pending-on-John views, and `SES-112`'s `needs-john` backfill all mis-joined. The
Language block governs what John **reads**; it never governed a key column, and display formatting
belongs at render time only.

- **`backlog_id`** takes the bare id (`SES-116`, `CHI-84`, `AGT-015`) or **`NULL`**. It is now
  guarded by `ck_runner_items_backlog_id_bare`, a **VALID** CHECK —
  `backlog_id IS NULL OR backlog_id ~ '^[A-Z]+-[0-9]+[a-z]?$'`. A display string is **rejected at
  INSERT**, so a cycle that files a card the old way gets an error, not a silent mis-join.
  The pattern was surveyed rather than chosen: it matches **all 603** live
  `backlog_items.backlog_id` values with zero exceptions.
- **`display_ref`** takes the human reference when the card names something that is **not a board
  ticket** — a directive uuid, a governance register, an `ARCHITECTURE.md` clause, an invention
  proposal, `"no ticket yet — your Accept files one"`. Leave it `NULL` when `backlog_id` already
  carries the reference.
- **Render the id chip as `coalesce(backlog_id, display_ref)`**, never `backlog_id` alone — a
  directive card has no ticket and must still show what it is about. Contract:
  `briefing-page.md`'s regeneration step 1.

**Measured before a line changed, and the ticket under-counted it 20×:** `SES-116` says *"3 of 4
open gated cards"*; the live census was **63 of 80** non-NULL rows violating, **7 of them
undecided**. The repair moved every raw string to `display_ref` rather than nulling it (§19v — a
directive uuid was that row's only copy), which is also what let the CHECK ship **VALID** instead
of `NOT VALID`: a `NOT VALID` constraint is still enforced on UPDATE, so the 22 unrepairable
legacy rows would have become **un-updatable** — and the harvest UPDATEs `runner_items` to record
John's taps. That failure lands on a card he has just tapped, which is the one outcome this table
must never produce.

**THE PLAIN-LANGUAGE SUMMARY IS A COLUMN NOW, NOT PROSE YOU WRITE AT RENDER TIME (`v7.0.146`,
directive `dda69acb` and its twin `6b6cdd71`, John 2026-08-21T20:44Z and 20:46Z).** `v7.0.145`
made the More-info panel's three fields required — *what you can't do today* / *what you could do
after* / *why that's worth something* — but required them only **in the HTML**, passed as a
per-card JavaScript object literal written by whichever cycle happened to be rebuilding. The text
therefore had nowhere to live between rebuilds, and **register B18 could not be honoured for it**:

<!-- {{rule:B18}} · rendered from public.governance_rules — do not hand-edit the quoted line(s)
     below. Edit the registry row, re-export docs/governance/RULES-SNAPSHOT.md, then run
     `node scripts/render-rule-blocks.js --write`. Checked by that script's default mode (SES-175). -->
> **Rule B18** — Rebuild briefing cards from the database's current undecided set every time, never from a cycle's memory of what it filed.

That rule is unfollowable when the DB has
no place to put the words, so the next cycle to rebuild had to re-invent a card's wording from
scratch — for a card it did not write. Store them on the row when you FILE the card, in John's
register rather than the system's ("you can't X today", never "the affordance is absent"), and the
rebuild reads them back instead of guessing. **`NULL` is not an empty string and must not become
one:** it is what makes the page draw the red defect line, which is the deliberate `v7.0.145`
choice that a missing summary should look missing rather than look fine. Filing a card without
them is now a visible omission in the ledger, catchable before John ever sees the page —
`SELECT id FROM runner_items WHERE decision IS NULL AND plain_cant IS NULL;` should return
nothing. Same shape as `SES-86` phase 3 (John's automation queue: prose → `automation_rank`) and
for the same measured reason — a rule each cycle must remember to apply is a rule that gets
silently forgotten. Close `runner_cycles` with the two cost tracks (John, 2026-08-20):
`api_cost_dev_usd` / `api_cost_qa_usd` (true billable API calls only — trace to
`ai_activity_log` where possible; $0 is the normal value) and `est_tokens_dev` /
`est_tokens_qa` (your own session's thinking, split build-vs-QA steps — **estimated is fine,
labeled estimated; never invented**), plus outcome and push SHA. The briefing's budget cards
show the dev/QA split on both tracks, the runner's token use broken down by model, and John's
latest reading + calibration; the reading-entry card (three percentages + save) must be on
every rebuild. **The page's shape is now the LOCKED SECTION ORDER in `briefing-page.md`
(`SES-124`, `v7.0.159`) — read it there rather than re-deriving it from this paragraph.** Two
requirements this step used to carry are **struck by John's explicit removal**: the **"Next up"
top-five section** and the compact **"Next 3"** line at the page top (registers B25/B26). Their
replacement is **§8's queue matrix and §11's now-tier census (`SES-126`, shipped
`v7.0.161`)** — the forward view of the queue lives there now. (Historical: between `SES-124`
and `SES-126` the page briefly carried no forward view at all; that window closed at
`v7.0.161`.) Do not reinstate the struck B25/B26 sections to change that. Still required: the
**exposure-rate line** — cards
that needed John this week vs. last (register B28 — retired 2026-09-01 by `SES-285`, no replacement
rule, annotated `SES-289`: the quantity is now structurally zero, so this line is
**annotated-as-withdrawn and unrunnable**) — and the **daily "help me" ticket**: the
top pending-on-John ticket by the standard ordering, its specific questions on the card,
inviting a manual session or a Rework line; resolution re-enters it at queue #1 (register B29 —
retired 2026-09-01 by `SES-285`, no replacement rule, annotated `SES-289`; also
**annotated-as-withdrawn and unrunnable** — under `M6-01` a cycle decides its open question and
records the reasoning instead of nominating it, and `M5-10` surfaces a three-cycle stall in the
standing brief).
**The page's open QUESTIONS now render as the yes/no question list from `runner_questions`
(`SES-99`), max 5, newest first** — this does not replace B29's ticket, which stays (B29 retired
2026-09-01 by `SES-285`, annotated `SES-289`, so *"which stays"* no longer holds). A question
a cycle wants to ask John is **INSERTed into `runner_questions`** (before-image `row_data = NULL`,
the INSERT convention from step 8b) rather than written into prose on the page.

<!-- {{rule:B18}} · rendered from public.governance_rules — do not hand-edit the quoted line(s)
     below. Edit the registry row, re-export docs/governance/RULES-SNAPSHOT.md, then run
     `node scripts/render-rule-blocks.js --write`. Checked by that script's default mode (SES-175). -->
> **Rule B18** — Rebuild briefing cards from the database's current undecided set every time, never from a cycle's memory of what it filed.

Concretely (SES-B17, 2026-08-20 — B17 was superseded 2026-09-01 by `M6-05`, `SES-285`, annotated
`SES-289`: a widening, not a weakening, since `M6-05` extends B17's *"must never evaporate"* from
Accepts to every decision a cycle makes, filed in the same transaction), that set is `runner_items` `WHERE decision IS NULL` — in-memory reconstruction drifts silently the moment two sessions overlap or a prior
cycle's card was Reversed after you already forgot it, so the DB is the only trustworthy
source.

**CLOSE THE DIRECTIVE WITH ONE CALL — the status and the outcome are no longer separable
(`SES-129`, `v7.0.164`, migration `ses129_directive_outcome`).** This step used to read *"mark the
directive `done`"*, and that is exactly the shape of rule this platform has now paid for six times
(`SES-86` phase 3, `v7.0.146`, `SES-101`, `SES-111`, `SES-127`, `SES-128`): a second write every
cycle must remember is a write that gets silently skipped. §7's follow-through card needs to tell
John *what became of* his line, so recording it is not optional:

```sql
SELECT * FROM public.close_directive('<your cycle id>', '<directive id>',
       '<shipped|carded|superseded>',
       '<one sentence in John''s register: shipped as SES-125, the decision cards>');
```

The call writes its own before-image (§19v), sets `status='done'` and `acted_cycle`, and **cannot
set the status without an outcome and a non-blank note** — both are raise-on-missing. It is
idempotent in the direction that matters: a directive already closed *with* an outcome comes back
`already_closed = true` and is left untouched, so a re-run can never overwrite a verdict already
on John's card. `closed_unrecorded` is rejected — it is backfill-only for the 24 rows that predate
the column, so a cycle can never label its own work "unrecorded". A `done` row with a NULL outcome
renders **red** on §7, which is what that combination now means: the function was bypassed.

Rebuild the briefing page
per `docs/runbooks/briefing-page.md` (harvest before rebuild; republish to the same URL **only if
the bridge clause immediately below leaves the republish yours to make**;
**never shell-process the WebFetch result's saved file — `~/.claude/projects/…/tool-results/`
is a permission-gated path, the same gate as step 0's `.claude/` rule; parse `briefing-state`
in context and rebuild from the template + `runner_` tables — `SES-96`, John's captured
prompt, 2026-08-21**).
*(Supervised run: if republish is unavailable from cloud, log it — the design session rebuilds
manually.)*

**THE BRIDGE — AN UNATTENDED CYCLE BUILDS THE PAGE AND DOES NOT PUBLISH IT (`SES-244`,
`v7.0.348`; John, attended architect session 2026-08-31, directive `27b5d8cb`, his word verbatim
*"b with the bridge"*).** Until `v7.0.348` this step and that directive were **both law and directly
opposed**: this file said the republish is mandatory and *"a cycle must never end without it"*, while
`27b5d8cb` forbids an unattended cycle making it. Every cycle since 16:16Z that day reconciled the
pair by hand, which is the one-fact-two-homes defect this platform has already paid for at `SES-116`,
`SES-113` and `SES-86` phase 3. `SES-257`'s own text names it — *"SO THE TWO RULES NOW CONTRADICT
EACH OTHER."* His ruling, in force:

- **(b) is the durable fix and it is what gets built:** the briefing becomes a **pure render of the
  database** — taps/Accepts/asks live in Supabase (the tap-buffer John chose on card `f6c7c54a`;
  `SES-188` candidate 2, with `SES-155`/`SES-156`) — so publishing needs no read-back of any
  permission-gated path. **(a), a standing permission for unattended sessions on that path, is
  REJECTED** and must not be proposed again as a shortcut.
- **THE BRIDGE, until (b) ships:** the **attended** session republishes whenever John is present.
  An **unattended** cycle **builds the page, records the build in its own `runner_cycles.notes`, and
  stops there** — it does not publish, and it **must NOT re-file the publish failure as a defect**
  (`SES-244`/`SES-257` already carry it; a third ticket is noise on a board whose bottleneck is
  already John's reading).

**THE EDIT THIS FORBIDS, and it is the tempting one because the guard's message names its own
remedy:** reading the served page's saved copy under `~/.claude/…/tool-results/` to satisfy the
publish guard's *"counts as viewed only once you have Read every line of that file"*. That is step
0's gate — register B39, measured parks of ~8h05m, ~9h20m, and one that never returned, every
clearance happening only while John was at his desk — and his standing word on his clearing one is
*"That should not be happening"* (`34865f07`). **An unattended cycle does not enter the gate**, so
the honest outcome is a built page and a note, never an attempt.

**WHY SHRINKING THE PAGE IS NOT THE WAY OUT — measured, so no later cycle re-proposes it.** The
guard has two halves and only one is about size. It is **per-conversation** (tool contract: *"a
publish to an artifact this conversation has not read or published is refused"*; corroborated at
`docs/SESSIONS.md:3023`, where the toll was *"paid once per session, not per republish"*), so a
smaller page still owes the read — shrinking can only change the read's **channel** from a gated file
to inline, never remove it. And the numbers refuse it as a plan: **every** size ever measured on this
page was already on the file-save branch (198.3 KB on 2026-08-24, 439 KB and 473.1 KB on 2026-08-31),
so the inline threshold sits somewhere **below 198.3 KB** and has never been located, while the built
page measured **460,741 bytes** at `v7.0.348` of which **295,324 B — 64% — is the §5/§6 undecided
decision-card set** (87 cards) against a template floor near 110 KB before a single card. `SES-203`
already took the cheap 73.7 KB of comments; what is left **is** the decision surface. The only
"shrink" that works is moving that surface out of the published HTML — which is not shrinking, it is
(b).

**THE SERIAL TAIL (register B42) — the only moment of the cycle that is one-at-a-time.** In
order: **(1)** take the publish lease (step 0's 10-minute-TTL claim; 0 rows → wait ~30s and
retry, never skip); **(2)** re-fetch the live page and re-parse `briefing-state` — the
self-healing step: another cycle may have republished while you built, and publishing from a
pre-lease harvest is exactly the "about to overwrite another session" moment John's ruling
requires you to notice and absorb; **(3)** write the harvested decisions idempotently
(`… AND decision IS NULL`; ladder moves only from rows you actually flipped, `shipped` cards
only), store any reading/directive rows, and store any `asks` (`v7.0.145` — idempotent on
`uniq_card_ask`) **and any `unblocks` (`SES-127`, `v7.0.162`)** **and any `settings` (`SES-143`,
`v7.0.182` — see the block below)**; **(4)** re-export the backlog snapshot now that the harvest writes have
landed — the fix for the one-harvest staleness `SES-109` found (`v7.0.149`). Re-run step 7's
`scripts/export-backlog-snapshot.js`; the script is deterministic and prints `unchanged`,
writing nothing, when John's taps moved no board row — the common case, and then there is
nothing to push, so skip to (5). Only when it produced a diff do you commit
`docs/backlog/BACKLOG-SNAPSHOT.md` and push it (`git fetch origin dev && git rebase origin/dev &&
git push origin HEAD:dev`, the rebase-retry×3 of step 7). **This is the one sanctioned second
push of a cycle** — snapshot-only, inside the serial tail, guarded by the publish lease you
already hold (NOT the ticket claim, which step 7 released in its own statement after the push —
`SES-106`, `v7.0.150`), and it fires
only on cycles that actually changed the board, so the "one push per ship point" spirit holds. A
rebase conflict that survives the retries is not a wall: leave the snapshot one harvest stale
exactly as before this fix — the next cycle's step-7 export captures the same writes — and note
it in the cycle row; **(5)** rebuild cards from the DB's undecided set — **each with its More-info
panel, and each open `runner_card_asks` row answered on its own card** (`v7.0.145`; a card
rendered without those fields carries a visible defect line, by design) — and republish **if and
only if the bridge above leaves that republish yours to make; an unattended cycle builds, records
the build in its `notes`, and stops** (`SES-244`, `v7.0.348`, directive `27b5d8cb`); **(5b)
stamp `briefed_at` on the §10 skip rows you just rendered, and ONLY after the republish returns**
(`SES-127`): `UPDATE public.runner_skips SET briefed_at = now() WHERE briefed_at IS NULL AND
resolved_at IS NULL;` — `briefed_at IS NULL` *is* the NEW chip, so stamping before the publish
lands silently eats the chip on rows John never saw, and stamping after means the worst case is
one extra night marked new. **A CYCLE THAT DID NOT PUBLISH MUST NOT STAMP IT AT ALL** — under the
bridge that is now the ordinary unattended case, and it follows from this rule rather than
softening it: no publish means John saw nothing, so every one of those rows is still NEW and the
stamp would eat the chip permanently. `SES-127`'s own fail direction — the worst case is one extra
night marked new — is what makes leaving it unstamped the safe half; **(6)** close your `runner_cycles` row; **(7)** release the publish lease
(holder-guarded statement in step 1); **(7b)** sweep the decision windows — one idempotent call,
written out in its own `(7b)` paragraph below, whose **two** returned numbers go into the cycle
`notes`; **(8)** continue the drain **in-session**, if and only if
`drain_chain_gate()` below returns `continue` — otherwise end the session cleanly. The tail should take
seconds to low minutes — everything long-running happened before it, in parallel.

**(7b) SWEEP THE DECISION WINDOWS (`SES-286`, `v7.0.395` — `M6-02`, `M6-07`).** <!-- FEATURE: SES-286 (b) — the cycle tail closes the windows that expired while it ran. -->
One call, idempotent, safe to run on a cycle that decided nothing:

```sql
SELECT * FROM public.sweep_decision_windows('<your cycle id>', NULL);
```

It finalises every `open` decision past its `expires_at` and promotes the work class each one named
(`SES-107`'s streak rule; a class is promoted once, ever — `ladder_applied_at` is the stamp that
enforces it). It returns `finalized, promoted`; **put both numbers in your cycle row's `notes`** —
appending to the row you closed at (6) is an ordinary `UPDATE`, and a closed row is not a frozen
one. A second call in the same cycle returns `0, 0`, so a retry is never wrong.

**WHY IT IS HERE AND NOT AT STEP 1, both halves measured rather than assumed.** *Not at step 1*
because step 4b sizes the invention pass off `runner_ladder`'s `invention` rung: a sweep before
selection would let this cycle promote a rung on 72 hours of silence and then immediately spend the
widening it had just awarded itself. At the tail the promotion is visible to the **next** cycle's
step-4b read, which is the cycle that has not yet acted on it. *Not after (8)* because (8) is where
the session **ends** — a step placed below it never runs on the cycle that terminates a chain, i.e.
on precisely the cycle that may be the last one for hours, and a window that expired during that
cycle would then wait for a cron that may be off. **What this step does NOT do:** the chain gate
reads none of this. Its five gates are A–E below (outcome, drain work, `design_status`, no-ship
streak, undecided ceiling) and the ladder is not among them, so nothing in `(8)` depends on the
sweep having run — the ordering is about who consumes the promotion, not about the gate.

**(8) A DRAINING CYCLE CONTINUES THE DRAIN IN-SESSION — FIVE GATES, ONE CALL (`SES-139`,
`v7.0.176`; actuator replaced by `SES-141` `v7.0.180`, replaced again and FINAL by `SES-140`
`v7.0.195` — the platform refuses session-spawning, so the chain runs inside the session;
terminator added by `SES-197`, `v7.0.238`, migration `ses197_drain_chain_gate`).**
Root-caused 2026-08-23 from John's *"find root cause why automation is stalling"*:
`SES-111` changed what a cycle **picks** and nothing anywhere fired the **next** one. `ARCHITECTURE.md`
§19v's *Operations* paragraph specifies the model (successive one-ticket cycles, 24×7), and John
ordered the working form directly (in chat, 2026-08-23, `successional-review` session, replacing
his `SES-141` ruling): **one ticket per CYCLE ROW stays the law; a session runs successive cycles
while a drain stands.** Run this **after (6) and (7)** — never before your row is
closed and the lease released:

```sql
SELECT * FROM public.drain_chain_gate('<your cycle id>');
```

`verdict = 'continue'` → open the continuation cycle. **Anything else → fire nothing and end the
session cleanly**, putting `gate_failed` and `reason` in the row you just closed at (6). The five
gates, in the order the call applies them — the first failure stops and names itself in
`gate_failed`:

| # | Gate (`gate_failed`) | Stops the chain when |
|---|---|---|
| A | `ran-a-cycle` | your own `outcome` ∉ `shipped` / `gated_before_build` / `reverted` |
| B | `drain-has-work` | `drain_epic_next()` returns anything but `pick` |
| C | `pick-actionable` | the pick's `design_status` ∈ `needs-john` / `needs-desktop` / `john-paced` |
| D | `noship-streak` | consecutive non-shipping cycles ≥ `runner_settings.chain_max_noship_streak` (2) |
| E | `undecided-ceiling` | undecided cards ≥ `runner_settings.chain_max_undecided_cards` (**off** unless John sets it) |

**GATE C IS `SES-197`, AND IT WAS THE ONE THAT MADE GATE B ABLE TO FAIL AT ALL — until `SES-196`
moved the clause into the picker itself.** Read from `pg_get_functiondef` at the time rather than
argued: `drain_epic_next`'s pick predicate filtered `queue`, `status <> 'delivered'` and claims, and
**never `design_status`** — so a named member flagged `needs-john` came back as the `pick` forever
and B passed forever. Measured 2026-08-25 when `SES-197` shipped: `SES-176` had been returned and
skipped **18 times**, **23** cards sat undecided, and the originating chain (`edd2471d`, `5f0a62d7`)
had ~13.6M of a 40M day cap left — roughly a dozen more gated cards before the only real terminator,
the token wall, fired. **Gate A exists so the budget wall is not a metronome; the same inversion was
arriving through Gate B — and Gate A *passes* here, because a card-only cycle closes
`gated_before_build`.** Since `v7.0.252` the **picker** skips those three flags itself (below), so
Gate B fails on its own and Gate C is the rule's **second** home rather than its only one.

**JOHN OVERRULED THE EDIT THIS STEP USED TO FORBID — the `design_status` clause now lives in
`drain_epic_next()`'s PICK predicate (`SES-196`, `v7.0.252`, migration
`ses196_drain_pick_skips_flagged`; John, 2026-08-25, directive `5dc62981`, from an attended
architect session, his word verbatim: *"i don't want the system to stop"*).** This paragraph used to
forbid exactly that edit, and the reason it gave was real and is **not** retracted: that predicate
also feeds **step 5**, where a flagged member was *returned* so the cycle could `record_skip()` it
and put the ask on John's §10. What the prohibition never weighed is the cost on the other side, and
`SES-196` measured it on the live M3 drain — the picker returned `SES-191` (`needs-desktop`) as the
`pick` on **every** cycle while **13 buildable named members** sat reachable behind it, so a standing
drain John declared could not advance at all. He was asked, and he ruled for the picker.

**THE §10 SIGNAL IS NOT LOST, AND THAT WAS CHECKED RATHER THAN ARGUED.** Measured live
2026-08-25T05:1xZ, before the change shipped: every flagged M3 member already carried an
**unresolved** `runner_skips` row — `SES-191` (`needs-desktop`, skipped 04:45Z), `SES-180`
(`needs-desktop`, ×8), `SES-181` (`needs-john`, 04:46Z), `SES-182` (`needs-john`, ×2). A
`record_skip()` row is cleared by the ticket going `done`, never by a cycle deciding it has waited
long enough, and §10 derives *still skipped* from that row plus the ticket's status — so the ask
keeps its home. What stops is the **re-skipping of a ticket already on his page**, which is
`SES-154`'s own one-ask-one-home boundary arriving here rather than a signal going dark.

**WHAT THIS SHIP DID NOT WIDEN, named rather than quietly included:**

- **`SES-154`'s pick-vs-retirement boundary is untouched.** The flags are in the **pick** predicate
  ONLY. Adding them to the **retirement** predicate returns `open_now = 0` and closes John's
  standing directive on the runner's own say-so — the `SES-142` authorisation defect, rebuilt. A
  drain whose every remaining member is waiting on John is `blocked`, **never** `retired`.
- **`'designed'` is NOT a flag.** The three are `needs-john` / `needs-desktop` / `john-paced`,
  mirroring `drain_chain_gate`'s own `c_flagged`. The directive's literal words were *"design_status
  is non-null"*, and taken literally that also excludes `designed` — which step 5's blocked-prefix
  table calls **explicitly not a skip** and step 6 calls the **fast path**. The literal reading
  would make a drain step past its *best* picks; his own parenthetical enumerates the three, so the
  three are what shipped, and the deviation is named on the ship card rather than buried.
- **`status = 'removal proposed'` was left pickable**, though `SES-196`'s description lists it among
  the five blocked-prefix flags. John scoped the directive to `design_status`; it therefore remains
  step 5's procedural skip and is carried on the ship card as this ticket's declared remainder.

**A `blocked` DRAIN NOW SAYS WHY, IN A COLUMN — `blocked_detail` (`SES-196`).** *"Never a silent
empty"* is John's own QA arm (b). When no named member is claimable the call still returns
`outcome = 'blocked'` — the five outcome words are unchanged, because Gate B, step 5's table and
this step all read that vocabulary — and `blocked_detail` names the population that rejected the
pick: how many members are waiting on John and which flag each carries, how many a live peer claim
holds, and how many are `delivered`. It is `NULL` on every other outcome.

**The two numbers are John's or measured — neither was chosen for feel.**
`chain_max_noship_streak = 2` is **what the incident measured**: that chain was stopped by hand
after its second card-only cycle, and the default encodes the stop that actually happened.
`chain_max_undecided_cards` is **`NULL` = off**, because no measurement supports a specific ceiling
— 23 today, 22 during the incident, neither is a limit — and shipping one would be the runner
widening its own rule with a number nobody measured. **`NULL` is a real value, not an absent one:
never coerce it to `0`**, which is a ceiling of zero cards and stops every chain forever (the
`SES-147` boundary, same shape). Question `q-chain-card-ceiling` asks John for the value.

**Gate A is evaluated BEFORE the drain call, and that ordering is load-bearing.**
`drain_epic_next()` is not a preview — it writes a before-image and retires a completed drain when
it runs, and this step forbids dodging that with a dry-run form. A cycle failing Gate A fired
nothing before `SES-197` and calls nothing now.

**Why every gate fails toward stopping, which is what licenses adding them.** This step's own
sentence, below: *a continuation that fails to open is a **note, never a wall** — the cron remains
the fallback engine.* A chain that stops early loses nothing (the claim expires in 24h, the next
scheduled fire resumes with a fresh context); a chain that runs too long spends John's tokens and
buries his briefing in cards he must clear. The costs are asymmetric.

**A named approximation, disclosed rather than hidden (the register B42 convention).** The no-ship
streak counts consecutive non-shipping cycles by `started_at`, so under parallel cycles another
session's rows interleave with this chain's. `runner_cycles` has no `parent_cycle_id` to walk, and
adding one would put a protocol step back into every continuation INSERT — the exact class of
forgetting this call exists to remove. Contamination can only make the streak **larger**, i.e. stop
the chain **sooner**, which is the fail-safe direction; the 6-hour window stops a quiet night
accumulating one.

`continue` → **do not end the session. Open your continuation cycle and re-enter the runbook:**

1. **INSERT a new `runner_cycles` row** — your same stamp echoed, `trigger` =
   `chained (drain continuation)`, fresh id. That row IS the chain: its existence is the evidence
   `SES-140` waited 94 spawn-era cycles to observe.

   **HOW THE CONTINUATION IS SPAWNED — John's directive `a75e22e6` (attended session
   2026-08-30 ~17:2xZ, pinned after he caught a failed chain), folded in here on the next ship
   touching this file exactly as that directive asks.** Spawn it by **creating a new session in
   this environment** carrying the runner stamp/prompt — the mechanism the 2026-08-29
   17:0x–17:4xZ chained cycles used successfully — and **NEVER by `fire_trigger` on the
   `deepbench-runner` routine**, which the platform refuses to agents for `http_api`-created
   routines (`SES-140`, re-measured 2026-08-30 by the cycle John saw). **If the spawn itself
   fails, close normally and note it:** the hourly cron is the designed fallback and the cost is
   minutes, never a wall.
2. Note `CONTINUED IN-SESSION AS CYCLE <new id>` in the row you just closed at (6).
3. **Re-enter at step 1** with the new cycle id and run every step exactly as a fresh cycle
   would — step 1b (`chained (drain continuation)` is exempt from pacing, by spec), **step 3's
   walls re-checked in full** (this is what bounds the loop — a wall-stop closes the continuation
   cycle `did_not_run` and, per Gate A, ends the chain), selection at step 5 (the drain pick,
   the atomic claim, all of it), build, QA, ship, and this tail again. One ticket per cycle row,
   full ceremony per cycle — the second iteration earns no shortcut.
4. **The chain ends where a fresh cycle would end:** Gate A fails (a wall-stop or a `failed`
   close — **not** `gated_before_build`, which Gate A explicitly passes), Gate B fails (the drain
   retired, or every remaining named member is claimed), **Gate C fails (the pick is flagged
   `needs-john` / `needs-desktop` / `john-paced`)**, **Gate D fails (two cycles running without a
   ship)**, Gate E fails if John set a ceiling, or the platform ends the session itself — and
   nothing is lost on that
   last one: an open claim expires in 24h and the next scheduled fire resumes the drain. A
   continuation that fails to open is a **note, never a wall**: the cron remains the fallback
   engine.

**THE SESSION-SPAWNING ACTUATORS ARE RETIRED, AND THE EVIDENCE IS WHY — do not rebuild them.**
Three actuators tried to launch the next *session* from inside a cycle; all three are dead ends,
measured live on 2026-08-23, not reasoned: **`fire_trigger`** — refused, *"this routine was
created via http_api, not by an agent"* (`SES-140`'s original finding). **`create_session`** —
refused **three times across two parents**, identical message (*"the parent session's permission
mode is not yet available"*), including once with `permission_mode` passed explicitly, 25 minutes
into the parent (cycles `72561db3` ×2, `03c19332`). **One-shot `create_trigger`** (the `v7.0.190`
rung 2) — actually fired at `15:11:36Z` (`trig_015wHzkN7kiEBTdChhYaFVua`) and the launched
session came up without the git source or a usable tool list (`create_trigger` exposes no
`sources` / `allowed_tools` parameters) and **never wrote a row** — a silent dead spawn, worse
than the loud refusal. Anthropic's Claude Code documentation (read 2026-08-23, attended session
`successional-review`) confirms session-spawning is not a supported pattern; the supported
pattern for *"work a queue until it is empty"* is one session that keeps working inside itself,
restarted by the schedule. Which is exactly this step.

**GATE A IS THE ENTIRE SAFETY OF THIS STEP. Do not drop it.** The
ticket's bound reads *"one successor per cycle, only from a cycle that ran its tail"* — and a
wall-stop **does** run its tail (step 3, verbatim: *"A wall-stop still runs the step-9 serial tail
(its record must be written), then ends"*). Implemented exactly as filed, a cycle that stops at the
token wall opens a continuation cycle, which stops at the same wall, which opens another: an
unbounded loop of `did_not_run` rows, with nothing to break it but John noticing. **That
converts the budget wall from a brake into a metronome** — the precise inversion of what a wall is
for. Measured at this ship rather than reasoned: 03:14Z the America/Chicago day stood at
**20,851,000 estimated tokens across 27 cycles** against John's `budget_override` `43a9d4ae`
(`max_tokens` 25,000,000), **expiring 05:00Z**, after which the allowance reverts to a 10M cap the
day had already passed — so the first fire after 05:00Z wall-stops. Gate A is what makes that stop
the **end** of the chain instead of the start of the loop.

**Gate B's call is NOT a preview, and that is correct.** Read from `pg_get_functiondef` rather than
assumed: when the epic's `now` tier is empty, `drain_epic_next` **writes a `runner_before_images`
row and closes the directive** before returning `retired`. Leave it that way — the last cycle of a
drain closes the drain and fires nothing, in the place the emptiness is first observed. Do not add a
dry-run form to dodge the write.

**Pass YOUR CYCLE ID: the parameter is a stamp, not a selector.** The function ignores its argument
when choosing the drain (it reads the single oldest queued `drain-epic` row regardless) and uses it
**only** to stamp that retirement before-image — so a wrong uuid succeeds silently and is correct on
every path *except* retirement, where it attributes the before-image to a cycle that never existed.
Recorded because this cycle did it: step 5's call was made with the **epic** id, returned a correct
`pick`, and wrote nothing. This step adds a second call site on the one path where that mistake
costs something.

**What does NOT self-terminate — read this before quoting the ticket's bound (3) to John. REWRITTEN
`SES-142`, `v7.0.179`, because half of it has been fixed and the other half has not.** The claim
*"the chain self-terminates; the drain retires at `open_now = 0`"* was false for two independent
reasons. **The first is now fixed:** `open_now` was computed over the epic's **live** `now` tier,
which the runner's own filings extended faster than it drained, so the target receded — that is
`SES-142`, and `open_now` is now the count of John's **named** members still open, a set no cycle
can add to. `SES-110`, named in the previous version of this paragraph, is `status = 'done'` as of
this cycle's live read and is no longer a blocker either. **The second was true until `SES-197`
(`v7.0.238`) and is now HALF true — read the distinction, because the underlying fact has not
changed:** `drain_epic_next`'s pick predicate still reads `queue` and claims and **never
`design_status`**, so a `needs-desktop`, `needs-john` or `john-paced` member still comes back as a
`pick` and still gets skipped procedurally at step 5 (`SES-114`; `john-paced` records no skip row —
`SES-166`). **That is deliberate and must stay** — step 5 needs the flagged member returned so it
can `record_skip()` and put the ask on John's §10. What changed is the **chain**: tail (8)'s
`drain_chain_gate()` reads `design_status` on the pick and fails **Gate C**, so the chain is no
longer bounded by *"Gate A plus the token wall"* — it stops at the first continuation whose only
work is a decision John owes, or after `chain_max_noship_streak` cycles that ship nothing.
Said plainly for John: when every remaining named member is flagged `needs-john` /
`needs-desktop` / `john-paced`, the drain's finish line is on his briefing page, not in any
cycle's hands — and **the chain now stops and says so** instead of running until the budget wall
noticed for it.

**Untouched, and not negotiable:** drain **creation** stays John-only (`drain_epic_next` property 5 —
*"Nothing creates a drain row but John… The runner may read one; it may never write one"*). This step
continues a drain he wrote; it can never start one. Fleet size stays stable rather than exponential —
at most one continuation cycle at a time per session means N concurrent sessions stay N, and the
cron adds workers on John's clock grid without multiplying them.

## Standing prohibitions (§19v — no step overrides these)

Never: touch the gated lane (terminology, LOCKED sections, schema-destructive migrations,
§19e-owned writes, active-agent Skill/Capability edits, the four harness files, dev→main);
write Supabase without a before-image; report a number that doesn't trace to a row or log;
retry the same tier twice; push more than once per ship point (the step-9 tail's snapshot-only
re-export push, `SES-109`/`v7.0.149`, is the single sanctioned exception — conditional on the
harvest having moved the board, guarded by the publish lease); proceed past a failed wall;
build a ticket without holding its claim (register B42 — the per-resource successor to B31's
retired cycle lease); enter the serial tail without the publish lease, republish from a
pre-lease harvest, or end a cycle without running the tail — and **never push or claim a
counter without re-asserting the ticket claim first** (`v7.0.123`'s lesson, directive
`c4d95dc7`, retargeted by B42: the coordination token must be re-proven before every
irreversible act, whatever the token is); **continue the drain from a cycle that did not run one**
(`SES-139` tail step (8), Gate A — a wall-stop, an abort or a `failed` close continues **nothing**,
or the budget wall becomes a metronome), **open more than one continuation cycle at a time**,
**spawn or attempt to spawn another session** (`SES-140`, `v7.0.195` — every session-spawning
actuator is platform-refused or boots dead; the chain runs in-session only), or **create a drain row
OUTSIDE THE ONE SUCCESSION JOHN PRE-AUTHORISED** (`drain_epic_next` property 5 — John writes drains;
see the carve-out immediately below); **skip the step-1b settings gate, or carry on past a
non-`run` verdict** (`SES-143` — the panel is John's switch on his own runner, and a cycle that
runs anyway has taken it back).

**THE ONE DRAIN A CYCLE MAY WRITE — directive `0970abad` and Prime Directive `a0ef9525` §6 (John,
attended architect session 2026-08-29, his word verbatim *"run both"*).** This prohibition read
*"never create a drain row (only John does that)"* until `v7.0.337`, and it was written before
`0970abad` existed and never reconciled with it — a cycle reading only this line would refuse the
one declaration John explicitly pre-authorised. **STANDING DRAIN SUCCESSION:** when a Selfbuild
milestone's gate review completes and names the next milestone's scope as a fixed member list
(`SES-142` form), that milestone's drain is declared **immediately** — by the attended session
running the review, or **by the first cycle after it that finds the named scope recorded and no
drain declared** — and it **requires no separate word from John**.

**What the carve-out does NOT widen, and each of these is still the prohibition above.** The
declaration **copies the review's named list verbatim** into `runner_drain_scope` and cites both
`0970abad` **and** the gate review's `runner_items` record as provenance. It may never widen scope
beyond what the review named, skip or automate a gate review, lift any hold, or declare a drain for
a milestone whose review has not been **decided** — `decision = 'accept'` on its `runner_items` row
**and** an unreversed `runner_decisions` row behind it; a review with no decision row is not a
naming (`SES-312`, `v7.0.401`). <!-- FEATURE: SES-312 — the precondition is a decision, not a tap. -->
**Why the word had to change:** "accepted" named John's tap, `SES-285` retired the tap surface, and
a precondition that can never be satisfied parks the succession rather than guarding it — which is
the `B23` failure the whole `M6` register exists to invert. The two-part test is deliberately not
one: the `runner_items` row is step 8d's idempotence key and **survives a reversal** (it is outside
`reverse_decision()`'s allowlist by design, so the evidence a review happened cannot be erased),
while the `runner_decisions` row is what carries the 72-hour window — so reading only the card
would let a reversed review's drain stand. Any drain outside that exact shape is still John's alone
to write.

**Composition was settled by precedent, not by judgment, and a later cycle should not re-derive it:**
the M3 drain (`6810599f`) named **the epic's then-open members PLUS the tickets filed straight after
the preceding gate review** — 19 + 4. The M4 declaration (`4583bdc1`, `v7.0.337`) followed the same
shape, 4 + 4. Already-`done` members are deliberately not named; naming a closed ticket adds nothing
and only moves the retirement predicate's finish line.

**§19v is silent on who may create a drain** (read live at `v7.0.337`, not recalled), so this was a
runbook-versus-directive gap rather than a §19v conflict — which is why it is reconciled here
instead of being carried as a standing disagreement.
