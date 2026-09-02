// DeepBench v7.0.398 | tests/regression/SES-181-verifier.js | SES-122 (b) -- the ladder branches and
// the spawn quoting. Two additions, both of which FAIL on unchanged source (autoDoneEligibility
// ignored `classAutonomy`; spawnCommandFor did not exist):
//
//   theLadderGrantsTheBarByRung()        a class the ladder has promoted takes the bar on ANY epic,
//                                        because a rung is a fact about the work CLASS -- with the
//                                        same fixture at auto_done false asserted to lose, so it is
//                                        the boolean doing the work and not the object's presence.
//   aRungNeverBuysPastSelfCertification() charter premise 3 outranks any rung. THE assertion of this
//                                        part: the grant skips the scope tests, it must not skip the
//                                        refusal, and this ship's own diff is the live instance.
//   theLadderIsReadStrictlyAndNullIsNotInnocent()  auto_done === true and nothing else.
//   spawnCommandIsQuotedOnlyForTheShell()  `C:\Program Files\nodejs\node.exe` quoted when the shell
//                                        will split it, UNTOUCHED when it is argv[0].
//
// DeepBench v7.0.247 | tests/regression/SES-181-verifier.js | SES-181 (Selfbuild M3 - Independent
// Verification)
//
// Guards the reviewer lane's two rules: the verdict rule (approve iff all three mechanical gates are
// GREEN) and the interim auto-done scope (charter decision 2 -- Selfbuild epic family, P10 - Tooling
// only). Both are IMPORTED from scripts/verifier.js, never restated here, so a later widening moves
// these assertions with it and is visible in this file's diff rather than silent. That convention is
// SES-199's (GATING_CHECKS) and John's standing line behind it: "you should never be throwing away
// tests."
//
// THE ONE ASSERTION THAT CARRIES THIS TICKET, and the reason the suite is not merely complete here:
// a gate that COULD NOT RUN must produce `block`, not `approve`. An implementation that collapsed
// 'skipped' into 'green' -- the natural shape if you write `exitCode !== 1` or default a missing
// gate to pass -- returns approve on a build that never happened, which is SES-199's rubber stamp
// with a bigger blast radius. Every skipped-arm assertion below is paired with the same fixture in
// its green form, so "would this still pass if the fail-closed rule did nothing?" answers no.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  GATES,
  AUTO_DONE_EPIC_PREFIX,
  AUTO_DONE_CLASS_PREFIX,
  SELF_CERTIFYING_PATHS,
  gateStatus,
  verdictFor,
  autoDoneEligibility,
  selfCertificationBlock,
  spawnCommandFor,
} from "../../scripts/verifier.js";

const ALL_GREEN = { build: "green", regression: "green", hygiene: "green" };

// ---------------------------------------------------------------------------
// The gating set is the charter's interim bar, and the hygiene gate is the SES-199 form
// ---------------------------------------------------------------------------
function gatingSetIsTheCharterBar() {
  assert.deepStrictEqual(
    GATES.map(g => g.key),
    ["build", "regression", "hygiene"],
    "charter decision 2 names build + regression + hygiene tripwire. Changing this set is a decision: " +
    "move the header's reasoning and this assertion together, never the set alone."
  );

  const hygiene = GATES.find(g => g.key === "hygiene");
  assert.ok(
    hygiene.argv.includes("--gate"),
    "the hygiene gate MUST use check-session-docs.js --gate. The bare form exits 0 on every path " +
    "(that is the whole of SES-199), so without the flag this gate can never be red and the verifier " +
    "rubber-stamps by construction."
  );
}

// ---------------------------------------------------------------------------
// gateStatus: three values, and 'skipped' is not 'green'
// ---------------------------------------------------------------------------
function gateStatusHasThreeValues() {
  assert.strictEqual(gateStatus({ ran: true, exitCode: 0 }), "green");
  assert.strictEqual(gateStatus({ ran: true, exitCode: 1 }), "red");
  assert.strictEqual(gateStatus({ ran: true, exitCode: 2 }), "red");

  // A process killed by a signal reports status null. NEGATIVE CONTROL for the same input shape:
  // exit 0 above is green, so it is the null -- not the call -- doing the work here.
  assert.strictEqual(gateStatus({ ran: true, exitCode: null }), "skipped");
  assert.strictEqual(gateStatus({ ran: false, exitCode: 0 }), "skipped",
    "a gate that never ran is skipped even if a stale exit code says 0 -- the exit code of a command " +
    "that did not run is not evidence about the change");
}

