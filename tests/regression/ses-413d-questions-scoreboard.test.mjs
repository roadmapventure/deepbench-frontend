// DeepBench v7.0.523 | tests/regression/ses-413d-questions-scoreboard.test.mjs | SES-413 slice 4 --
// the weekly question count is a GRADED column on the platform scoreboard, not just a printed line.
//
// FEATURE. `governance_rules.MANAGER-DECIDES-BY-DEFAULT` sentence 3 promises John that "a question
// that still reaches him is counted weekly, target zero". Slice 3 (`v7.0.521`) RENDERS that count on
// the standing brief. Nothing GRADED it: measured live on the unchanged tree 2026-09-18,
// `platform_scoreboard` carried 14 columns and 7 metrics with no `questions_to_john_week`, and
// `outcome_claim_is_valid()` hard-coded those same 7 names under CHECK `ck_backlog_outcome_claim` --
// so `enhancement_claim = 'questions_to_john_week: down'` was REJECTED AT FILING. A promise a ticket
// cannot claim against is a sentence, not a target. Slice 4 adds the column, computes it inside
// `snapshot_platform_scoreboard()` (no new parameter -- see (3) below), and teaches the validator
// and `ticket_outcome` the name.
//
// WHAT THIS FILE GUARDS, and where the lazy version of each guard passes vacuously.
//
// (1) THE THREE DOCS SAY EIGHT, AND THE SUPERSEDED SENTENCE IS GONE. Asserting only that
//     `questions_to_john_week` appears somewhere would pass against a doc that added the name and
//     left "the seven metric names are exactly" standing one line above it -- which is the drift
//     that makes a runbook worse than no runbook, because both readings are quotable. Every clause
//     below therefore carries a MUTATION CONTROL (`breaks`): the clause is re-run against text with
//     its own subject removed and must go red. A clause that survives its own mutation is asserting
//     nothing, and this file fails on that rather than reporting green.
//
// (2) THE RUNBOOK CEILING IS A CEILING. `docs/runbooks/runner-cycle.md` sits at 380,976 B against
//     `SES-336`'s 381,000 B cap -- 24 B of headroom -- and `agt-70-auditor.test.mjs:1015` pins the
//     header-stamp count at exactly 5. Slice 4's edit is a five-letter word swapped for a
//     five-letter word: byte-neutral by construction, no stamp added, no stamp dropped. Both facts
//     are asserted here as well as there, because a later session editing this paragraph will read
//     THIS file to learn what it may spend, and "it was fine when I ran it" is not a budget.
//
// (3) THE MEASURE IS COMPUTED INSIDE THE FUNCTION, WITH NO NEW PARAMETER. Adding
//     `p_questions` would have created a SECOND overload of `snapshot_platform_scoreboard` --
//     `CREATE OR REPLACE` only replaces the exact identity argument list it already matches -- and
//     PostgREST then cannot resolve the 4-argument call the runbook's close-out makes, which
//     surfaces as an EMPTY RESULT rather than a crash (`.claude/rules/supabase-function-signature.md`,
//     found live at `DAT-12`). The identity args are unchanged and exactly one overload of each
//     function remains; those are pg_proc facts, declared not-run below with the numbers measured at
//     this ship rather than asserted from a file this test can read.
//
// (4) `0` IS NOT `NULL`, WHICH IS THE WHOLE DISCRIMINATOR WHILE THE COUNT IS ZERO. Live at this
//     ship `runner_questions` holds 40 rows, 17 open, and ZERO asked in the trailing 7 days -- so
//     the honest value of the new column is 0. A column that was added but never computed reads
//     NULL, and NULL grades as `unmeasurable` forever on `ticket_outcome` rather than as a met
//     target. The live arm below therefore refuses a NULL on any row taken AFTER the migration
//     landed, and reconciles a non-NULL against the count read separately from `runner_questions`.
//     Rows taken BEFORE it read NULL by design: they never measured it, and a backfilled zero would
//     be a measurement nobody took.
//
// (5) THE WINDOW IS TRAILING 7 DAYS, NOT THE SCOREBOARD WEEK. `week_start` rolls over on a fixed
//     boundary; a claim graded 72 h after a ship that straddles it would be handed a `held` by the
//     calendar rather than by anything the ticket did. `cron_silence_hours` already uses the
//     trailing window for that reason, and this column matches it.
//
// NO WRITES ANYWHERE IN THIS FILE, so no before-images are owed. Every live arm is a GET or a
// read-only RPC; nothing stamps the board, and nothing inserts a question.

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const SETUP = "docs/runbooks/session-setup.md";
const CYCLE = "docs/runbooks/runner-cycle.md";
const JOHN = "docs/WORKING-WITH-JOHN.md";

