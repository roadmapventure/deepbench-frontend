// DeepBench v7.0.281 | tests/regression/SES-45-recreated-logic-lint.js | SES-45 (M2)
//
// Guards check 14 in scripts/check-session-docs.js -- a kickoff Section 8 test block that
// RECREATES the logic under test instead of importing it. The full predicate, the WARN-not-FLAG
// reasoning, and the two edits it forbids (adding "14" to GATING_CHECKS; dropping the repo-symbol
// discriminator) are explained in that file's own header. This test drives the shipped functions
// against fixtures, never a copy of the predicate (John, 2026-08-23: "you should never be throwing
// away tests" -- a test that recreates the logic it guards is precisely the bug SES-45 exists to
// catch, and a guard built that way would fail its own rule).
//
// Every assertion pairs with a NEGATIVE CONTROL -- the same fixture with the ONE thing that should
// matter changed -- because the failure this whole check family exists to prevent is a checker
// that reports the same thing regardless of what it looked at. "Would this still report the same
// way if the check did nothing?" must answer "no" for each case.

import assert from "assert";
import { selfRun } from "./_lib/self-run.js";
import {
  checkRecreatedLogicInKickoffs,
  section8Region,
  codeFencesInRegion,
  definedFunctionNames,
  importsRealImplementation,
  backtickedSubjectNames,
  GATING_CHECKS,
} from "../../scripts/check-session-docs.js";

const fourteen = findings => findings.filter(f => f.check === "14");

const SUBJECT_PROSE = "The Section 8 test below must exercise the real `formatThing()` helper shipped in src/lib/format.js.\n\n";

const RECREATED_BLOCK = "```js\nfunction formatThing(x) {\n  return String(x).trim();\n}\nconsole.log(formatThing('  hi  '));\n```\n";
const IMPORTED_BLOCK = "```js\nimport { formatThing } from '../src/lib/format.js';\nconsole.log(formatThing('  hi  '));\n```\n";

function doc(section8Body, prose = SUBJECT_PROSE) {
  return `# Kickoff\n\n${prose}## Section 8 — NODE.JS TEST\n\n${section8Body}\n## Section 9 — CLAUDE CODE VERIFICATION CHECKLIST\n\nnothing here\n`;
}

const REPO_SYMBOLS = new Set(["formatThing"]);

// ---------------------------------------------------------------------------
// Positive: a Section 8 block that recreates a doc-named, repo-real subject
// ---------------------------------------------------------------------------
function aRecreatedDocNamedRepoRealSubjectIsFound() {
  const findings = [];
  checkRecreatedLogicInKickoffs(findings, new Map([["k1.md", doc(RECREATED_BLOCK)]]), REPO_SYMBOLS);
  assert.strictEqual(fourteen(findings).length, 1,
    "all three predicate parts (Section 8 region, doc-named subject, no real import) plus the " +
    "repo-symbol discriminator hold -- must be reported");
  assert.strictEqual(fourteen(findings)[0].severity, "WARN",
    "WARN, not FLAG -- 20 pre-existing kickoffs hit this on the live corpus, which is a migration " +
    "backlog, not new drift; shipping FLAG would make the report red on arrival for it");
  assert.strictEqual(fourteen(findings)[0].check, "14");
  assert.match(fourteen(findings)[0].detail, /k1\.md -> formatThing/);
  assert.match(fourteen(findings)[0].detail, /STANDARDS\.md Section 4/,
    "the finding must cite the rule it enforces, same convention checks 3c/9/12 already use");
}

// ---------------------------------------------------------------------------
// Negative controls -- one variable changed each time
// ---------------------------------------------------------------------------
function aBlockThatImportsTheRealImplementationIsNotReported() {
  const findings = [];
  checkRecreatedLogicInKickoffs(findings, new Map([["k1.md", doc(IMPORTED_BLOCK)]]), REPO_SYMBOLS);
  assert.strictEqual(fourteen(findings).length, 0,
    "importing the real implementation is exactly what this check wants to see -- reporting it would be backwards");
}

function aNameTheDocNeverCallsTheSubjectIsNotReported() {
  const findings = [];
  const noSubjectDoc = doc(RECREATED_BLOCK, "No subject named anywhere in this prose.\n\n");
  checkRecreatedLogicInKickoffs(findings, new Map([["k1.md", noSubjectDoc]]), REPO_SYMBOLS);
  assert.strictEqual(fourteen(findings).length, 0,
    "a function the doc never calls out as the subject under test (no backticked `N()` outside a fence) is an ordinary local helper, not a claimed-and-recreated implementation");
}

function aNameNotInTheRepoSourceIsNotReported() {
  const findings = [];
  checkRecreatedLogicInKickoffs(findings, new Map([["k1.md", doc(RECREATED_BLOCK)]]), new Set(["someOtherRealFn"]));
  assert.strictEqual(fourteen(findings).length, 0,
    "the discriminator: a name that is not a real repo symbol cannot be a recreation of PRODUCTION " +
    "logic, whatever else the doc says about it -- without this control the check fires on any " +
    "ordinary local test helper a Section 8 block is entitled to define for itself");
}

