// DeepBench v7.0.493 | tests/regression/ses-379-changed-files-fail-closed.test.mjs | SES-379 --
// step 7a grades a REAL changed-file list: it is passed in, and a list that resolves empty or
// unreadable fails closed.
//
// WHAT IS PINNED, and where a lazier guard would go vacuously green.
//
// (A) THE SEAM, NOT THE BOUNDARY. `selfCertificationBlock([])` must stay NOT blocked -- SES-181
// pins it at tests/regression/SES-181-verifier.js:358-359 with a comment forbidding the coercion,
// and it is right to: down there `[]` means "I read the delivery and nothing relevant changed".
// So every assertion here is against `resolveDeliveryFiles()`, the seam main() resolves through,
// and clause (A) asserts BOTH directions in one place -- the same empty list is `true` at the
// boundary and `null` at the seam. A future edit that "simplifies" by moving the conversion down
// one level turns SES-181 red; a future edit that drops the conversion turns this file red. Neither
// can be green at once, which is the point.
//
// (B) THE NEGATIVE CONTROL THAT SEPARATES A FIX FROM A REFUSAL SWITCH. Since SES-336 the Builder
// pushes before 7a runs, so `git diff origin/dev...HEAD` is empty on EVERY unattended cycle. A
// change that only made empty block would therefore deny the auto-done bar to every clean delivery
// forever, and it would pass any test that checked only clause (A). So (B) drives a real one-path
// list through `autoDoneEligibility` on a ladder-granted context and demands `eligible: true`. If
// this clause ever goes red beside a green (A), the fix has become a switch.
//
// (C) THE TWO RECORDED INSTANCES, REPLAYED AS FIXTURES. `runner_verdicts` SES-377 (v7.0.463) and
// SES-359 (v7.0.462) both recorded `approve` with `auto_done_eligible = true` and the reason "the
// diff touches none of scripts/verifier.js, ..." -- yet push fadf84ac changed
// scripts/check-session-docs.js. Those two paths are run through the resolved list here, and the
// reason text must NAME the file. Asserting only `eligible === false` would pass under a blanket
// refusal, which is why the name is asserted too.
//
// (D) UNREADABLE IS NOT A DOWNGRADE. A `--changed-files` path that does not exist resolves to null
// EVEN WHEN GIT HAS PATHS TO OFFER. The `gitList` in that clause is deliberately non-empty: with an
// empty one the assertion would pass under an implementation that silently fell back to git, so the
// non-empty fallback is the entire discriminating power of the case. Same for a file holding a JSON
// object, and for a file holding nothing but blank lines.
//
// (E) IS NOT HERE AND CANNOT BE. Clause (E) of the kickoff is the live step-7a run of this very
// push -- the real command with --changed-files naming this delivery's files, which must print
// `auto-done eligible: no`. It needs credentials, a cycle and a pushed tree, and it is recorded in
// the ship's own regression_summary. This file is the unit half and is READ-ONLY: no write of any
// kind, no model call, no board read, no credentials.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { selfRun } from "./_lib/self-run.js";
import {
  resolveDeliveryFiles,
  readChangedFilesFile,
  selfCertificationBlock,
  autoDoneEligibility,
  SELF_CERTIFYING_PATHS,
} from "../../scripts/verifier.js";

// Ladder-granted: P10 - Tooling sits at rung 26 against runner_settings.auto_done_rung 3, so the
// ladder skips the epic and class tests and ONLY selfCertificationBlock() can withhold the bar.
// That is the context every clause below needs -- a fixture the ladder had already refused would
// make every `eligible: false` here meaningless.
const GRANTED = Object.freeze({
  verdict: "approve",
  epicName: "Governance Agents II - Verifier Contracts & Handoff Rows",
  epicProjectExecuting: true,
  priorityClass: "P10 - Tooling",
  classAutonomy: Object.freeze({ work_class: "tooling", rung: 26, auto_done: true, auto_done_rung: 3 }),
});

function tmpFile(name, contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ses379-"));
  const p = path.join(dir, name);
  fs.writeFileSync(p, contents, "utf8");
  return p;
}

// -- (A) the seam converts, the boundary does not ------------------------------------------------
function emptyFailsClosedAtTheSeamAndOnlyThere() {
  // THE MUTANT THIS CLAUSE ANSWERS: the ladder-granted fixture with an empty list is eligible TRUE
  // today and on origin/dev. That is the live defect -- post-push, git's answer IS empty -- and it
  // is asserted rather than assumed, so the clause below cannot be passing for some other reason.
  assert.strictEqual(autoDoneEligibility({ ...GRANTED, changedFiles: [] }).eligible, true,
    "the SES-181 boundary is unchanged: [] is a real answer and does not block. If this goes red " +
    "the conversion has been put inside selfCertificationBlock(), which SES-181 forbids.");
  assert.strictEqual(selfCertificationBlock([]).blocked, false);

  // ...and the seam is where it stops being one.
  assert.strictEqual(resolveDeliveryFiles({ explicit: null, gitList: [] }), null,
    "no list passed in and git answered empty -- since SES-336 that is 'asked after the push', " +
    "not 'nothing changed', and it must resolve to null");

  const e = autoDoneEligibility({ ...GRANTED, changedFiles: resolveDeliveryFiles({ explicit: null, gitList: [] }) });
  assert.strictEqual(e.eligible, false, "the resolved null must block a ladder-granted delivery");
  assert.ok(/could not be read/.test(e.reason),
    `the reason must say the list could not be read, not some scope message. got: ${e.reason}`);

  // Git failing outright is the same direction, and so is being called with nothing at all.
  assert.strictEqual(resolveDeliveryFiles({ explicit: null, gitList: null }), null);
  assert.strictEqual(resolveDeliveryFiles(), null);
}