// SES-336's ceiling and the LAST MEASURED size of the runbook, re-measured by every ship that
// edits it. v7.0.538 (SES-424 slice 6) appended ` --patterns-applied=<answer.patterns_applied>` to
// the three `scripts/agent-log.js` blocks (+135 B, 45 each) -- which did not fit under the ceiling,
// so 296 B came OUT first, in the same commit and before the additions: two dated measurements the
// cycle's own §2 counts had superseded (step 6's "Measured 2026-09-12 -- 2 Designer and 1 Builder
// rows" sentence, 196 B, and step 6b's "the Builder's half is the thinner of the two: 1 row" clause,
// 100 B), both kept verbatim in docs/harvests/SES-424-slice6.md. 380879 - 296 + 135 = 380718 B, 282 B
// under the ceiling. The ceiling itself is NEVER raised to make an edit fit.
//
// v7.0.555 (AGT-86 slice 8b) moved step 4d to a pointer at docs/runbooks/auditor-routine.md (-2,701 B
// for the step, +~250 B for the pointer, +~70 B at :4720 for the fifteenth restorable table, the
// v7.0.519 stamp dropped and a v7.0.555 stamp added): 380718 -> 378273 B, 2,727 B under the ceiling.
// Re-pinned by v7.0.557 in the same push.
//
// v7.0.565 (AGT-87) replaced the stale cadence literals in step 1b and two outliers with the rule
// that points at `runner_settings.interval_hours` and the routine (prose only, no value changed):
// 379678 -> 380144 B, 856 B under the ceiling. Re-pinned in the same commit that edits the runbook.
export const RUNBOOK_CEILING = 381000;
//
// v7.0.567 (AGT-89) corrected two sentences about the automation lane at the M5-02 block:
// "SITS ABOVE ALL SIX ORDER CLAUSES" -> "IS THE LEADING OF OD-01'S SIX ORDER CLAUSES", and the
// rank domain "(1-6; NULL = not in the lane)" -> the open-ended integer it actually is (measured
// live this ship: min -45, max 23 over 177 ranked rows). The edit adds +109 B. It landed on top of
// v7.0.565's 380144 rather than the 379678 it was written against, so the pin is the RE-MEASURED
// post-rebase byte count, never either side of the conflict: 380144 -> 380253 B, 747 B under the
// ceiling. Re-measured with wc -c after the rebase and re-pinned in the same commit.
// v7.0.585 (AGT-127) adds the `gate_cards_to_rule` boot branch to refusal 6 and the gate-card
// ruling call to 7b, and REMOVES bytes first, as the pin requires: the archived-pointer
// paragraph, refusal 2's restated staleness rationale and its restated one-home sentence, the
// self-read tail, and 7b's verbatim quotation of the sentence SES-315 retired. Net 380667 ->
// 380976 B, 24 B under the ceiling. Re-measured with wc -c and re-pinned in the same commit.
// v7.0.602 (AGT-137) adds step 9's (7e) -- the Auditor's per-run review -- and, as the pin
// requires, takes the bytes OUT first: (7d)'s dead-history parenthetical about the ONE
// hand-written `runner_staff_findings` row (163 B, kept in the (7d) block's own history) and the
// OLDEST header stamp, `v7.0.520` (282 B; SES-164 grep FIRST -- its subject, step 6 exit 1's two
// `kind` branches, lives in step 6's own span and is pinned by ses-378h-lane-refusal-kind.test.mjs).
// 445 B out, 438 B in (this ship's stamp 158 B, so the count stays 5; (7e) 280 B): 380976 ->
// 380969 B, 31 B under the ceiling. Re-measured with wc -c and re-pinned in the same commit.
// v7.0.604 (AGT-140) retargets the E1 clause at step 0's project paragraph -- "exactly one row is
// `executing` at a time, and that row IS the execution authority" (81 B) -> "every `executing` row
// is an execution authority, ranked by `priority`" (69 B) -- and step 7's (b), which named the one
// executing row and `moat-support` as today's (108 B) -> the executing row that owns the queue's
// first row, three today, ranked by `priority` (131 B). 189 B out, 200 B in: 380969 -> 380980 B,
// 20 B under the ceiling. Re-measured with wc -c and re-pinned in the same commit.
// v7.0.608 (AGT-138) RETIRES step 4b to a pointer at docs/runbooks/researcher-routine.md -- the
// Researcher now runs in its own routine, so a cycle no longer runs the invention pass. The whole
// method (the orchestration statements, (1-legacy)-(4-legacy) under ledger entry 48, the filing
// items and the Reverse ceremony) MOVED verbatim into that playbook rather than being deleted, and
// the step stays in place as one 4d-shaped line so ses-336's step list and the runbook's nine
// "step 4b" cross-references still resolve. 10,763 B out, 202 B in (the pointer line): 380980 ->
// 370419 B, 10,581 B under the ceiling -- the only re-pin here that LOWERS the number. Re-measured
// with wc -c and re-pinned in the same commit as the removal, which is what ses-424f:291 asserts.
// v7.0.610 (AGT-133) adds step 9's (7f) (The Development Manager rules (7e)'s findings, ~2,750 B),
// step 7's mid-build fix-now-or-capture rule (~1,530 B) and the filing-sites rewrite (~1,080 B);
// deletes the five `push notification` sites and converts step 0b's and step 1's notifications into
// rows; and rotates v7.0.531 out (~1,050 B) after RELOCATING its three zero-hit facts into 0b and
// step 9 (SES-164 step 2, by grep first). Net 370419 -> 377625 B, 3,375 B under the ceiling.
// Re-measured with wc -c and re-pinned in the same commit as the edit.
// v7.0.625 (AGT-183) amends step 5's rule (c) ADDITIVELY -- a recorded pass-over is not a MANAGER
// MISMATCH, and a pick path that moved because this cycle holds the pick's own claim is not drift
// (+1,689 B, appended INSIDE the existing lines of (c) so the file's line count is unchanged at 4,706
// and the step-5 L-anchors `docs/runbooks/cycle-card.md` and `ses-378` pin stay valid). No stamp
// rotation: HEADER_STAMPS is still 5 and `ses-424c` pins v7.0.610's stamp as line 1, so a sixth or a
// re-ordered stamp would turn a green guard red. Net 377625 -> 379314 B, 1,686 B under the ceiling.
// v7.0.639 (AGT-166) appends ONE sentence to the Accept-writes-`done` block (line 909, the end of the
// Reverse bullet -- the kickoff said :908, which would have split that bullet's own sentence): a close
// over a standing `block` is legal only when ratified. No new line and no stamp rotation, so the file is
// still 4,706 lines and HEADER_STAMPS is still 5. Net 379314 -> 379539 B, 1,461 B under the ceiling.
// Re-measured with wc -c and re-pinned in the same commit as the edit.
// v7.0.640 (AGT-202) deletes `week:W, ` at :1291 and :2974 (16 B); no stamp, line count 4,706 held.
// Net 379314 -> 379298 B, 1,702 B under the ceiling. Re-measured with wc -c and re-pinned in the same commit.
// v7.0.641 (AGT-171) fuses step 9's (6) close with the publish-lease release into ONE statement and
// retires (7): step 1's release paragraph and its block come OUT (-10 lines), step 9 gains the fused
// block, 0b's probe (c) also flags a CLOSED holder, and v7.0.532 is ROTATED OUT after RELOCATING its
// two zero-hit facts (`fd4e11f4`, 32,249,570) into step 1's Reading 0 (SES-164 step 2, by grep first).
// Net 379523 -> 380003 B, 997 B under the ceiling. Re-measured with wc -c and
// re-pinned in the same commit as the edit.
//
// v7.0.645 (AGT-175) has four runbook lines stop restating what a row or a function decides: step 4c
// cites `rankedTodayCycle()` instead of spelling out its once-per-day precondition, step 5(b) reads
// the executing project off `prime_directive_queue()`'s `lane_note` instead of counting projects in
// prose, and step 7 stops offering `partial` as a cycle close. Net 380003 -> 379993 B, 1,007 B under
// the ceiling -- a citation is shorter than the fact it points at. Re-measured with wc -c and
// re-pinned in the same commit as the edit.
// v7.0.648 (AGT-173 R1) appends ONE clause to the Standing prohibitions Never: paragraph at :4654, on
// that same line -- the record may not quote any commit sha but the one CI graded, because the rebase
// that runs before the push rewrites every artifact commit. No newline, so the line count holds at
// 4,710 and every L-anchor below it is unmoved; no stamp, so HEADER_STAMPS stays 5 and `ses-424c` keeps v7.0.610 as
// line 1. The clause reads `the rebase before the push` where the kickoff wrote `the pre-push rebase`,
// because the residue ratchet in `agt-133-run-tail-review.test.mjs` matches `re-push` INSIDE the word
// `pre-push` and counted a push instruction this clause does not contain -- 277 B, not the 270 the
// kickoff projected.
// Net 379993 -> 380270 B, 730 B under the ceiling. Re-measured with wc -c and re-pinned in the
// same commit as the edit.
//
// v7.0.650 (AGT-185) stops step 6 reciting a flat file/task pair 125 lines after step 5a computed
// the real one, and rotates the header: v7.0.650 in at line 1, v7.0.535 out, its one zero-hit fact
// relocated into the body under SES-164 step 2. Measured ON THE REBASED tree, not on the tree the
// build ran against: the peer ship v7.0.648 had moved the baseline to 380270 B, so this stamp no
// longer fit and the STAMP WAS TRIMMED rather than the ceiling raised -- net 380270 -> 380967 B, 33 B
// under SES-336's ceiling. A stamp costs more than the sentence it records, and 33 B of headroom on
// a 381,000 B ceiling is REPORTED, not absorbed: the next byte any cycle adds needs a real trim.
// Re-measured with wc -c and re-pinned in the same commit as the edit.
//
// v7.0.656 (AGT-199) makes the serial tail's (4) re-render CLAUDE-STATE.md after step 9 has filed
// the ship card, so the committed bullets stop rendering from a card that does not exist yet. With
// 33 B of headroom the sentence had to pay for itself: two removals, each a single occurrence
// file-wide and each already homed in docs/SESSIONS.md -- the `SES-109` one-harvest-staleness
// history (71 B) and ", and it fires only on cycles that actually changed the board" (61 B, a
// restatement of the `unchanged` clause three lines above it and newly FALSE, because a fresh ship
// card diffs CLAUDE-STATE.md every cycle). No sixth header stamp: a stamp costs agt-133,
// ses-424c and docs/SESSIONS.md on top of these three files, which the 3-file cap does not buy.
// Net 380967 -> 380925 B, 75 B under the ceiling -- 42 B of that is headroom this ship did NOT
// spend, and like the 33 B above it is REPORTED, not absorbed. Re-measured with wc -c and
// re-pinned in the same commit as the edit.
//
// v7.0.654 (AGT-128) edits ONE runbook clause: trigger 2 of the close-out's status rule now reads "a
// STOP LINE closing THIS ticket `partial`" instead of "naming `partial`", and drops one now-redundant
// word from the gate-card half of the same sentence. MEASURED ON THE REBASED TREE, not on the tree the
// build ran against: the peer ships v7.0.653/v7.0.656 trimmed the baseline 380967 -> 380925 B while
// this ticket sat blocked on a 3.5h Supabase outage, so the 380974 the build first measured was STALE
// by the time it could land and was re-measured rather than carried -- which is this comment block's
// own standing warning, obeyed. Net 380925 -> 380932 B, 68 B under the ceiling. NO STAMP WAS ROTATED
// IN and that is the decision, not an oversight: ses-424c pins v7.0.650 as stamps[0], so a stamp for a
// one-line clause would cost a drop, a docs/SESSIONS.md append and two more test edits. The 68 B of
// headroom is REPORTED, not absorbed. Re-measured with wc -c and re-pinned in the same commit.
//
// v7.0.658 (AGT-237) adds refusal 6 `db_pressure`, Gate F, the heartbeat's db_level and step 7's
// hold rule, and rotates the header (v7.0.658 in at line 1, v7.0.555 out to docs/SESSIONS.md, both
// its facts keeping body hits). The additions were cut to fit under agt-138's PRE_CHANGE_BYTES
// (380980, which the runbook must stay below): net 380932 -> 380973 B, 27 B under SES-336's ceiling.
// That headroom is REPORTED, not absorbed: the next byte any cycle adds needs a real trim. Re-measured with wc -c and re-pinned in the same commit as the edit.
//
// v7.0.659 (AGT-170) arms the regression delta: step 7 captures the baseline, 7a passes
// --regression-baseline=, step 9 quotes 7a's delta: line; E1-E3 trim rationale to pay for it.
// Net -68 B: 380973 -> 380905. No header stamp (ses-424c pins stamps[0]). Re-measured with wc -c
// on the tree rebased onto AGT-237.
//
// v7.0.665 (AGT-147) strips the two literal model ids that still sat beside a lane name in prose
// (step 6's judgment sub-agent, step 7's orchestrator sub-agent) — the lane is the address, the
// model is a public.model_assignments row. The rendered {{lanes}} block keeps its three ids and is
// untouched. Net -43 B: 380905 -> 380862, so the edit PAID for itself and added no headroom debt.
// No header stamp, same reason AGT-170 gave: ses-424c and agt-133 both pin stamps[0] to v7.0.658,
// and at 138 B of headroom a ~290 B stamp could not land anyway. Re-measured with wc -c.
// v7.0.687 (AGT-166 s4) adds 74 B to step 6's rule (1): the rule reads "never writes `status`", and a
// judged refusal now writes exactly one — `removal proposed`, under its own reversible decision. The
// clause names the exception in place rather than leaving the runbook contradicting the shipped code
// (no new line, no new header stamp — ses-424c pins stamps[0]). Net +74 B: 380862 -> 380936, 64 B under
// SES-336's ceiling. Re-measured with wc -c on this tree.
// v7.0.689 (AGT-265) adds `lanes_full` as refusal 7 of nine in step 0's ladder (one new line, 8 -> 9
// renumber, "eight" -> "nine", +63 B) and line 1's tail becomes `AGT-237/265 — lanes. -->` (−13 B;
// stamps[0] keeps its v7.0.658 AGT-237 prefix for ses-424c). agt-138 requires the file stay under its
// 380980 B pre-change mark, and the SES-298/302 pointer stays (ses-336 needs entry A), so the bytes
// came from step 0's meter-age prose (−28 B). Net +22 B: 380936 -> 380958. Re-measured with wc -c.
// v7.0.690 (AGT-245) arms the delta gate's doc half on top of that: step 7's capture line names `$S` as
// the scratchpad (+13 B) and 7a's hand-off loses the LITERAL two-character `\n` that had been gluing
// `--regression-baseline` onto `--changed-files`' value (byte-neutral, the block stays 381 B). Net +13 B:
// 380958 -> 380971, 29 B under SES-336's ceiling. No header stamp (ses-424c pins stamps[0]), so
// HEADER_STAMPS stays 5. Re-measured with wc -c on this tree, in the same commit as the runbook edit and
// the card re-render.
// v7.0.694 (AGT-133 slice 3) converts the runner's three alarms from a push to a `john_alerts` row: the
// eight replacements net -373 B (the THE ALERT ROW paragraph and its sql block cost bytes, the 0f292cfa
// quotation and the ONE PUSH PER HOLE rule give back more). No header stamp. Re-measured with wc -c.
// v7.0.696 (AGT-136 slice 2) adds step 9's `(7g)` -- THE DESIGNER RULES, the second desk and the first
// runbook line that names `scripts/design-ruling.js` (462 B, agt-136's RUNBOOK_NAMES_SCRIPT flips true) --
// and, as the pin requires, takes the bytes OUT of the `(7d)` block FIRST: its "close the tail" opener,
// the exit-2 parenthetical, the whole `fingerprintFor()` grouping sentence (its subject has ONE home in
// `scripts/staff-watch.js` and is pinned by ses-378f/g/h), and the John-rules-the-promotion clause, which
// (7d) now hands to `(7g)` instead. 483 B out, 462 B in. Re-measured with wc -c AFTER the rebase onto
// AGT-133 slice 3's -373 B, never carried over from the pre-rebase tree: 380598 -> 380577 B, 423 B under
// SES-336's ceiling. No header stamp (ses-424c pins stamps[0]), so HEADER_STAMPS stays 5.
// v7.0.699 (AGT-159) adds ONE command to `(7f)`: the backlog-review raise, its exit-3 meaning, its
// progress line's home in `notes` and its never-gates clause, +343 B. No header stamp (ses-424c pins
// stamps[0]), so HEADER_STAMPS stays 5. Re-measured with wc -c AFTER the rebase onto AGT-136 slice 2's
// -21 B, never carried over from the pre-rebase tree: 380577 -> 380920 B. No stamp added.
// v7.0.701 (AGT-245 slice 4) adds step 9's `(7a-ter)` -- the delta re-grade of ONE delivered ticket, its
// command, its one-slot-both-legs rule, its frozen-cohort pair and its 0/1/2 exits (501 B) -- plus its item
// in the serial-tail list (94 B). BYTES FIRST, and against agt-138's 380980 bar rather than SES-336's
// 381000: three single-occurrence removals of prose already homed elsewhere paid for it -- SES-127's
// restated fail-direction clause at (5b) (134 B) and its restated no-publish-no-stamp justification
// (177 B), both restating the sentence that still stands beside them, and the SECOND copy of the
// "Re-assert the lease before the counter claim" sentence inside the (ceremony-legacy) block (239 B),
// whose first copy at step 6 stays. 550 B out, 595 B in. Net +45 B: 380920 -> 380965, 14 B under agt-138's
// bar and 35 B under SES-336's ceiling -- REPORTED, not absorbed. No header stamp (ses-424c pins
// stamps[0]), so HEADER_STAMPS stays 5. Re-measured with wc -c, re-pinned and the card re-rendered in the
// same commit as the runbook edit.
export const BYTES_AT_SHIP = 380949;   // 380945 -> 380949 (AGT-253 design-only clause)
export const HEADER_STAMPS = 5;

