// DeepBench v7.0.334 | tests/regression/SES-182c-deploy-serving-red.js | SES-182 slice 3
//
// Guards the four halves of slice 3: THE RED-ONLY BOUNDARY (this probe may never write a green
// anchor -- a page that loads is not a CI verdict), THE SERVING SHA (the commit judged is the one
// the alias actually serves, never dev's head), UNKNOWN IS NOT RED (an unreachable or
// protection-refused deployment triggers nothing), and THE CONSECUTIVE-RED BAR (one bad edge
// response is not a rollback trigger).
//
// EVERY CLAUSE CARRIES ITS OWN NEGATIVE CONTROL -- "would this still pass if the change did
// nothing?" must answer NO. Three controls are RETIRED DESIGNS applied to the SAME fixture and
// asserted to LOSE, so the guard proves a DIFFERENCE from what was rejected rather than a property
// both share:
//
//   * theProbeNeverWritesAGreenAnchor() runs the tempting "hand every sample to the engine as jobs
//     and let decide() sort it out" form beside the shipped one, ON THE SAME GREEN FIXTURE, and
//     asserts the retired form reaches ACTIONS.RECORD_GREEN -- i.e. it stores an anchor on the
//     evidence that a web server answered -- where the shipped one emits no invocation at all.
//   * aSingleRedSampleIsNotATrigger() runs the tempting "any red sample is a red" form beside the
//     shipped consecutive-red bar on one fixture.
//   * anUnreachableDeploymentIsNotRed() runs the tempting "not green, therefore red" form beside
//     the shipped three-verdict one.
//
// AND ONE CLAUSE PROVES THE NEW CAPABILITY IS A CAPABILITY: aFullyRedDeploymentNowTriggers() feeds
// the probe's own red output into the SHIPPED engine and asserts it reaches a rollback decision --
// without it every clause here would pass against a probe that never triggered anything at all.
//
// THE POLICY IS READ OUT OF THE SHIPPED MODULES, never restated here (the SES-45 rule: a test that
// recreates the logic under test passes against the bug it guards).

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { selfRun } from "./_lib/self-run.js";

import {
  PROBE_VERDICTS,
  SAMPLE_VERDICTS,
  MIN_SAMPLES,
  ROOT_MARKER,
  PROBE_LIMITS,
  classifyShell,
  classifySample,
  verdictFor,
  entryModuleFrom,
  engineArgsFor,
} from "../../scripts/check-deploy-serving.js";

import { ACTIONS, TRIGGER_SOURCES, decide } from "../../scripts/rollback-on-red.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PROBE_SRC = fs.readFileSync(path.join(REPO, "scripts", "check-deploy-serving.js"), "utf8");