function aSection8bBlockIsNotReported() {
  const eightB = `# Kickoff\n\n${SUBJECT_PROSE}## Section 8 — NODE.JS TEST\n\nthe real test lives below, this section is empty.\n\n## Section 8b — LIVE API TEST\n\n${RECREATED_BLOCK}\n## Section 9 — CLAUDE CODE VERIFICATION CHECKLIST\n\n`;
  const findings = [];
  checkRecreatedLogicInKickoffs(findings, new Map([["k1.md", eightB]]), REPO_SYMBOLS);
  assert.strictEqual(fourteen(findings).length, 0,
    "Section 8b is LIVE API TEST, a different test class -- a block that lives there says nothing about whether the Node test (Section 8 itself) recreated logic");

  // NEGATIVE CONTROL on the control: the identical block moved back INTO Section 8 itself DOES
  // report -- proving the exemption above is the section boundary doing the work, not the block
  // being malformed or the fixture being inert.
  const inSection8 = doc(RECREATED_BLOCK);
  const controlFindings = [];
  checkRecreatedLogicInKickoffs(controlFindings, new Map([["k1.md", inSection8]]), REPO_SYMBOLS);
  assert.strictEqual(fourteen(controlFindings).length, 1,
    "the same block reports once it is actually inside Section 8 -- so 8b's exemption above is real, not a fixture that never fires");
}

// ---------------------------------------------------------------------------
// Aggregation -- check 3c/3e's own convention: one line, not N
// ---------------------------------------------------------------------------
function multipleHitsAggregateToOneFinding() {
  const findings = [];
  const docs = new Map([
    ["k1.md", doc(RECREATED_BLOCK)],
    ["k2.md", doc(RECREATED_BLOCK)],
    ["k3.md", doc(RECREATED_BLOCK)],
  ]);
  checkRecreatedLogicInKickoffs(findings, docs, REPO_SYMBOLS);
  assert.strictEqual(fourteen(findings).length, 1,
    "reported as one aggregated line, same convention as checks 3c/3e, so it cannot bury the actionable flags above it");
  assert.match(fourteen(findings)[0].detail, /^3 kickoff/, "the count must be stated in the one line");
}

function emptyRepoSymbolSetReportsNothing() {
  const findings = [];
  checkRecreatedLogicInKickoffs(findings, new Map([["k1.md", doc(RECREATED_BLOCK)]]), new Set());
  assert.strictEqual(fourteen(findings).length, 0,
    "an empty repo-symbol set means the discriminator could not be built at all (no src/api/lib found) -- report nothing rather than fire on an unverifiable name");
}

// ---------------------------------------------------------------------------
// The gating policy -- check 14 must never join checks 9/10/11
// ---------------------------------------------------------------------------
function check14IsNotInTheGatingSet() {
  assert.ok(!GATING_CHECKS.has("14"),
    "check 14 is a historical-backlog WARN, not a gating class -- promoting it is SES-45's own " +
    "follow-up ticket's call to make once the backlog is drained, never a default this file reaches for");
}

// ---------------------------------------------------------------------------
// The pure predicate pieces, asserted directly
// ---------------------------------------------------------------------------
function section8RegionExcludesSection8bByConstruction() {
  const text = "## Section 8 — NODE.JS TEST\n\nkeep me\n\n## Section 8b — LIVE API TEST\n\ndrop me\n\n## Section 9 — CLAUDE CODE VERIFICATION CHECKLIST\n\nalso drop me\n";
  const region = section8Region(text);
  assert.ok(region.includes("keep me"));
  assert.ok(!region.includes("drop me"),
    "Section 8b carries its own ##-level heading -- it IS the next ##-level heading, so it ends the region rather than extending it. No special case needed or wanted.");
  assert.ok(!region.includes("also drop me"));
}

function codeFencesInRegionSkipsNonJsFences() {
  const region = "```json\n{\"a\":1}\n```\n```js\nfunction f(){}\n```\n";
  const blocks = codeFencesInRegion(region);
  assert.strictEqual(blocks.length, 1);
  assert.match(blocks[0], /function f/);
}

function definedFunctionNamesCoversAllThreeForms() {
  const names = definedFunctionNames("function a(){}\nconst b = () => {};\nconst c = function(){};\n");
  assert.deepStrictEqual([...names].sort(), ["a", "b", "c"]);
}

function importsRealImplementationRecognizesAllFourForms() {
  assert.ok(importsRealImplementation("import { x } from './y.js';\n"));
  assert.ok(importsRealImplementation("const m = await import('./y.js');\n"));
  assert.ok(importsRealImplementation("const m = require('./y.js');\n"));
  assert.ok(importsRealImplementation("import('./y.js').then(() => {});\n"));
  assert.ok(!importsRealImplementation("function x(){ return 1; }\n"),
    "a block with no import call at all must read as importing nothing real");
}

function backtickedSubjectNamesIgnoresFencedCode() {
  const text = "Test the real `realSubject()` function.\n\n```js\nfunction fakeSubject(){}\n// mentions `fakeSubject()` inside a fence, which must not count\n```\n";
  const subjects = backtickedSubjectNames(text);
  assert.ok(subjects.has("realSubject"));
  assert.ok(!subjects.has("fakeSubject"),
    "a backticked mention INSIDE fenced code is not the doc's own prose naming the subject -- it must be stripped before scanning");
}

function run() {
  aRecreatedDocNamedRepoRealSubjectIsFound();
  aBlockThatImportsTheRealImplementationIsNotReported();
  aNameTheDocNeverCallsTheSubjectIsNotReported();
  aNameNotInTheRepoSourceIsNotReported();
  aSection8bBlockIsNotReported();
  multipleHitsAggregateToOneFinding();
  emptyRepoSymbolSetReportsNothing();
  check14IsNotInTheGatingSet();
  section8RegionExcludesSection8bByConstruction();
  codeFencesInRegionSkipsNonJsFences();
  definedFunctionNamesCoversAllThreeForms();
  importsRealImplementationRecognizesAllFourForms();
  backtickedSubjectNamesIgnoresFencedCode();
}

selfRun(import.meta.url, run);
export default run;