// -- (B) not a refusal switch --------------------------------------------------------------------
function aRealListStillReachesTheBar() {
  const resolved = resolveDeliveryFiles({ explicit: ["docs/SESSIONS.md"], gitList: [] });
  assert.deepStrictEqual(resolved, ["docs/SESSIONS.md"],
    "the Builder's list is the source when git's half is empty by construction");

  const e = autoDoneEligibility({ ...GRANTED, changedFiles: resolved });
  assert.strictEqual(e.eligible, true,
    "a clean delivery that DECLARED its files must still take the bar -- otherwise SES-379 shipped " +
    "a refusal switch, not a fix");

  // The union only ever adds, and it dedupes. A path git saw that the Builder forgot to declare is
  // exactly the path premise 3 exists to catch, so it may not be dropped.
  assert.deepStrictEqual(
    resolveDeliveryFiles({ explicit: ["docs/SESSIONS.md"], gitList: ["scripts/verifier.js", "docs/SESSIONS.md"] }),
    ["docs/SESSIONS.md", "scripts/verifier.js"]);
  assert.strictEqual(
    autoDoneEligibility({
      ...GRANTED,
      changedFiles: resolveDeliveryFiles({ explicit: ["docs/SESSIONS.md"], gitList: ["scripts/verifier.js"] }),
    }).eligible, false,
    "the union moves toward refusal: a self-certifying path git saw still blocks");
}

// -- (C) both recorded instances, replayed -------------------------------------------------------
function theTwoLedgerInstancesNowBlock() {
  for (const hit of ["scripts/check-session-docs.js", "scripts/verifier.js"]) {
    assert.ok(SELF_CERTIFYING_PATHS.includes(hit), `${hit} must be a self-certifying path`);

    const resolved = resolveDeliveryFiles({ explicit: [hit], gitList: [] });
    assert.deepStrictEqual(resolved, [hit]);

    const e = autoDoneEligibility({ ...GRANTED, changedFiles: resolved });
    assert.strictEqual(e.eligible, false,
      `${hit} is the verification itself -- charter premise 3, and a rung buys nothing past it`);
    assert.ok(e.reason.includes(hit),
      `the reason must NAME the file, or a blanket refusal would pass this clause. got: ${e.reason}`);
  }

  // The v7.0.463 replay end to end: that push's OWN empty git list beside the list it should have
  // been handed. The first is what the ledger recorded; the second is what it will record now.
  assert.strictEqual(autoDoneEligibility({ ...GRANTED, changedFiles: resolveDeliveryFiles({ explicit: null, gitList: [] }) }).eligible, false);
}

// -- (D) unreadable, unparseable and blank all block, never downgrade ----------------------------
function anUnreadableFlagNeverFallsBackToGit() {
  const GIT_HAS = ["docs/SESSIONS.md"];   // non-empty ON PURPOSE: this is the discriminating half

  const missing = readChangedFilesFile(path.join(os.tmpdir(), "ses379-no-such-file-9d2f.json"));
  assert.strictEqual(missing.source, "UNREADABLE");
  assert.deepStrictEqual(missing.files, []);
  assert.strictEqual(resolveDeliveryFiles({ explicit: missing.files, gitList: GIT_HAS }), null,
    "a flag that named an unreadable file must block, NOT silently become git's answer -- the " +
    "caller passed a list and got nothing, which is not the same fact as passing no flag");

  const notAnArray = readChangedFilesFile(tmpFile("obj.json", '{"files":["a.js"]}'));
  assert.strictEqual(notAnArray.source, "UNREADABLE");
  assert.strictEqual(resolveDeliveryFiles({ explicit: notAnArray.files, gitList: GIT_HAS }), null);

  const badJson = readChangedFilesFile(tmpFile("bad.json", "[ oops"));
  assert.strictEqual(badJson.source, "UNREADABLE");
  assert.strictEqual(resolveDeliveryFiles({ explicit: badJson.files, gitList: GIT_HAS }), null);

  const blank = readChangedFilesFile(tmpFile("blank.txt", "\n   \n\n"));
  assert.strictEqual(blank.source, "builder list", "an empty file was READ -- that is not unreadable");
  assert.deepStrictEqual(blank.files, []);
  assert.strictEqual(resolveDeliveryFiles({ explicit: blank.files, gitList: GIT_HAS }), null,
    "an empty claim is a failed claim and fails closed even when git had paths to offer");

  // ...and both accepted shapes really do parse, or every clause above would be vacuous.
  assert.deepStrictEqual(
    readChangedFilesFile(tmpFile("list.json", '["scripts/verifier.js", "docs/runbooks/cycle-card.md"]')).files,
    ["scripts/verifier.js", "docs/runbooks/cycle-card.md"]);
  assert.deepStrictEqual(
    readChangedFilesFile(tmpFile("list.txt", "scripts/verifier.js\ndocs/runbooks/cycle-card.md\n")).files,
    ["scripts/verifier.js", "docs/runbooks/cycle-card.md"]);
}

async function run() {
  emptyFailsClosedAtTheSeamAndOnlyThere();
  aRealListStillReachesTheBar();
  theTwoLedgerInstancesNowBlock();
  anUnreadableFlagNeverFallsBackToGit();

  console.log("[SES-379] (A) [] is still a real answer at selfCertificationBlock() and resolves to " +
    "null at the seam; (B) a declared one-path list still takes the ladder-granted bar, so this is " +
    "not a refusal switch; (C) both ledger instances (check-session-docs.js, verifier.js) now block " +
    "with the file named; (D) missing / non-array / unparseable / blank all resolve null against a " +
    "NON-EMPTY git list. Clause (E) is live and recorded in this ship's regression_summary.");
}

selfRun(import.meta.url, run);
export default run;