// ---------------------------------------------------------------------------
// The verdict rule
// ---------------------------------------------------------------------------
function allGreenApproves() {
  const v = verdictFor(ALL_GREEN);
  assert.strictEqual(v.verdict, "approve");
  assert.ok(v.reasoning.trim().length > 0,
    "reasoning is required by ck_runner_verdicts_reasoning -- a verdict with no reason is rejected by " +
    "the database, so an empty one here is a runtime failure, not a cosmetic gap");
}

function anyRedBlocks() {
  for (const key of GATES.map(g => g.key)) {
    const gates = { ...ALL_GREEN, [key]: "red" };
    assert.strictEqual(verdictFor(gates).verdict, "block", `a red ${key} gate must block`);
    // NEGATIVE CONTROL: the same fixture with that one gate green approves, so it is the red value
    // deciding the verdict rather than the shape of the object.
    assert.strictEqual(verdictFor({ ...gates, [key]: "green" }).verdict, "approve");
  }
}

function anySkippedBlocks() {
  for (const key of GATES.map(g => g.key)) {
    const gates = { ...ALL_GREEN, [key]: "skipped" };
    const v = verdictFor(gates);
    assert.strictEqual(v.verdict, "block",
      `a SKIPPED ${key} gate must block. This is the fail-closed rule: an implementation that treats ` +
      `"not red" as green approves a change whose ${key} gate never ran.`);
    assert.ok(/COULD NOT RUN/.test(v.reasoning),
      "the reasoning must say the gate could not run, not merely that it was not green -- John reads " +
      "this line on the card and 'red' and 'never ran' are different facts about the change");
    // NEGATIVE CONTROL: same fixture, that gate green -> approve.
    assert.strictEqual(verdictFor({ ...gates, [key]: "green" }).verdict, "approve");
  }
}

function aMissingGateIsSkippedNotAbsent() {
  // An object that simply omits a gate must not read as "nothing to check here".
  assert.strictEqual(verdictFor({ build: "green", regression: "green" }).verdict, "block",
    "an omitted gate defaults to skipped, never to green -- a caller that forgets to run one must not " +
    "get an approve for the omission");
  assert.strictEqual(verdictFor({}).verdict, "block");
}

// The property ck_runner_verdicts_fail_closed enforces in the database, asserted here over the whole
// input space so the two homes cannot drift: approve <=> all three green. 3^3 = 27 combinations.
function approveIffAllGreenAcrossEveryCombination() {
  const values = ["green", "red", "skipped"];
  let approves = 0;
  for (const build of values) {
    for (const regression of values) {
      for (const hygiene of values) {
        const gates = { build, regression, hygiene };
        const isAllGreen = build === "green" && regression === "green" && hygiene === "green";
        const v = verdictFor(gates);
        assert.strictEqual(v.verdict, isAllGreen ? "approve" : "block",
          `verdictFor(${JSON.stringify(gates)}) disagrees with ck_runner_verdicts_fail_closed`);
        if (v.verdict === "approve") approves++;
      }
    }
  }
  assert.strictEqual(approves, 1,
    "exactly one of the 27 gate combinations may approve. More than one means a non-green value is " +
    "being read as green somewhere.");
}

// ---------------------------------------------------------------------------
// Auto-done scope -- charter decision 2, and nothing wider
// ---------------------------------------------------------------------------
const ELIGIBLE = Object.freeze({
  verdict: "approve",
  epicName: `${AUTO_DONE_EPIC_PREFIX} M3 - Independent Verification`,
  priorityClass: `${AUTO_DONE_CLASS_PREFIX} - Tooling`,
  changedFiles: ["docs/runbooks/session-hygiene.md", "scripts/heal-engine.js"],
});

