// DeepBench v7.0.342 | tests/regression/SES-256-rollback-drill.js | STEP-4 BLOCKER — THE FILE-LEVEL
// NEGATIVE CONTROL'S OWN not-run DECLARATION TURNED A BLOCKING CI JOB RED, and the thing to read
// twice is WHERE the defect can and cannot be seen. `notRun(part, reason)` takes TWO arguments and
// raises on a missing `reason` (_lib/self-run.js: "an unexplained gap is worse than none"). Both
// declarations below passed ONE concatenated string, so `reason` was undefined and the call THREW.
// It is unreachable on a full clone — the pinned commit resolves, the control runs, and the branch
// is never entered — so it passed every check the authoring cycle could make and failed on the
// FIRST push, in CI, where actions/checkout@v4 gives a shallow checkout at its default depth.
// MEASURED, NOT INFERRED: run 33362760570 on 071503ae, job "Tripwire + regression (blocking)",
// 129/130 with the single line `[FAIL] SES-256-rollback-drill.js -- notRun(part, reason): reason
// must say why`. Reproduced here in a real `git clone --depth 1` of dev, byte-identical, and the
// same clone with the shipped file restored is the negative control that still fails.
//
// WHY THIS WAS NOT A REVERT, recorded because the machinery proposed one: scripts/rollback-on-red.js
// returned `revert-and-card` over 506efee..071503a, correctly attributed. The range is a
// charter-required drill ship carrying an undecided ship card, and the whole red is one missing
// argument in this file — so the runbook's step-4 rule (a blocker is fixed root-cause-first, no
// blind fixes) and the v7.0.340 precedent govern: fixed forward in the cycle that caught it, no
// ticket. Reverting was NOT run.
//
// THE EDIT THIS FORBIDS, and it is the tempting one because it makes the arity mistake impossible:
// giving `reason` a default in notRun(). The raise IS the contract — SES-180 (b)'s rule is that an
// undeclared gap is indistinguishable from coverage, and a defaulted reason reinstates exactly the
// silent gap it exists to forbid. The fix belongs at the call site, which is where it is.
//
// DeepBench v7.0.341 | tests/regression/SES-256-rollback-drill.js | SES-256 (Selfbuild M4)
//
// Guards docs/runbooks/rollback-drill.md — the procedure written by executing the first end-to-end
// auto-rollback drill (charter success-criterion 5, second half).
//
// WHY A DOC NEEDS A GUARD AT ALL, and it is the whole design of this file. A runbook that quotes a
// command the code no longer emits is worse than no runbook: it is confidently wrong at the exact
// moment somebody is following it under pressure. The five SES-182 guards all assert what the engine
// DECIDES; none asserts that the documented procedure still matches what it EMITS. That is the gap
// here, and it is why the load-bearing assertion below is COMPUTED rather than a string match on
// prose: the runbook's step-6 command is read out of the file, its two placeholders substituted, and
// the result compared to revertPlanFor()'s ACTUAL return value for the same pair of shas. Change
// revertPlanFor and this test goes red on the next push, which is the only way the doc can be kept
// honest without a human re-reading it.
//
// THE EDIT THIS FILE FORBIDS, and it is tempting because it makes the test shorter: asserting the
// runbook merely CONTAINS the substring "git revert". That passes on a runbook documenting the wrong
// range, the wrong flags, or a history-rewriting `reset --hard` — every failure this exists to
// catch. The comparison must be an equality against the engine's own output.
//
// THE SECOND ASSERTION FAMILY IS THE AUTHORISATION BOUNDARY, and it is not decoration. SES-256's
// decision boundary splits the drill in two: a controlled drill is ordinary cycle work, and seeding a
// red on REAL dev is an outward-facing act John alone may authorise (directive 1c9609de pre-authorises
// drill DUMPS only, and says so explicitly). A future edit that "simplifies" the runbook by dropping
// that distinction would read as a licence to push a deliberate red to dev. So the boundary is
// asserted as text that must be present, in both directions: the gated route named as gated, and the
// controlled route named as the one that is not.
//
// FILE-LEVEL NEGATIVE CONTROL (the SES-182c / SES-255 pattern): the runbook must be ABSENT at the
// pinned pre-change commit, so these assertions provably could not have passed before this ship.
// PINNED TO AN IMMUTABLE COMMIT SHA, NEVER A BRANCH TIP — that is SES-242's defect (v7.0.324) and
// SES-255's repeat of it (v7.0.340): a control keyed to `origin/dev` is correct only in the window
// before its own ship, which is the one window nobody re-runs it in, and it then turns a BLOCKING CI
// job red. 506efee is dev's head immediately before v7.0.341 and means the same thing forever.
// If the control cannot run (no git, no object) it is DECLARED not-run rather than passed — an
// unrunnable control is not a control.

