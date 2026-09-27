// DeepBench v7.0.616 | tests/regression/AGT-168-private-scan-change-scoped.js | AGT-168 slices 1-3
//
// FEATURE: the change-scoped half of scripts/audit-private-scan.js -- addedLines(), scanChange()
// and the `--base=<rev>` CLI mode that CI's `checks` job now runs on every push and PR.
//
// WHY THE SCOPE IS THE ADDED LINE AND NOT THE TRACKED TREE, which is the single fact every clause
// below exists to hold. Measured on this tree at the ship: 42 lines across 42 files (48 hits, 6
// false positives before AGT-196) already carry a `vercel_bypass` value, all of them historical
// docs/kickoffs/* residue (newest v7.0.85 -- the literal stopped propagating on its own). A CI step
// calling scanTree() would report those 42
// standing lines on EVERY run and be red forever, so the first red would be the last one anybody
// read. The gate grades the change, never the live world (pattern:162). Clause 1 is the negative
// control that proves it: a scanner that reached for scanTree() scores >= 1 there and fails.
//
// THE GATE IS PROPHYLACTIC. It stops the 49th line; it removes none of the 48. Purging them is
// the 42-file edit AGT-168's later slice owns, and it needs John's own waiver of the 3-file cap.
//
// FIXTURES ARE THROWAWAY GIT REPOS UNDER os.tmpdir(), NEVER THIS CHECKOUT (pattern:76). The whole
// mechanism under test is `git diff <base> HEAD`, so a fixture has to be a real repository with
// real commits; planting a bypass-shaped literal into a commit of the repo the suite runs in
// would be committing the very thing this scanner exists to catch.
//
// THE SCRIPT IS COPIED INTO EACH FIXTURE rather than spawned from its own path, and that is a
// property of the module, not a shortcut: ROOT is derived from import.meta.url, so the shipped
// CLI always scans the tree it physically sits in. A copy at <fixture>/scripts/ makes the fixture
// its ROOT. It is copied byte-for-byte from the shipped file at run time, so this is the real
// code path and cannot drift from it. The `--base` branch touches no other module, which is what
// makes a lone copy runnable (asserted by clause 0 rather than assumed).
//
// WHAT IS DELIBERATELY NOT ASSERTED HERE: `--base=HEAD~1` against this checkout. CI clones at
// depth 1 (actions/checkout@v4 with no fetch-depth, SES-393), so HEAD~1 does not resolve there and
// the clause would fail in exactly the environment the gate ships into. It was run by hand at the
// ship instead and reported with the QA results.
//
// WHY THE STEP WINDOW IS LINE-BOUNDED, AND COMMENT-STRIPPED IN BOTH DIRECTIONS. Slices 1-2 cut the
// CI step out of the YAML by character offset -- `body.slice(body.lastIndexOf("- name:", idx),
// idx + 200)` -- and `idx` is the offset of the script's NAME, not the end of its step. Measured on
// the shipped file this slice: that window is 483 chars and runs 152 chars past the scan step's last
// character (171 past the needle itself: `idx+200` against `idx+29`). It reached over the comment
// block at ci.yml:246-255 and into `- name: Regression suite (credentialed)`, whose own
// `if: always()` could then satisfy the assertion written to grade the SCAN step. Reproduced three
// ways before the fix: unchanged tree, all six conditions pass; delete the scan step's
// `if: always()` alone, red (correct); delete it TOGETHER WITH that 787-char comment block, and all
// six pass again -- a false green, the LOO-013 shape ARCHITECTURE.md §19v names, in the assertion
// slice 2 shipped to hold `if: always()`. The window below is the step's own lines and nothing
// after them: back to its `- name:`, forward to the next one (exclusive), comments dropped. The
// comment-stripping is what makes the bound survive an edit -- a future comment carrying `- name:`
// can no longer move the boundary, and one carrying `if: always()` can no longer feed a condition.
// clause 5 is the negative control that keeps this honest, and it is red under the old window.
//
// The scan step's own text is what this grades; ci.yml is NOT edited by this slice, and no clause
// here asserts that it was. Every mutation clause 5 grades is derived in memory from the shipped
// string and written nowhere (pattern:76).
//
// No network, no credentials, no model call.