function theInterimBarIsMet() {
  const e = autoDoneEligibility(ELIGIBLE);
  assert.strictEqual(e.eligible, true);
  assert.ok(e.reason.trim().length > 0);
}

function eligibilityNeverOutrunsTheVerdict() {
  for (const verdict of ["block"]) {
    const e = autoDoneEligibility({ ...ELIGIBLE, verdict });
    assert.strictEqual(e.eligible, false,
      "a blocked change can never be auto-done -- ck_runner_verdicts_eligible_implies_approve says the " +
      "same thing in the database");
    assert.ok(/approve/.test(e.reason));
  }
  // NEGATIVE CONTROL: the identical fixture with verdict approve IS eligible, so the verdict is the
  // one variable doing the work.
  assert.strictEqual(autoDoneEligibility(ELIGIBLE).eligible, true);
}

function scopeIsTheSelfbuildFamilyOnly() {
  // The standing Automation epic is the nearest neighbour and the one most likely to be swept in.
  const other = autoDoneEligibility({ ...ELIGIBLE, epicName: "Automation" });
  assert.strictEqual(other.eligible, false,
    "charter decision 2 supersedes SES-154's John-only-writer rule for the Selfbuild family and NOTHING " +
    "else. A ticket in another epic still needs John's tap.");
  assert.ok(new RegExp(AUTO_DONE_EPIC_PREFIX).test(other.reason));

  // No epic at all fails closed rather than passing on a blank.
  assert.strictEqual(autoDoneEligibility({ ...ELIGIBLE, epicName: null }).eligible, false);
  assert.strictEqual(autoDoneEligibility({ ...ELIGIBLE, epicName: "" }).eligible, false);

  // NEGATIVE CONTROL: every Selfbuild milestone name must still qualify, or the scope test is
  // matching the exact string of one epic rather than the family.
  for (const m of ["M0", "M1", "M2", "M3", "M7"]) {
    assert.strictEqual(
      autoDoneEligibility({ ...ELIGIBLE, epicName: `${AUTO_DONE_EPIC_PREFIX} ${m} - whatever` }).eligible,
      true, `${AUTO_DONE_EPIC_PREFIX} ${m} is in the family`);
  }
}

function scopeIsToolingOnly() {
  // P9 - Bug Fixes is the live neighbouring class (heal tickets file into it), and a lexical
  // "starts with P1" test would also match P1 - Improves John's Skills -- both are checked.
  for (const cls of ["P9 - Bug Fixes", "P1 - Improves John's Skills", "P5 - Enhancements", null, ""]) {
    assert.strictEqual(autoDoneEligibility({ ...ELIGIBLE, priorityClass: cls }).eligible, false,
      `auto-accept is approved for ${AUTO_DONE_CLASS_PREFIX} - Tooling deliveries only; '${cls}' is not one`);
  }
  // A live suffix form must still qualify -- priority_class carries suffixes on this board
  // (recompute_backlog_queue()'s own header: 'P9 - Bug Fixes . FLAGGED', 19 tickets).
  assert.strictEqual(
    autoDoneEligibility({ ...ELIGIBLE, priorityClass: `${AUTO_DONE_CLASS_PREFIX} - Tooling · FLAGGED` }).eligible,
    true);
}

// ---------------------------------------------------------------------------
// No change certifies itself -- charter premise 3
// ---------------------------------------------------------------------------
function aChangeToTheVerificationCannotTakeTheBar() {
  for (const p of SELF_CERTIFYING_PATHS) {
    const e = autoDoneEligibility({ ...ELIGIBLE, changedFiles: ["docs/SESSIONS.md", p] });
    assert.strictEqual(e.eligible, false,
      `a delivery that changes ${p} is graded by the code it changed; charter premise 3 forbids the bar`);
    assert.ok(e.reason.includes(p), "the reason must name the file, or the next reader looks in the wrong place");
  }
  // NEGATIVE CONTROL: the identical fixture with an ordinary file in place of the gate script IS
  // eligible, so it is the path -- not the presence of a diff -- doing the work.
  assert.strictEqual(
    autoDoneEligibility({ ...ELIGIBLE, changedFiles: ["docs/SESSIONS.md", "scripts/heal-engine.js"] }).eligible,
    true);
}