import assert from "assert";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { revertPlanFor, isRunGreen, TRIGGER_SOURCES } from "../../scripts/rollback-on-red.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");
const RUNBOOK_REL = "docs/runbooks/rollback-drill.md";
const RUNBOOK = path.join(REPO, RUNBOOK_REL);

// dev's head immediately before v7.0.341. Immutable by construction — see the header.
const PRE_CHANGE_COMMIT = "506efeee8d6f7191c03a14016b3f3230cdb5e305";

// The two shas the drill actually used, from docs/harvests/SES-256-rollback-drill-2026-08-31.md.
// They are inputs to a pure function here, not a claim about any live repository.
const GREEN_SHA = "dc51779bb36059e6b81e15594f566f57ebda1d7b";
const RED_SHA = "ec7d77b9ed2bc148e214439518b139d2f505a39a";

function readRunbook() {
  assert.ok(fs.existsSync(RUNBOOK), `${RUNBOOK_REL} must exist — it is the drill procedure itself`);
  return fs.readFileSync(RUNBOOK, "utf8");
}

// The provenance stamp is an HTML comment and restates much of what the body says. An assertion
// that searches the WHOLE file can therefore be satisfied by the stamp alone, which is a vacuous
// pass on a body that no longer carries the sentence. Found by this file's own mutation battery:
// deleting §0's "evidence, not a score" clause left the guard GREEN because the stamp says it too.
// Any assertion whose subject is what a READER of the procedure sees runs against this instead.
function bodyOf(text) {
  return text.replace(/<!--[\s\S]*?-->/g, "");
}

// --- 1. the load-bearing one: the documented command IS the engine's output -------------------
function documentedRevertCommandMatchesTheEngine(text) {
  const line = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("git revert "));

  assert.ok(
    line,
    `${RUNBOOK_REL} must document the revert command on its own line. Step 6 is the step nothing had ` +
      "ever executed before this ship; a runbook that stops short of it repeats the gap SES-256 filed.",
  );

  const substituted = line.replace(/<GREEN_SHA>/g, GREEN_SHA).replace(/<RED_SHA>/g, RED_SHA);
  const actual = revertPlanFor(GREEN_SHA, RED_SHA).command;

  assert.strictEqual(
    substituted,
    actual,
    `${RUNBOOK_REL}'s documented revert command has drifted from revertPlanFor().\n` +
      `  runbook (placeholders substituted): ${substituted}\n` +
      `  engine actually emits:              ${actual}\n` +
      "Update the runbook to match the engine, never the other way round — the engine is what runs.",
  );
}

// --- 2. the runbook's own example job payloads must classify the way it says they do ----------
// Parses the two --jobs literals out of the fenced blocks. If the runbook's "green" example were
// ever edited into something isRunGreen() rejects, step 2 would document a call that records no
// anchor and the whole drill would be unreproducible from this file.
function runbookJobExamplesClassifyCorrectly(text) {
  const raw = [...text.matchAll(/--jobs='([\s\S]*?)'/g)].map((m) => m[1]);
  assert.ok(
    raw.length >= 2,
    `${RUNBOOK_REL} must carry both a green and a red --jobs example (found ${raw.length}) — ` +
      "the drill's green arm and red arm are different calls and both have to be reproducible.",
  );

  const parsed = raw.map((r, i) => {
    try {
      return JSON.parse(r.replace(/\s+/g, " "));
    } catch (e) {
      throw new assert.AssertionError({
        message: `${RUNBOOK_REL}: --jobs example #${i + 1} is not valid JSON (${e.message}). It is ` +
          "handed to the engine verbatim, so a payload that cannot parse is a step that cannot run.",
      });
    }
  });

  assert.ok(
    parsed.some((j) => isRunGreen(j)),
    `${RUNBOOK_REL}: no --jobs example satisfies isRunGreen(), so the documented step 2 would never ` +
      "record a green anchor and every later step would be measured against nothing.",
  );
  assert.ok(
    parsed.some((j) => !isRunGreen(j)),
    `${RUNBOOK_REL}: every --jobs example is green, so the documented red arm is not actually red — ` +
      "the drill would prove only that a green run records an anchor.",
  );
}