// Source assertions below are about EXECUTABLE code, never prose. The header deliberately explains
// the predicates it does not own, and a grep that cannot tell a comment from a statement would fail
// on the very sentence that documents the boundary it is checking.
const codeOnly = (src) => src.replace(/^\s*\/\/.*$/gm, "").replace(/`[^`]*`/g, "``");
const PROBE_CODE = codeOnly(PROBE_SRC);

const SERVING_SHA = "aaaa111bbbb222cccc333";
const DEV_HEAD_SHA = "9999dead9999beef9999";
const SHELL_BODY = `<!DOCTYPE html><html><body>${ROOT_MARKER} id-ignored></div><script type="module" src="/assets/index-a1b2c3.js"></script></body></html>`;

const greenSample = () => classifySample({ shell: { status: 200, body: SHELL_BODY }, entry: { src: "/assets/index-a1b2c3.js", status: 200 } });
const redSample = () => classifySample({ shell: { status: 503, body: "" } });
const unknownSample = () => classifySample({ shell: { networkError: "ETIMEDOUT" } });

// The retired design this slice rejects: treat the probe's samples as CI jobs and let decide()
// classify them. Kept here, applied to the same fixtures, so the difference is proven rather than
// asserted.
function retiredPassEverythingThrough(samples) {
  return samples.map((s) => ({ name: "deploy", conclusion: s.verdict === SAMPLE_VERDICTS.GREEN ? "success" : "failure" }));
}

// ---------------------------------------------------------------------------

// THE headline clause. A green probe must produce NO engine invocation -- and the control shows
// exactly what the rejected form would have done with the same facts.
function theProbeNeverWritesAGreenAnchor() {
  const samples = [greenSample()];
  const outcome = verdictFor(samples);
  assert.strictEqual(outcome.verdict, PROBE_VERDICTS.GREEN, "a served shell + served entry bundle is green");

  const shipped = engineArgsFor({ verdict: outcome.verdict, servingSha: SERVING_SHA });
  assert.strictEqual(shipped, null,
    "a GREEN probe must emit no engine invocation at all -- a serving page is not a CI verdict and must never become the green anchor");

  // Negative control: the retired form, same fixture, asserted to LOSE.
  const retired = decide({
    trigger: "deploy-red",
    jobs: retiredPassEverythingThrough(samples),
    headSha: SERVING_SHA,
    greenAnchor: null,
    currentWatermark: "20260830000001",
    cycles: [{ id: "cyc-1", push_sha: SERVING_SHA }],
  });
  assert.strictEqual(retired.action, ACTIONS.RECORD_GREEN,
    "the retired pass-everything-through form must reach record-green on this fixture, or this control proves nothing");
}

// A red probe emits a FAILURE conclusion, always -- which is what makes the green branch
// structurally unreachable rather than merely unvisited.
function aRedProbeAlwaysEmitsAFailureConclusion() {
  const outcome = verdictFor([redSample(), redSample(), redSample()]);
  assert.strictEqual(outcome.verdict, PROBE_VERDICTS.RED);
  const args = engineArgsFor({ verdict: outcome.verdict, servingSha: SERVING_SHA });
  assert.ok(args, "a red probe with a resolved serving sha must emit an engine invocation");
  assert.ok(args.jobs.length > 0 && args.jobs.every((j) => j.conclusion !== "success"),
    "every job this probe emits must carry a non-success conclusion");
  assert.strictEqual(decide({
    trigger: args.trigger, jobs: args.jobs, headSha: args.sha,
    greenAnchor: null, currentWatermark: null, cycles: [],
  }).action !== ACTIONS.RECORD_GREEN, true, "the emitted jobs can never reach the record-green branch");
}

// The sha handed to the engine is the SERVING commit. Passing dev's head instead would revert a
// commit the public was never served -- SES-015 measured that lag at up to 2,973s.
function theShaJudgedIsTheServingCommitNotDevHead() {
  const args = engineArgsFor({ verdict: PROBE_VERDICTS.RED, servingSha: SERVING_SHA });
  assert.strictEqual(args.sha, SERVING_SHA);
  assert.notStrictEqual(args.sha, DEV_HEAD_SHA, "the probe must never judge dev's head");

  // And with no serving sha there is nothing to attribute, so nothing is triggered.
  assert.strictEqual(engineArgsFor({ verdict: PROBE_VERDICTS.RED, servingSha: null }), null,
    "a red whose serving commit could not be resolved emits no invocation -- there is nothing to attribute");

  // The predicate is imported, never re-derived: the probe must not carry its own copy of the
  // READY/aliasAssigned/branch test that lives in check-deploy-current.js.
  assert.ok(/import\s*\{\s*pickServing\s*\}\s*from\s*"\.\/check-deploy-current\.js"/.test(PROBE_CODE),
    "pickServing must be imported from check-deploy-current.js, never re-implemented here (SES-45)");
  assert.ok(!/aliasAssigned/.test(PROBE_CODE),
    "the serving predicate must have exactly one home -- this file's CODE must not restate aliasAssigned");
}

// Unknown is a third verdict, not a synonym for red. A network blip inside the runner's own
// container must never revert a healthy dev.
function anUnreachableDeploymentIsNotRed() {
  const samples = [unknownSample(), unknownSample(), unknownSample()];
  const outcome = verdictFor(samples);
  assert.strictEqual(outcome.verdict, PROBE_VERDICTS.UNKNOWN, "three unreachable samples are UNKNOWN, never red");
  assert.strictEqual(engineArgsFor({ verdict: outcome.verdict, servingSha: SERVING_SHA }), null,
    "an unknown probe triggers nothing");

  // Deployment protection is this probe's own credential problem, not the site's health.
  assert.strictEqual(classifyShell({ status: 401, body: "" }).verdict, SAMPLE_VERDICTS.UNKNOWN);
  assert.strictEqual(classifyShell({ status: 403, body: "" }).verdict, SAMPLE_VERDICTS.UNKNOWN);
  assert.strictEqual(classifyShell({ status: 429, body: "" }).verdict, SAMPLE_VERDICTS.UNKNOWN);

  // Negative control: the retired "not green, therefore red" form, same fixture, asserted to LOSE.
  const retiredSaysRed = samples.every((s) => s.verdict !== SAMPLE_VERDICTS.GREEN);
  assert.strictEqual(retiredSaysRed, true,
    "the retired not-green-therefore-red form must call this fixture red, or this control proves nothing");
}

// One bad edge response is not a rollback trigger.
function aSingleRedSampleIsNotATrigger() {
  const samples = [redSample(), greenSample()];
  const outcome = verdictFor(samples);
  assert.strictEqual(outcome.verdict, PROBE_VERDICTS.GREEN,
    "a deployment that answers correctly even once is serving");
  assert.strictEqual(engineArgsFor({ verdict: outcome.verdict, servingSha: SERVING_SHA }), null);

  // Fewer than MIN_SAMPLES consecutive reds is not enough either.
  const tooFew = verdictFor(Array.from({ length: MIN_SAMPLES - 1 }, redSample));
  assert.strictEqual(tooFew.verdict, PROBE_VERDICTS.UNKNOWN,
    `fewer than ${MIN_SAMPLES} consecutive reds must not reach the red verdict`);

  // Negative control: the retired "any red sample is a red" form, same fixture, asserted to LOSE.
  const retiredSaysRed = samples.some((s) => s.verdict === SAMPLE_VERDICTS.RED);
  assert.strictEqual(retiredSaysRed, true,
    "the retired any-red form must call this mixed fixture red, or this control proves nothing");
}

// The blank-page shape: a 200 that is not the app shell, and a shell whose entry bundle 404s.
function aBlankPageIsRedEvenAtHttp200() {
  assert.strictEqual(classifyShell({ status: 200, body: "<html><body></body></html>" }).verdict, SAMPLE_VERDICTS.RED,
    "a 200 whose body lacks the app shell marker is the blank-page shape");
  assert.strictEqual(classifyShell({ status: 200, body: SHELL_BODY }).verdict, SAMPLE_VERDICTS.GREEN);

  const assetsGone = classifySample({ shell: { status: 200, body: SHELL_BODY }, entry: { src: "/assets/index-a1b2c3.js", status: 404 } });
  assert.strictEqual(assetsGone.verdict, SAMPLE_VERDICTS.RED,
    "a shell served beside an entry bundle that 404s renders blank and is red");

  // The entry reference is read from the shell, never guessed -- Vite rehashes it every build.
  assert.strictEqual(entryModuleFrom(SHELL_BODY), "/assets/index-a1b2c3.js");
  assert.strictEqual(entryModuleFrom("<html></html>"), null);
  // A shell with no module reference fails OPEN on the sub-check rather than inventing a red.
  assert.strictEqual(classifySample({ shell: { status: 200, body: `<html>${ROOT_MARKER}></div></html>` }, entry: null }).verdict,
    SAMPLE_VERDICTS.GREEN);
}

// Without this arm every clause above would pass against a probe that never triggers anything.
function aFullyRedDeploymentNowTriggers() {
  const outcome = verdictFor([redSample(), redSample(), redSample()]);
  const args = engineArgsFor({ verdict: outcome.verdict, servingSha: SERVING_SHA });
  const decision = decide({
    trigger: args.trigger,
    jobs: args.jobs,
    headSha: SERVING_SHA,
    greenAnchor: { commit_sha: "0000green0000", migration_watermark: "20260830000001" },
    currentWatermark: "20260830000001",
    cycles: [{ id: "cyc-1", push_sha: SERVING_SHA, version: "v7.0.334" }],
  });
  assert.strictEqual(decision.action, ACTIONS.REVERT_AND_CARD,
    "an attributable, code-only, fully-red deployment must now reach a rollback decision -- otherwise this slice shipped nothing");
  assert.ok(/deploy-red/.test(decision.reason), "the decision must name the trigger it fired on");
}

// The vocabulary is the engine's, not this file's -- so widening one cannot silently diverge.
function theTriggerWordIsTheEngines() {
  const args = engineArgsFor({ verdict: PROBE_VERDICTS.RED, servingSha: SERVING_SHA });
  assert.ok(TRIGGER_SOURCES.includes(args.trigger),
    "the trigger this probe emits must be one the engine already admits");
  assert.ok(!TRIGGER_SOURCES.includes("verifier"),
    "a verifier block is still not a trigger -- John's Q1 ruling, unchanged by this slice");
}

// The probe states what it cannot see rather than implying it sees everything.
function theProbeNamesItsOwnBlindSpots() {
  assert.ok(Array.isArray(PROBE_LIMITS) && PROBE_LIMITS.length >= 3,
    "the probe must publish its named limits");
  assert.ok(PROBE_LIMITS.some((l) => /client-side render/i.test(l)),
    "the client-side-render blind spot must be named, not left to be discovered");
}

// This probe decides; it never acts. No push, no DDL, no Vercel actuation.
function theProbeNeverActs() {
  for (const forbidden of [/execFileSync\(\s*"git"/, /apply_migration/, /api\.vercel\.com\/v13\/deployments/, /--apply/]) {
    assert.ok(!forbidden.test(PROBE_CODE),
      `the probe must not act: ${forbidden} appears in executable code`);
  }
}

// The meta-check: a control that cannot fail proves nothing. Each retired form must actually reach
// the wrong answer on its own fixture.
function theControlsAreNotVacuous() {
  const mixed = [redSample(), greenSample()];
  const unknowns = [unknownSample(), unknownSample(), unknownSample()];
  const controls = [
    ["pass-everything-through", retiredPassEverythingThrough([greenSample()]).every((j) => j.conclusion === "success")],
    ["any-red-is-red", mixed.some((s) => s.verdict === SAMPLE_VERDICTS.RED)],
    ["not-green-is-red", unknowns.every((s) => s.verdict !== SAMPLE_VERDICTS.GREEN)],
  ];
  for (const [name, retiredSaysYes] of controls) {
    assert.strictEqual(retiredSaysYes, true,
      `the '${name}' negative control must reach the WRONG answer on its fixture, or it proves nothing`);
  }
}

function run() {
  theProbeNeverWritesAGreenAnchor();
  aRedProbeAlwaysEmitsAFailureConclusion();
  theShaJudgedIsTheServingCommitNotDevHead();
  anUnreachableDeploymentIsNotRed();
  aSingleRedSampleIsNotATrigger();
  aBlankPageIsRedEvenAtHttp200();
  aFullyRedDeploymentNowTriggers();
  theTriggerWordIsTheEngines();
  theProbeNamesItsOwnBlindSpots();
  theProbeNeverActs();
  theControlsAreNotVacuous();
}

selfRun(import.meta.url, run);
export default run;