function anUnreadableDiffFailsClosed() {
  assert.strictEqual(selfCertificationBlock(null).blocked, true,
    "a verifier that cannot see what changed cannot know whether it is grading itself -- unknown is " +
    "not innocent, the same rule as a skipped gate");
  assert.strictEqual(selfCertificationBlock(undefined).blocked, true);
  assert.strictEqual(autoDoneEligibility({ ...ELIGIBLE, changedFiles: null }).eligible, false);

  // NEGATIVE CONTROL: an EMPTY list is a real answer ("nothing relevant changed") and must NOT be
  // confused with null. Coercing the two together would block every clean delivery forever -- the
  // SES-147 NULL-is-not-zero boundary in a second costume.
  assert.strictEqual(selfCertificationBlock([]).blocked, false);
  assert.strictEqual(autoDoneEligibility({ ...ELIGIBLE, changedFiles: [] }).eligible, true);
}

function pathMatchingIsExactAndSeparatorAgnostic() {
  // Windows-style separators are normalised; a path that merely CONTAINS a gate script's name is not
  // a match, or a future scripts/verifier.js.bak silently disarms every clean delivery.
  assert.strictEqual(selfCertificationBlock(["scripts\\verifier.js"]).blocked, true);
  assert.strictEqual(selfCertificationBlock(["./scripts/verifier.js"]).blocked, true);
  assert.strictEqual(selfCertificationBlock(["scripts/verifier.js.bak"]).blocked, false);
  assert.strictEqual(selfCertificationBlock(["docs/scripts/verifier.js"]).blocked, false);
}

// ---------------------------------------------------------------------------
// SES-122 (b): the bar is ladder-driven -- a rung, not a hardcoded class
// ---------------------------------------------------------------------------

// The live shape the M6 gate ruled on, read off public.class_autonomy('P10 - Tooling') this session:
// work class `tooling`, rung 13, auto_done TRUE against runner_settings.auto_done_rung 3. The
// TICKET carrying it is deliberately the awkward one -- a P9 class on a NON-Selfbuild epic -- so
// nothing here can pass through charter decision 2's old path by accident.
const LADDER_PROMOTED = Object.freeze({
  verdict: "approve",
  epicName: "Automation",
  priorityClass: "P9 - Bug Fixes",
  changedFiles: ["docs/runbooks/runner-cycle.md", "scripts/heal-engine.js"],
  classAutonomy: Object.freeze({ auto_done: true, rung: 13, streak: 42, work_class: "tooling", auto_done_rung: 3 }),
});

function theLadderGrantsTheBarByRung() {
  const e = autoDoneEligibility(LADDER_PROMOTED);
  assert.strictEqual(e.eligible, true,
    "M6 gate, promise 2, decided on SES-122's row: 'a rung buys auto-done eligibility for its " +
    "class'. A rung is a fact about the work CLASS, so a promoted class takes the bar on any epic — " +
    "charter decision 2's Selfbuild/P10 rule is the FLOOR beneath the ladder, not a second gate " +
    "above it.");
  assert.ok(/rung 13/.test(e.reason) && /auto_done_rung 3/.test(e.reason),
    "the stored reason must name the rung AND the threshold it cleared — 'the ladder granted it' " +
    "with no numbers is a claim John cannot check against runner_ladder");
  assert.ok(/ladder/i.test(e.reason) && /SES-122/.test(e.reason),
    "the GRANTING AUTHORITY has to survive in the ledger: the ladder, charter decision 2 and §2f " +
    "are three different authorities and only one of them is a measurement");

  // THE NEGATIVE CONTROL, one variable: the same ticket with the ladder saying no. This is the
  // `bug_fix` class's real state (rung 1 < auto_done_rung 3), and it must fall through to charter
  // decision 2 and lose there on the epic.
  const denied = autoDoneEligibility({
    ...LADDER_PROMOTED,
    classAutonomy: { auto_done: false, rung: 1, streak: 1, work_class: "bug_fix", auto_done_rung: 3 },
  });
  assert.strictEqual(denied.eligible, false,
    "auto_done false is the ladder declining to grant the bar; the delivery stays `delivered` until " +
    "that class earns the rung");
  assert.ok(new RegExp(AUTO_DONE_EPIC_PREFIX).test(denied.reason),
    "and the reason must be CHARTER DECISION 2's floor talking, not the ladder's — the ticket is " +
    "outside the Selfbuild family, which is why it failed");
  assert.ok(/rung 1/.test(denied.reason),
    "a refusal should still say what the ladder said, or 'the ladder declined' and 'nobody asked " +
    "the ladder' are indistinguishable in the ledger");

  // And the ladder does not rescue a BLOCK. The verdict outranks every widening in this function.
  assert.strictEqual(autoDoneEligibility({ ...LADDER_PROMOTED, verdict: "block" }).eligible, false);
}