import assert from "assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import { scanTree } from "../../scripts/audit-private-scan.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");
const SCRIPT = path.join(REPO, "scripts", "audit-private-scan.js");
const CI_YML = path.join(REPO, ".github", "workflows", "ci.yml");

// 32 mixed-case letters, no digit -- the shape of the real Vercel protection-bypass value, which is
// why the secret_assignment detector keeps its wide rule for BYPASS names. Never a real credential:
// this string is typed here and exists nowhere else.
const PLANTED = "QrtvBmWkdLcxNfYhJpZaSeUgToIdVnXb";
const BYPASS_LINE = `x-vercel-protection-bypass: ${PLANTED}`;

function git(cwd, ...args) {
  const r = spawnSync("git", ["-C", cwd, ...args], { encoding: "utf8" });
  assert.strictEqual(r.status, 0, `git ${args.join(" ")} failed in ${cwd}: ${r.stderr}`);
  return r.stdout.trim();
}

function runScript(cwd, args) {
  const r = spawnSync(process.execPath, [path.join(cwd, "scripts", "audit-private-scan.js"), ...args],
    { cwd, encoding: "utf8" });
  return { code: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

// The shipped script on the tree it actually ships in.
function runRealScript(args) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: REPO, encoding: "utf8" });
  return { code: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

// Every fixture root, removed at the end of the run: a suite that leaves a repo behind per run is
// a suite that fills a machine it does not own.
const fixtures = [];

// A fixture is a repo with ONE base commit; `mutate` writes the second commit's tree. Returns the
// base sha and the fixture root.
function fixture(label, baseFiles, mutate) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `agt168-${label}-`));
  fixtures.push(root);
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.copyFileSync(SCRIPT, path.join(root, "scripts", "audit-private-scan.js"));
  git(root, "init", "-q", "-b", "main");
  git(root, "config", "user.email", "regression@deepbench.invalid");
  git(root, "config", "user.name", "AGT-168 fixture");
  for (const [rel, text] of Object.entries(baseFiles)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text, "utf8");
  }
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "base");
  const base = git(root, "rev-parse", "HEAD");
  mutate(root);
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "change");
  return { root, base };
}

// Clause 0 -- the copied CLI runs at all. Without this, a clause that "passes" because the process
// died before scanning anything is indistinguishable from a clean scan. Asserts the module's
// `--base` branch reaches no other file: a copy with no siblings must still answer.
function cliIsStandalone() {
  const { root, base } = fixture("standalone", { "a.txt": "one\n" }, r => {
    fs.writeFileSync(path.join(r, "a.txt"), "one\ntwo\n", "utf8");
  });
  const run = runScript(root, [`--base=${base}`]);
  assert.strictEqual(run.code, 0, `a lone copy of the script must run its --base branch (stderr: ${run.stderr})`);
  assert.ok(/private-scan \(change-scoped\) 0 hits vs /.test(run.stdout),
    `the change-scoped run must print its own summary line, got: ${run.stdout.trim()}`);
}

// Clause 1 -- THE LIVE WORLD IS NOT GRADED. The base commit already carries the literal; the change
// touches an unrelated line of the SAME file. A scanTree() scanner scores >= 1 and fails here.
function theLiveWorldIsNotGraded() {
  const before = ["intro", "detail", BYPASS_LINE, "outro", ""].join("\n");
  const { root, base } = fixture("standing", { "docs/kickoffs/old.md": before }, r => {
    fs.writeFileSync(path.join(r, "docs", "kickoffs", "old.md"),
      ["intro", "detail EDITED", BYPASS_LINE, "outro", ""].join("\n"), "utf8");
  });

  const run = runScript(root, [`--base=${base}`]);
  assert.ok(/private-scan \(change-scoped\) 0 hits vs /.test(run.stdout),
    `a standing literal the change did not add must score 0 hits, got: ${run.stdout.trim()}`);
  assert.strictEqual(run.code, 0,
    "a change that adds no private info must exit 0 even where the tree already carries 48 such lines");

  // THE NEGATIVE CONTROL, and the clause that makes the one above worth running: the SAME fixture
  // scanned whole-tree DOES find the literal. Without it, clause 1 would pass just as happily
  // against a detector that had quietly stopped matching anything at all. scanTree() is called
  // directly rather than through the copied CLI because the whole-tree branch imports the ledger
  // module, which a lone copy has no sibling for.
  const whole = scanTree(root);
  assert.ok(whole.length >= 1,
    "the whole-tree scan of the same fixture must still find the standing literal -- otherwise clause 1 " +
    "is green because nothing is being detected, not because the scope is right");
  assert.ok(whole.some(f => f.locations.some(l => l.location.startsWith("docs/kickoffs/old.md:"))),
    `the whole-tree finding must cite the file carrying the standing literal, got: ${JSON.stringify(whole.map(f => f.locations))}`);
}