// The column, and the eight names the validator now accepts.
export const COLUMN = "questions_to_john_week";
export const METRICS = [
  "noship_cycles_week", "noship_tokens_week", "shipped_cycles_week", "tokens_per_shipped_cycle",
  "cycles_per_shipped_ticket", "cron_silence_hours", "hygiene_flags", COLUMN,
];

// The instant this slice's migration landed. A scoreboard row taken at or after it MUST carry a
// number; one taken before it carries NULL, because the column did not exist to be measured.
export const SHIP_FLOOR = "2026-09-18T13:10:00.000Z";

// The serial tail's step (4), sliced out of the runbook: its own `**(4)**` marker up to the
// `**(5)**` that follows it. AGT-199's clause asserts INSIDE this slice, never file-wide: both
// `render-claude-state.js` and `CLAUDE-STATE.md` occur elsewhere in the runbook (step 7a renders
// the file), so a file-wide includes() would read green no matter what the tail says.
const tail4 = s => {
  const a = s.indexOf("**(4)** re-export the backlog snapshot");
  const b = s.indexOf("**(5)** rebuild cards", a);
  return a < 0 || b < 0 ? "" : s.slice(a, b);
};

// Every doc clause as {id, file, test, breaks, detail}. `breaks` is the clause's OWN mutation: the
// smallest edit that should make it red. Green-after-mutation is a failure of this file, not a pass.
export const CLAUSES = [
  {
    id: "setup-says-eight",
    file: SETUP,
    detail: "the claimable metric names are now EIGHT, and the sentence that said seven is gone",
    test: s => s.includes("and the eight metric names are exactly") && !s.includes("the seven metric names"),
    breaks: s => s.replace("and the eight metric names are exactly", "and the seven metric names are exactly"),
  },
  {
    id: "setup-lists-the-column",
    file: SETUP,
    detail: `\`${COLUMN}\` is listed after \`hygiene_flags\`, so the list and the count agree`,
    test: s => /`hygiene_flags`,\s*\n?\s*`questions_to_john_week`/.test(s),
    breaks: s => s.replace("`hygiene_flags`, `questions_to_john_week`", "`hygiene_flags`"),
  },
  {
    id: "setup-six-standing-numbers",
    file: SETUP,
    detail: "the stamp records SIX standing numbers now, not five",
    test: s => s.includes("records the platform's six standing numbers at that moment")
      && !s.includes("five standing numbers"),
    breaks: s => s.replace("six standing numbers", "five standing numbers"),
  },
  {
    id: "setup-other-five-computed",
    file: SETUP,
    detail: "the hand-supplied flag count aside, FIVE numbers are computed by the function itself",
    test: s => s.includes("the other five numbers are computed from") && !s.includes("the other four numbers"),
    breaks: s => s.replace("the other five numbers", "the other four numbers"),
  },
  {
    id: "cycle-says-eight",
    file: CYCLE,
    detail: "step 7b's validator warning names EIGHT metric names, the validator's sole home",
    test: s => /`public\.outcome_claim_is_valid\(text\)`, whose eight\n\s*metric names are that function's sole home/.test(s),
    breaks: s => s.replace("whose eight\n  metric names", "whose seven\n  metric names"),
  },
  {
    id: "john-carries-the-shipped-fact",
    file: JOHN,
    detail: "WORKING-WITH-JOHN.md states the SHIPPED column, not a promise about a future slice",
    test: s => s.includes(`platform_scoreboard.${COLUMN}`)
      && s.includes("trailing 7 days")
      && s.includes("public.ticket_outcome")
      && !s.includes("becomes a scoreboard column in slice 4"),
    breaks: s => s.replace(`platform_scoreboard.${COLUMN}`, "becomes a scoreboard column in slice 4"),
  },
  {
    id: "cycle-tail-rerenders-the-state",
    file: CYCLE,
    detail: "the serial tail's (4) re-renders CLAUDE-STATE.md -- naming both the renderer and the "
      + "file -- because step 9 files the ship card BEFORE the tail runs, so the copy step 7a "
      + "committed renders from a card that does not exist yet (AGT-199)",
    test: s => {
      const t = tail4(s);
      return t.includes("node scripts/render-claude-state.js") && t.includes("`CLAUDE-STATE.md`");
    },
    breaks: s => s.replace("node scripts/render-claude-state.js` because your ship card",
      "node scripts/export-backlog-snapshot.js` because your ship card"),
  },
];