// --- 3. the trigger vocabulary the runbook names must be the engine's real one ----------------
function runbookNamesTheRealTriggers(text) {
  for (const t of TRIGGER_SOURCES) {
    assert.ok(
      text.includes(t),
      `${RUNBOOK_REL} must name the trigger '${t}' — TRIGGER_SOURCES is ${TRIGGER_SOURCES.join(", ")} ` +
        "and a runbook that omits one leaves that path undrilled and unmentioned.",
    );
  }
  assert.ok(
    !/verifier[^.\n]{0,40}\bis a (rollback )?trigger\b/i.test(text),
    `${RUNBOOK_REL} must never describe the verifier as a rollback trigger. John ruled on it ` +
      "(2026-08-30, card 2c136c5b Q1): CI-red and deploy-red are facts and may revert; a verifier " +
      "block is judgment and cards him instead. TRIGGER_SOURCES refuses it in code.",
  );
}

// --- 4. the authorisation boundary, asserted in both directions -------------------------------
function runbookKeepsTheGatedRouteGated(text) {
  const lower = text.toLowerCase();
  assert.ok(
    lower.includes("1c9609de"),
    `${RUNBOOK_REL} must cite directive 1c9609de by id — it is the standing authorisation that covers ` +
      "drill DUMPS and explicitly not a seeded red, and the citation is what stops a later reader " +
      "generalising 'drills are pre-authorised'.",
  );
  assert.ok(
    /card it; never do it|never do it/i.test(text),
    `${RUNBOOK_REL} must state that a red seeded on REAL dev is carded for John and never done by a ` +
      "cycle. Without that sentence the runbook reads as a licence to push a deliberate red to dev.",
  );
  assert.ok(
    /ordinary cycle work/i.test(text),
    `${RUNBOOK_REL} must also name the CONTROLLED route as ordinary cycle work. Asserting only the ` +
      "prohibition would leave a runbook that appears to forbid its own procedure.",
  );
  assert.ok(
    /produces \*evidence\*, not a \*score\*/i.test(bodyOf(text)),
    `${RUNBOOK_REL}'s BODY must say it produces evidence rather than scoring criterion 5 — whether a ` +
      "controlled drill satisfies the criterion is John's open question on SES-256's card, and a " +
      "runbook that quietly claims the score answers it on the runner's own say-so. Asserted against " +
      "the body with the provenance stamp stripped: the stamp says this too, so a whole-file search " +
      "passes vacuously on a body that has lost the sentence (its own mutation M5 proved that).",
  );
}

// --- 5. file-level negative control ------------------------------------------------------------
function theRunbookDidNotExistBeforeThisShip() {
  const probe = spawnSync("git", ["cat-file", "-e", `${PRE_CHANGE_COMMIT}:${RUNBOOK_REL}`], {
    cwd: REPO,
    encoding: "utf8",
  });
  if (probe.error || probe.status === null) {
    notRun(
      "file-level negative control",
      "git is unavailable in this environment, so 'the runbook was absent before this ship' could " +
        "not be established. DECLARED not-run, never passed.",
    );
    return;
  }
  const commitExists = spawnSync("git", ["cat-file", "-e", `${PRE_CHANGE_COMMIT}^{commit}`], {
    cwd: REPO,
    encoding: "utf8",
  });
  if (commitExists.status !== 0) {
    notRun(
      "file-level negative control",
      `pinned commit ${PRE_CHANGE_COMMIT.slice(0, 7)} is not in this clone (a shallow checkout -- ` +
        "which is what actions/checkout@v4 gives CI at its default depth), so the pre-change tree " +
        "could not be read. Deepen the clone and re-run to exercise it. DECLARED not-run, never " +
        "passed.",
    );
    return;
  }
  assert.notStrictEqual(
    probe.status,
    0,
    `file-level negative control FAILED: ${RUNBOOK_REL} already existed at ` +
      `${PRE_CHANGE_COMMIT.slice(0, 7)}, so every assertion above could be vacuously true of a file ` +
      "this ship did not author. Re-pin PRE_CHANGE_COMMIT to the commit before this runbook landed.",
  );
}

export default async function run() {
  const text = readRunbook();
  documentedRevertCommandMatchesTheEngine(text);
  runbookJobExamplesClassifyCorrectly(text);
  runbookNamesTheRealTriggers(text);
  runbookKeepsTheGatedRouteGated(text);
  theRunbookDidNotExistBeforeThisShip();
}

selfRun(import.meta.url, run);