// Clause 2 -- THE CHANGE IS GRADED, at the real new-file line number read off the hunk header.
function theChangeIsGraded() {
  const before = ["# note", "", "one", "two", "three", ""].join("\n");
  const { root, base } = fixture("added", { "docs/note.md": before }, r => {
    fs.writeFileSync(path.join(r, "docs", "note.md"), `${before}${BYPASS_LINE}\n`, "utf8");
  });

  const run = runScript(root, [`--base=${base}`]);
  assert.strictEqual(run.code, 1,
    `an added bypass literal must fail the gate (exit 1), got ${run.code}: ${run.stdout}${run.stderr}`);
  assert.ok(/private-scan \(change-scoped\) 1 hits vs /.test(run.stdout),
    `exactly one hit -- vercel_bypass takes the value, so secret_assignment must not re-report it. Got: ${run.stdout.trim()}`);
  // Line 6: the base file's five lines plus its trailing newline put the appended line at 6.
  assert.ok(run.stdout.includes("docs/note.md:6"),
    `the hit must cite the real new-file line number docs/note.md:6, got: ${run.stdout.trim()}`);
  assert.ok(/vercel_bypass/.test(run.stdout), "the hit must name the detector that fired");
  return run;
}

// Clause 3 -- THE VALUE NEVER LEAVES THE PROCESS (ARCHITECTURE.md §19k). Runs on clause 2's own
// output, because the only run that could leak the value is the one that found it.
function theValueNeverLeaves(run) {
  assert.ok(!run.stdout.includes(PLANTED),
    "stdout of a failing change-scoped run must not carry the planted value");
  assert.ok(!run.stderr.includes(PLANTED),
    "stderr of a failing change-scoped run must not carry the planted value");
  assert.ok(run.stdout.includes(`${PLANTED.slice(0, 4)}****`),
    `the finding must show the value masked to its first four characters, got: ${run.stdout.trim()}`);
  // The mask must be a mask, not a truncation that still gives most of the value away.
  assert.ok(!run.stdout.includes(PLANTED.slice(0, 8)),
    "the masked text must not carry more than the first four characters of the value");
}

// Clause 4 -- FAIL CLOSED. An unresolvable base is exit 2 ("could not run, never a pass"), and the
// whole-tree path the ledger still calls is untouched: no --base, exit 0.
function failsClosed() {
  const { root, base } = fixture("closed", { "a.txt": "one\n" }, r => {
    fs.writeFileSync(path.join(r, "a.txt"), "one\ntwo\n", "utf8");
  });

  const missing = runScript(root, ["--base=deadbeefdeadbeefdeadbeefdeadbeefdeadbeef"]);
  assert.strictEqual(missing.code, 2,
    `a base that will not resolve must exit 2, never 0 and never 1 -- got ${missing.code}: ${missing.stdout}${missing.stderr}`);
  assert.ok(!/0 hits/.test(missing.stdout),
    "an unresolvable base must never print a clean result -- that is the false green this exit code exists to prevent");

  // An empty --base is the shape a missing CI variable actually takes, and it must not degrade into
  // the whole-tree run's exit 0.
  const empty = runScript(root, ["--base="]);
  assert.strictEqual(empty.code, 2,
    `an empty --base must fail closed too, got ${empty.code}: ${empty.stdout}${empty.stderr}`);

  assert.strictEqual(runScript(root, [`--base=${base}`]).code, 0, "the fixture's own change is clean");

  // TODAY'S BEHAVIOUR IS UNTOUCHED, asserted on the real tree rather than a fixture because that is
  // the tree the weekly auditor ledger actually calls: no --base, still exit 0, still the original
  // summary line, over a repo carrying 42 lines this same script is about to be told to ignore.
  const whole = runRealScript([]);
  assert.strictEqual(whole.code, 0,
    `the unflagged whole-tree run must still exit 0 -- the ledger path is not a gate. Got ${whole.code}: ${whole.stderr}`);
  assert.ok(/^private-scan \d+ findings$/m.test(whole.stdout),
    `the unflagged run must still print its original summary line, got: ${whole.stdout.trim()}`);
  assert.ok(!/change-scoped/.test(whole.stdout), "the unflagged run must not take the change-scoped path");
}

