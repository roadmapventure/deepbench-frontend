// DeepBench v7.0.613 | tests/regression/AGT-168-private-scan-change-scoped.js | AGT-168 slice 1
//
// FEATURE: the change-scoped half of scripts/audit-private-scan.js -- addedLines(), scanChange()
// and the `--base=<rev>` CLI mode that CI's `checks` job now runs on every push and PR.
//
// WHY THE SCOPE IS THE ADDED LINE AND NOT THE TRACKED TREE, which is the single fact every clause
// below exists to hold. Measured on this tree at the ship: 48 lines across 46 files already carry
// a `vercel_bypass` value, all of them historical docs/kickoffs/* residue (newest v7.0.85 -- the
// literal stopped propagating on its own). A CI step calling scanTree() would report those 48
// standing lines on EVERY run and be red forever, so the first red would be the last one anybody
// read. The gate grades the change, never the live world (pattern:162). Clause 1 is the negative
// control that proves it: a scanner that reached for scanTree() scores >= 1 there and fails.
//
// THE GATE IS PROPHYLACTIC. It stops the 49th line; it removes none of the 48. Purging them is
// the ~46-file edit AGT-168's later slice owns, and it needs John's own waiver of the 3-file cap.
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
  // summary line, over a repo carrying 48 lines this same script is about to be told to ignore.
  const whole = runRealScript([]);
  assert.strictEqual(whole.code, 0,
    `the unflagged whole-tree run must still exit 0 -- the ledger path is not a gate. Got ${whole.code}: ${whole.stderr}`);
  assert.ok(/^private-scan \d+ findings$/m.test(whole.stdout),
    `the unflagged run must still print its original summary line, got: ${whole.stdout.trim()}`);
  assert.ok(!/change-scoped/.test(whole.stdout), "the unflagged run must not take the change-scoped path");
}

// The CI step is part of the ship: a gate nothing runs is not a gate. Read off the shipped YAML
// rather than restated, and scoped to the `checks` job so a step added to `build` cannot pass it.
function ciRunsTheGate() {
  const yml = fs.readFileSync(path.join(REPO, ".github", "workflows", "ci.yml"), "utf8");
  const start = yml.indexOf("\n  checks:");
  assert.notStrictEqual(start, -1, "ci.yml must still define a `checks:` job");
  const rest = yml.slice(start + 1);
  const next = rest.search(/\n {2}[A-Za-z0-9_-]+:\n/);
  const body = next === -1 ? rest : rest.slice(0, next);

  const idx = body.indexOf("scripts/audit-private-scan.js");
  assert.notStrictEqual(idx, -1,
    "the `checks` job must run scripts/audit-private-scan.js -- without the step the gate ships dead");
  const step = body.slice(body.lastIndexOf("- name:", idx), idx + 200);
  assert.ok(/--base=/.test(step),
    "the CI invocation must pass --base -- the bare form scans the whole tree, finds the 48 standing lines and is red forever");
  assert.ok(/git fetch[^\n]*\$\{?BASE_SHA/.test(step) || /git fetch[^\n]*"\$BASE_SHA"/.test(step),
    "the step must fetch the base commit explicitly: CI clones at depth 1 (SES-393), so the base object is absent and the gate would exit 2 on every run");
  assert.ok(/github\.event\.before/.test(step) && /pull_request\.base\.sha/.test(step),
    "BASE_SHA must cover both triggers this workflow declares -- push and pull_request");
  assert.ok(!/continue-on-error/.test(step),
    "the gate step must not carry continue-on-error -- a step that cannot fail is not a gate");
  assert.ok(/\n\s*if:\s*always\(\)/.test(step),
    "the scan step must carry if: always() -- without it a red tripwire step above it skips the scan entirely, concealing exactly the class of leak this gate exists to catch");

  // The gate must sit in a job the conclusion reporter already depends on, or a red gate never
  // reaches the anchor (SES-255).
  const reporter = yml.slice(yml.indexOf("\n  report-conclusion:"));
  assert.ok(/needs:\s*\[[^\]]*\bchecks\b[^\]]*\]/.test(reporter),
    "`report-conclusion` must still name `checks` in needs, or this gate's failure is forgotten by the anchor");
}

export default async function run() {
  try {
    cliIsStandalone();
    theLiveWorldIsNotGraded();
    theValueNeverLeaves(theChangeIsGraded());
    failsClosed();
    ciRunsTheGate();
  } finally {
    // `finally`, so a failing clause still cleans up after itself -- the fixture is worthless for
    // debugging anyway, since every assertion above already quotes the output it judged.
    for (const root of fixtures.splice(0)) {
      try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* best effort */ }
    }
  }
}

selfRun(import.meta.url, run);