// == (1) the docs, each clause with its own mutation control =====================================
function theDocsCarryTheEighthMetric() {
  const done = [];
  for (const c of CLAUSES) {
    const s = read(c.file);
    assert.ok(c.test(s), `${c.file} lost clause "${c.id}": ${c.detail}`);
    const mutated = c.breaks(s);
    assert.notStrictEqual(mutated, s,
      `control: the mutation for "${c.id}" changed nothing -- the clause is asserting against text `
      + "that is not there, so its green says nothing (the SES-158 failure)");
    assert.ok(!c.test(mutated),
      `control: clause "${c.id}" still passes after its own subject was mutated away -- the arm is vacuous`);
    done.push(c.id);
  }
  assert.strictEqual(done.length, CLAUSES.length);
  return done;
}

// == (2) the ceiling, and the stamp count that shares it =========================================
function theRunbookCeilingHeld() {
  const bytes = Buffer.byteLength(fs.readFileSync(path.join(ROOT, CYCLE)), "utf8");
  assert.ok(bytes <= RUNBOOK_CEILING,
    `${CYCLE} is ${bytes} B against SES-336's ${RUNBOOK_CEILING} B ceiling. The ceiling is never `
    + "raised to fit an edit: drop an old header stamp (SES-164 grep FIRST, zero-hit facts RELOCATED, "
    + "not lost) or say it in fewer bytes.");
  assert.strictEqual(bytes, BYTES_AT_SHIP,
    `${CYCLE} must read exactly the ${BYTES_AT_SHIP} B its last editing ship measured. It reads `
    + `${bytes} B, which means something landed in the file without re-measuring the pin, with `
    + `${RUNBOOK_CEILING - bytes} B of headroom left to account for. Re-measure with wc -c and move `
    + "the constant in the same commit -- never raise the CEILING to fit an edit.");

  const stamps = read(CYCLE).split("\n").filter(l => l.startsWith("<!-- DeepBench v"));
  assert.strictEqual(stamps.length, HEADER_STAMPS,
    `agt-70-auditor.test.mjs pins ${CYCLE} at exactly ${HEADER_STAMPS} header stamps; got `
    + `${stamps.length}. A ship that adds one rotates one out (SES-164 step 2 by grep FIRST).`);
  return { bytes, stamps: stamps.length };
}