// TASK 1 -- the window, alone and pure: `yml` string in, the scan step's OWN text out. Scoped to
// the `checks` job exactly as slices 1-2 scoped it, so a step added to `build` still cannot pass.
// See WHY THE STEP WINDOW IS LINE-BOUNDED in the header for the 152/171-char overshoot this fixes.
function stepWindow(yml) {
  const start = yml.indexOf("\n  checks:");
  assert.notStrictEqual(start, -1, "ci.yml must still define a `checks:` job");
  const rest = yml.slice(start + 1);
  const next = rest.search(/\n {2}[A-Za-z0-9_-]+:\n/);
  const body = next === -1 ? rest : rest.slice(0, next);

  const lines = body.split("\n");
  const hit = lines.findIndex(l => l.includes("scripts/audit-private-scan.js"));
  assert.notStrictEqual(hit, -1,
    "the `checks` job must run scripts/audit-private-scan.js -- without the step the gate ships dead");

  // Back to the step's own `- name:`, forward to the next one (exclusive, or the end of the job).
  let first = hit;
  while (first > 0 && !/^\s*- name:/.test(lines[first])) first--;
  assert.ok(/^\s*- name:/.test(lines[first]),
    "the scan invocation must sit inside a named step -- a bare run line has no step to bound the window to");
  let last = hit + 1;
  while (last < lines.length && !/^\s*- name:/.test(lines[last])) last++;

  // Comments dropped in BOTH directions: that is what makes the bound hold under a future edit.
  // The `- name:` line survives as line 0, so the joined string still carries the newline before
  // `if:` that the `if: always()` condition below matches on.
  return lines.slice(first, last).filter(l => !/^\s*#/.test(l)).join("\n");
}

// TASK 1 -- the six conditions, moved verbatim from slices 1-2, regexes unchanged. They now read a
// string that cannot contain a single character of any other step.
function assertGateStep(step) {
  assert.ok(/--base=/.test(step),
    "the CI invocation must pass --base -- the bare form scans the whole tree, finds the 42 standing lines and is red forever");
  assert.ok(/git fetch[^\n]*\$\{?BASE_SHA/.test(step) || /git fetch[^\n]*"\$BASE_SHA"/.test(step),
    "the step must fetch the base commit explicitly: CI clones at depth 1 (SES-393), so the base object is absent and the gate would exit 2 on every run");
  assert.ok(/github\.event\.before/.test(step) && /pull_request\.base\.sha/.test(step),
    "BASE_SHA must cover both triggers this workflow declares -- push and pull_request");
  assert.ok(!/continue-on-error/.test(step),
    "the gate step must not carry continue-on-error -- a step that cannot fail is not a gate");
  assert.ok(/\n\s*if:\s*always\(\)/.test(step),
    "the scan step must carry if: always() -- without it a red tripwire step above it skips the scan entirely, concealing exactly the class of leak this gate exists to catch");
}

// The CI step is part of the ship: a gate nothing runs is not a gate. Read off the shipped YAML
// rather than restated.
function ciRunsTheGate() {
  const yml = fs.readFileSync(CI_YML, "utf8");
  assertGateStep(stepWindow(yml));

  // The gate must sit in a job the conclusion reporter already depends on, or a red gate never
  // reaches the anchor (SES-255).
  const reporter = yml.slice(yml.indexOf("\n  report-conclusion:"));
  assert.ok(/needs:\s*\[[^\]]*\bchecks\b[^\]]*\]/.test(reporter),
    "`report-conclusion` must still name `checks` in needs, or this gate's failure is forgotten by the anchor");
}