function aRungNeverBuysPastSelfCertification() {
  // THE assertion of SES-122 (b). The grant SKIPS the scope tests; it must not skip charter premise
  // 3. If the ladder branch were written as an early `return { eligible: true }`, it would jump over
  // selfCertificationBlock() and hand the bar to a change that edits the verification itself — and
  // THIS ship is that change, on a class sitting at rung 13.
  for (const p of SELF_CERTIFYING_PATHS) {
    const e = autoDoneEligibility({ ...LADDER_PROMOTED, changedFiles: ["docs/SESSIONS.md", p] });
    assert.strictEqual(e.eligible, false,
      `rung 13 does not buy past charter premise 3 — a delivery touching ${p} is graded by the code ` +
      `it changed, whatever autonomy its class has earned`);
    assert.ok(e.reason.includes(p), "the reason must name the file");
    assert.ok(/certif/i.test(e.reason),
      "and it must be the SELF-CERTIFICATION reason, not a ladder or scope message — a rung that " +
      "produced 'the ladder granted this' here would be the defect this clause exists to catch");
  }
  // An unreadable diff fails the same direction, ladder or no ladder.
  assert.strictEqual(autoDoneEligibility({ ...LADDER_PROMOTED, changedFiles: null }).eligible, false);
  // NEGATIVE CONTROL: the identical fixture with ordinary files IS eligible, so it is the PATH doing
  // the work and not the ladder branch being broken outright.
  assert.strictEqual(autoDoneEligibility(LADDER_PROMOTED).eligible, true);
}

function theLadderIsReadStrictlyAndNullIsNotInnocent() {
  // SES-243's lesson applied to the second lookup: `classAutonomy.auto_done` is compared with
  // === true. A REST layer that hands back the STRING "false" is truthy, and the difference between
  // truthy and true here is the difference between John tapping Accept and a cycle writing `done`.
  for (const notGranted of ["false", "0", "no", "true", 1, {}, [], null, undefined]) {
    const e = autoDoneEligibility({ ...LADDER_PROMOTED, classAutonomy: { auto_done: notGranted, rung: 13, work_class: "tooling", auto_done_rung: 3 } });
    assert.strictEqual(e.eligible, false,
      `auto_done=${JSON.stringify(notGranted)} is not the boolean true; the ladder grant must not ` +
      `be reachable through a mis-parsed value`);
  }

  // A MISSING classAutonomy must leave today's behaviour byte-identical — every other assertion in
  // this file and in SES-243's omits the key, and that is what keeps them meaningful.
  const withoutLadder = autoDoneEligibility({ ...ELIGIBLE });
  for (const absent of [undefined, null]) {
    const e = autoDoneEligibility({ ...ELIGIBLE, classAutonomy: absent });
    assert.strictEqual(e.eligible, withoutLadder.eligible,
      "an unread ladder changes no decision the old code made — unknown is not innocent, and it is " +
      "not guilty either: it simply is not evidence");
  }
  // An untracked class answers with NULL rung (not 0 — `invention` really sits at rung 0), and that
  // must read as "no rung to spend" rather than as the bottom rung.
  const untracked = autoDoneEligibility({
    ...LADDER_PROMOTED,
    classAutonomy: { auto_done: false, rung: null, streak: null, work_class: null, auto_done_rung: 3 },
  });
  assert.strictEqual(untracked.eligible, false);
  assert.ok(/not rung 0/.test(untracked.reason),
    "the NULL-is-not-zero boundary is the one SES-147 cost; the reason says so rather than printing " +
    "a bare 0 the next reader would take for a real rung");
}