export default async function run() {
  const clauses = theDocsCarryTheEighthMetric();   // (1)
  const ceiling = theRunbookCeilingHeld();         // (2)

  const pure = `${clauses.length} doc clauses hold, each red under its own mutation `
    + `(${clauses.join(", ")}); ${CYCLE} is ${ceiling.bytes} B of ${RUNBOOK_CEILING} with `
    + `${ceiling.stamps} header stamps`;

  // The two facts this file cannot read from disk. Declared, with the numbers measured at this ship
  // over MCP, rather than asserted from something weaker that would look like a check.
  notRun(
    "SES-413d: exactly ONE overload each of public.snapshot_platform_scoreboard and "
    + "public.outcome_claim_is_valid, and public.ticket_outcome's `ship` CTE naming every metric column",
    "pg_proc and pg_get_viewdef are not reachable over PostgREST; the migration asserts both in a "
    + "trailing DO block in the SAME transaction that wrote them, and they were re-read after it. "
    + "Measured at this ship (2026-09-18, v7.0.523): snapshot_platform_scoreboard overloads = 1, "
    + "identity (p_trigger text, p_backlog_id text, p_push_sha text, p_hygiene_flags integer, "
    + "p_notes text) -- UNCHANGED, no parameter added; outcome_claim_is_valid overloads = 1, "
    + "identity (claim text); platform_scoreboard = 15 columns / 8 metrics; ticket_outcome's ship "
    + "CTE names all 8 and its 15 output columns kept their names and positions.",
  );

  // == LIVE ======================================================================================
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    notRun(
      `SES-413d live: outcome_claim_is_valid accepts '${COLUMN}: down' and rejects both `
      + `'${COLUMN}: sideways' and the near-miss 'questions_to_john: down'; the newest `
      + "platform_scoreboard row projects the new column over the service key",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY not set; export them from public.runner_secrets by name "
      + "(docs/runbooks/session-setup.md step 1b) and re-run: "
      + "SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node tests/regression/run-all.js. "
      + "Measured at this ship instead: the validator returned true / false / false in that order "
      + "(and true for the control 'hygiene_flags: down'); runner_questions held 40 rows, 17 open "
      + "and 0 asked in the trailing 7 days, so the honest value of the column is 0; the rolled-back "
      + "probe printed `PROBE before=0 after=1` with zero residue (40 / 52 re-read after), which is "
      + "what proves 0 is a measurement and not a NULL.",
    );
    console.log(`  [SES-413d] ${pure}; live declared NOT RUN`);
    return;
  }

  const base = url.replace(/\/+$/, "");
  const hdr = k => ({ apikey: k, Authorization: `Bearer ${k}`, "Content-Type": "application/json" });
  const get = async q => {
    const r = await fetch(`${base}/rest/v1/${q}`, { headers: hdr(key) });
    if (!r.ok) assert.fail(`PostgREST ${r.status} on GET ${q}: ${await r.text()}`);
    return r.json();
  };
  const valid = async claim => {
    const r = await fetch(`${base}/rest/v1/rpc/outcome_claim_is_valid`,
      { method: "POST", headers: hdr(key), body: JSON.stringify({ claim }) });
    if (!r.ok) assert.fail(`rpc/outcome_claim_is_valid returned HTTP ${r.status} for ${JSON.stringify(claim)}: ${await r.text()}`);
    return r.json();
  };

  // -- the validator, both directions, plus the near-miss ----------------------------------------
  assert.strictEqual(await valid(`${COLUMN}: down`), true,
    `outcome_claim_is_valid must ACCEPT '${COLUMN}: down' -- CHECK ck_backlog_outcome_claim calls it, `
    + "so a rejection here means the metric cannot be claimed at filing and the promise stays ungraded");
  assert.strictEqual(await valid(`${COLUMN}: sideways`), false,
    `'${COLUMN}: sideways' must be REJECTED: the direction half is 'up' or 'down', and a validator `
    + "that waved the name through whatever followed it would accept a claim ticket_outcome cannot grade");
  assert.strictEqual(await valid("questions_to_john: down"), false,
    "the NEAR MISS 'questions_to_john: down' must be rejected -- it is the mistake a reader of the "
    + "brief actually makes, and a prefix or fuzzy match would file a claim against a column that "
    + "does not exist, which grades `unmeasurable` three days later instead of failing at filing");
  assert.strictEqual(await valid("hygiene_flags: down"), true,
    "control: an ORIGINAL metric name must still be accepted -- if this went false the validator was "
    + "replaced rather than extended, and every ticket already claiming one of the seven is now unfileable");

  // -- the column reads, and 0 is not NULL -------------------------------------------------------
  // Naming the column explicitly is itself the check: a projection of a column PostgREST does not
  // know is a 400, so this GET cannot pass against a board that never got the column.
  const newest = await get(`platform_scoreboard?select=id,taken_at,trigger,${COLUMN}&order=taken_at.desc&limit=1`);
  assert.strictEqual(newest.length, 1, "platform_scoreboard has no rows -- the series never started");
  const row = newest[0];
  assert.ok(Object.prototype.hasOwnProperty.call(row, COLUMN),
    `the newest scoreboard row must PROJECT \`${COLUMN}\`; got keys ${Object.keys(row).join(", ")}`);

  const asked = await get(
    `runner_questions?select=qid&asked_at=gte.${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}&limit=1000`);
  const expected = asked.length;

  if (row[COLUMN] === null) {
    assert.ok(Date.parse(row.taken_at) < Date.parse(SHIP_FLOOR),
      `the newest scoreboard row (${row.taken_at}) was taken AFTER this slice landed (${SHIP_FLOOR}) `
      + `and still reads NULL for \`${COLUMN}\`. A column added but never computed grades `
      + "`unmeasurable` FOREVER on ticket_outcome -- which is the exact failure this slice exists to "
      + `prevent, and it is invisible while the honest count is 0. Expected ${expected}.`);
    console.log(`  [SES-413d] ${pure}; live: validator true/false/false (+ control true); newest row `
      + `${row.taken_at} predates the ship floor and reads NULL by design (never measured, not zero); `
      + `${expected} question(s) asked in the trailing 7 days`);
  } else {
    assert.ok(Number.isInteger(row[COLUMN]) && row[COLUMN] >= 0,
      `\`${COLUMN}\` must be a non-negative integer; got ${JSON.stringify(row[COLUMN])}`);
    assert.strictEqual(row[COLUMN], expected,
      `\`${COLUMN}\` on the newest row reads ${row[COLUMN]} but runner_questions holds ${expected} row(s) `
      + "asked in the trailing 7 days. The two are the same measurement taken twice; a disagreement "
      + "means the function counted the wrong table, the wrong window, or a filtered subset of statuses "
      + "(every row asked counts, whatever its status).");
    console.log(`  [SES-413d] ${pure}; live: validator true/false/false (+ control true); newest row `
      + `${row.taken_at} (${row.trigger}) reads ${row[COLUMN]}, reconciled against ${expected} `
      + "question(s) asked in the trailing 7 days -- a measured value, not a NULL");
  }

  // -- the anon key cannot read the board at all -------------------------------------------------
  if (anon) {
    const denied = await fetch(`${base}/rest/v1/platform_scoreboard?select=${COLUMN}&limit=1`, { headers: hdr(anon) });
    assert.ok(!denied.ok && denied.status >= 400 && denied.status < 500,
      `the anon key read \`${COLUMN}\` off platform_scoreboard (HTTP ${denied.status}) -- the board `
      + "holds postgres and service_role grants ONLY, and a public read of it is a leak, not a feature");
  } else {
    notRun(
      `SES-413d: the anon key gets a 4xx projecting \`${COLUMN}\` off platform_scoreboard`,
      "VITE_SUPABASE_ANON_KEY absent; the service-role arms above still ran. Measured over MCP at "
      + "this ship instead: information_schema.role_table_grants shows platform_scoreboard granted to "
      + "postgres and service_role ONLY -- anon and authenticated hold NO privilege of any type on the "
      + "table, so the new column is unreachable with the browser key by construction and needed no "
      + "column-grant work (.claude/rules/supabase-column-grants.md). That also means it fails CLOSED: "
      + "a future public reader of this table must be granted the column explicitly.",
    );
  }
}

selfRun(import.meta.url, run);