// Clause 5 -- THE WINDOW CANNOT REACH THE NEXT STEP, and the clause that makes the five conditions
// above worth asserting at all. Built in clause 1's form: a mutation the OLD window graded green
// must be graded red now. Derived in memory from the shipped string -- nothing is written to disk,
// and ci.yml is not touched (pattern:76). Without this, a window that had quietly gone back to
// borrowing the next step's text would look exactly as green as a correct one.
function theWindowCannotReachTheNextStep() {
  const yml = fs.readFileSync(CI_YML, "utf8");
  const lines = yml.split("\n");

  // The `checks` job's own run line. ci.yml's file header names the script too (ci.yml:2), so a
  // whole-file search for the name finds that prose, not the step -- hence the job floor and the
  // `node ` anchor rather than a bare includes().
  const jobStart = lines.findIndex(l => /^ {2}checks:/.test(l));
  assert.ok(jobStart > 0, "ci.yml must still define a `checks:` job");
  const hit = lines.findIndex((l, i) => i > jobStart && /^\s+node scripts\/audit-private-scan\.js/.test(l));
  assert.ok(hit > jobStart, "the `checks` job must still run the scan script on its own line");

  let first = hit;
  while (first > 0 && !/^\s*- name:/.test(lines[first])) first--;
  const ifAt = lines.findIndex((l, i) => i >= first && i < hit && /^\s*if:\s*always\(\)\s*$/.test(l));
  assert.notStrictEqual(ifAt, -1,
    "the scan step must carry an `if: always()` line of its own for this control to remove -- if it does not, slice 2 has been reverted and the five conditions above are the ones to read");
  const nextStep = lines.findIndex((l, i) => i > hit && /^\s*- name: Regression suite \(credentialed\)/.test(l));
  assert.ok(nextStep > hit,
    "`- name: Regression suite (credentialed)` must still follow the scan step -- it is the step whose text the old window borrowed");

  // The two edits: drop the scan step's own `if: always()`, then delete everything between its last
  // line and the next step -- the 787-char comment block at ci.yml:246-255.
  const mutated = lines.filter((l, i) => i !== ifAt && !(i > hit && i < nextStep)).join("\n");

  // THE MUTATION BIT, asserted before the verdict, so a clause that passed because the mutation
  // silently did nothing is distinguishable from one that passed because the window is bounded.
  assert.notStrictEqual(mutated, yml, "the mutation must actually change the text it grades");
  const ifCount = text => (text.match(/\n\s*if:\s*always\(\)/g) || []).length;
  assert.strictEqual(ifCount(mutated), ifCount(yml) - 1,
    `exactly one if: always() must be gone from the mutation, got ${ifCount(yml)} -> ${ifCount(mutated)}`);
  assert.ok(!/red tripwire cannot conceal/.test(mutated),
    "the comment block between the two steps must be gone -- shrinking it is what let the old window reach the next step");
  assert.ok(/^\s+node scripts\/audit-private-scan\.js/m.test(mutated),
    "the mutation must leave the scan step's run line in place -- it removes the step's `if:`, not the step");
  assert.ok(/- name: Regression suite \(credentialed\)/.test(mutated),
    "the mutation must leave the next step in place and now adjacent -- that adjacency is the whole mechanism");

  // THE VERDICT, and it names which condition fired rather than only that something threw (the
  // LOO-013 lesson): the bounded window must go red on `if: always()` here. The old `idx + 200`
  // window was GREEN on this exact string, borrowing the next step's own `if: always()` once the
  // comment block between them was out of the way.
  assert.throws(() => assertGateStep(stepWindow(mutated)), /if: always\(\)/,
    "with the scan step's own if: always() deleted and the comment block after it removed, the step window must still be red -- if this passes, the window is reaching into the next step and the assertion above is vacuous");

  // And the bound in the other direction, on the shipped text as it stands: the next step is
  // outside the window, so none of its characters can satisfy any condition.
  assert.ok(!stepWindow(yml).includes("Regression suite (credentialed)"),
    "the scan step's window must not contain the next step's name -- if it does, it is grading two steps as one");
}

export default async function run() {
  try {
    cliIsStandalone();
    theLiveWorldIsNotGraded();
    theValueNeverLeaves(theChangeIsGraded());
    failsClosed();
    ciRunsTheGate();
    theWindowCannotReachTheNextStep();
  } finally {
    // `finally`, so a failing clause still cleans up after itself -- the fixture is worthless for
    // debugging anyway, since every assertion above already quotes the output it judged.
    for (const root of fixtures.splice(0)) {
      try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* best effort */ }
    }
  }
}

selfRun(import.meta.url, run);