// ---------------------------------------------------------------------------
// SES-122 (b): the spawn quoting -- four months of false blocks, in one expression
// ---------------------------------------------------------------------------
function spawnCommandIsQuotedOnlyForTheShell() {
  // John's machine, verbatim. With shell:true, spawnSync hands `cmd /d /s /c "<cmd> <args>"` to the
  // shell, which splits on whitespace: unquoted, this launched `C:\Program` and both node-spawned
  // gates exited 1 with `'C:\Program' is not recognized`. Verdict 253aca14 (SES-301) is the
  // measurement — build green, regression and hygiene red on that string.
  const winNode = "C:\\Program Files\\nodejs\\node.exe";
  assert.strictEqual(spawnCommandFor(winNode, true), `"${winNode}"`,
    "a command containing whitespace MUST be quoted when the shell will parse it, or every " +
    "attended verifier run on Windows is a `block` about the environment rather than the change");

  // The other direction is the same defect pointed backwards: with shell:false the command IS
  // argv[0], so a quote becomes part of the filename and the gate goes SKIPPED instead of red.
  assert.strictEqual(spawnCommandFor(winNode, false), winNode,
    "with no shell the command is argv[0] — quoting it would name a file that does not exist");

  // A command with no whitespace is untouched either way, so this cannot regress the Linux cloud
  // runner (`npm`, and a node path with no spaces).
  for (const shell of [true, false]) {
    assert.strictEqual(spawnCommandFor("npm", shell), "npm");
    assert.strictEqual(spawnCommandFor("/usr/bin/node", shell), "/usr/bin/node");
  }

  // Idempotent: an already-quoted command is not double-wrapped, or `""C:\…""` reaches cmd.
  assert.strictEqual(spawnCommandFor(`"${winNode}"`, true), `"${winNode}"`);

  // NEGATIVE CONTROL: the retired expression was `gate.cmd` itself. Pinned so the assertion above
  // cannot be vacuous — if the unquoted form ever equalled the quoted one, there was no defect.
  assert.notStrictEqual(winNode, `"${winNode}"`);

  // And the real gating set must survive the transform: every GATES entry still resolves to a
  // command, quoted or not, on both platforms.
  for (const g of GATES) {
    for (const shell of [true, false]) {
      const c = spawnCommandFor(g.cmd, shell);
      assert.ok(typeof c === "string" && c.length > 0, `${g.key}'s command must survive quoting`);
    }
  }
}

function run() {
  // The table's own constraints — ck_runner_verdicts_fail_closed and
  // ck_runner_verdicts_eligible_implies_approve — ship as migration ses181_runner_verdicts and live
  // in the database, not this repo. Reaching them from here means INSERTing rows into the live
  // verdict ledger, which would poison the very catch-rate telemetry this ticket exists to start.
  // approveIffAllGreenAcrossEveryCombination() below asserts the JS half of that rule over its whole
  // input space; the SQL half's evidence is the live QA on the ship card.
  notRun(
    "the runner_verdicts CHECK constraints",
    "they live in the database; asserting them from here would write fixture rows into the live " +
    "verdict ledger and corrupt the rolling-30 baseline recorded from verdict one"
  );

  gatingSetIsTheCharterBar();
  gateStatusHasThreeValues();
  allGreenApproves();
  anyRedBlocks();
  anySkippedBlocks();
  aMissingGateIsSkippedNotAbsent();
  approveIffAllGreenAcrossEveryCombination();
  theInterimBarIsMet();
  eligibilityNeverOutrunsTheVerdict();
  scopeIsTheSelfbuildFamilyOnly();
  scopeIsToolingOnly();
  aChangeToTheVerificationCannotTakeTheBar();
  anUnreadableDiffFailsClosed();
  pathMatchingIsExactAndSeparatorAgnostic();
  theLadderGrantsTheBarByRung();
  aRungNeverBuysPastSelfCertification();
  theLadderIsReadStrictlyAndNullIsNotInnocent();
  spawnCommandIsQuotedOnlyForTheShell();
}

selfRun(import.meta.url, run);
export default run;
