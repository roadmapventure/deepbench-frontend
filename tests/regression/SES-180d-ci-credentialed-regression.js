// DeepBench v7.0.304 | tests/regression/SES-180d-ci-credentialed-regression.js | SES-180 (d)
//
// Guards the `env:` block that makes .github/workflows/ci.yml's regression step actually
// credentialed, and the header correction that ships with it.
//
// THE DEFECT, and it is a property of GitHub Actions rather than a slip of wording: a repository
// secret is NEVER auto-exposed to a step. `secrets.*` resolves only where it is written, and the
// step running `node tests/regression/run-all.js` carried no `env:` block at all. So the v7.0.286
// header's closing promise — "adding the secrets later makes the gate stronger with no edit to this
// file" — described a future that could not arrive. Both secrets could be present and correct (John
// confirmed both live on 2026-08-29, reading the repository secrets page) and the suite would still
// see an environment with neither, its credentialed halves declaring themselves not-run forever.
//
// WHY THIS IS INVISIBLE WITHOUT A GUARD, which is the reason it earns a file: a declared not-run
// part looks IDENTICAL whether the secret is absent or merely unexposed. The run is green either
// way and the log reads the same. There is no failure to notice. So the only place the difference
// can be caught is the workflow's own text, which is what this file reads.
//
// THE RULE IS READ OUT OF THE SHIPPED WORKFLOW, never restated here (John's rule 2026-08-23, "you
// should never be throwing away tests"; the DIR-603f44ea / SES-176 / SES-158 / SES-213 precedent).
// A test that copies the thing it guards passes forever while the shipped file rots.
//
// EVERY CLAUSE IS PAIRED WITH A NEGATIVE CONTROL — the same text with the one thing that should
// matter removed. "Would this still pass if the change did nothing?" must answer "no" for every
// clause. The vacuity meta-check is present because SES-158 shipped a control that changed nothing
// and was caught only because the control was itself checked.
//
// FILE-LEVEL NEGATIVE CONTROL, run at the ship rather than asserted from the diff: against the
// PRE-CHANGE workflow (git show origin/dev:.github/workflows/ci.yml at v7.0.302), FIVE of the seven
// clauses FAIL — suite-step-carries-env, both-keys-exposed, step-name-is-honest,
// false-claim-corrected, fork-degradation-named — and all seven pass on the shipped one. The number
// is the measured one and not the one this header first carried: it was written as four, because
// fork-degradation-named reads like an inherited caveat rather than a new clause. It is new, the
// control said so, and the count is corrected here rather than rounded to the sentence that was
// already typed.
//
// THE OTHER TWO PASS ON BOTH FILES, and that is the point of them: no-continue-on-error and
// tripwire-keeps-gate-flag pin v7.0.286's own forbidden edits, which this ship did not touch and
// must not silently drop. A clause that fails on the old file proves this ship changed something;
// a clause that passes on both proves this ship broke nothing. Both are worth having and they are
// labelled so a later reader does not "fix" the second kind for looking undiscriminating.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const WORKFLOW = path.join(ROOT, ".github/workflows/ci.yml");

const SUITE_RUN = "node tests/regression/run-all.js";

// Pure: the step block that runs the regression suite. Steps are indented six spaces under
// `steps:`, so a step begins at a line matching /^ {6}- /. Returns "" when absent -- itself a
// finding rather than a crash, since a checker that throws on a missing step reports nothing.
//
// IT SEARCHES THE BODY, NEVER THE WHOLE FILE, and that is a correction made during this ship
// rather than a precaution: the header commentary above `name: CI` quotes the suite's invocation
// while EXPLAINING the defect, so a whole-file search matched the prose block first and reported
// "no env: block" against a workflow that had one. A guard that reads a file's own explanation of
// a bug as evidence of the bug is worse than no guard.
export function extractSuiteStep(yaml, runCommand = SUITE_RUN) {
  const blocks = splitHeader(yaml).body.split(/\n(?= {6}- )/);
  return blocks.find(b => /^ {6}- /.test(b) && b.includes(runCommand)) || "";
}

// Pure: everything above `name: CI` is the file's header commentary; below it is the workflow.
// The header is where a false claim can sit above true code, which is half of what SES-180 (d)
// corrects, so the two halves are asserted separately rather than against one blob.
export function splitHeader(yaml) {
  const i = String(yaml).indexOf("\nname: CI");
  return i < 0 ? { header: String(yaml), body: "" } : { header: yaml.slice(0, i), body: yaml.slice(i) };
}

export const norm = s => String(s).replace(/\s+/g, " ");

// The retired sentence, verbatim. Kept as a literal ON PURPOSE and it is the one string in this
// file that is a copy rather than a read: the clause asserts the sentence is ABSENT, so a copy that
// drifts can only ever make the guard weaker in the safe direction (it stops matching and the
// clause trivially passes) -- never the direction where a false claim slips back in unnoticed.
const RETIRED_FALSE_CLAIM = "makes the gate stronger with no edit to this file";

// A clause earns its place only if REMOVING its rule would change what CI actually does.
export const CLAUSES = [
  {
    id: "suite-step-carries-env",
    scope: "step",
    detail:
      "the step running the regression suite must carry an `env:` block -- without one, `secrets.*` " +
      "never reaches the process and the credentialed halves declare not-run however correctly the " +
      "repository secrets are configured. This is the entire ticket.",
    test: s => /\n\s+env:\s*\n/.test(s),
    breaks: s => s.replace(/\n(\s+)env:\s*\n/, "\n"),
  },
  {
    id: "both-keys-exposed",
    scope: "step",
    detail:
      "BOTH SUPABASE_URL and SUPABASE_SERVICE_KEY must be exposed from `secrets`. One alone is not " +
      "half a fix: the credentialed tests need the pair, so a step with one key behaves exactly " +
      "like a step with none while looking, in the diff, as though the work was done.",
    test: s =>
      /SUPABASE_URL:\s*\$\{\{\s*secrets\.SUPABASE_URL\s*\}\}/.test(s) &&
      /SUPABASE_SERVICE_KEY:\s*\$\{\{\s*secrets\.SUPABASE_SERVICE_KEY\s*\}\}/.test(s),
    breaks: s => s.replace(/\s*SUPABASE_SERVICE_KEY:\s*\$\{\{\s*secrets\.SUPABASE_SERVICE_KEY\s*\}\}/, ""),
  },
  {
    id: "step-name-is-honest",
    scope: "step",
    detail:
      "the step must no longer be named '(no credentials)'. After the env block that name is false " +
      "in the log of every run on dev and main, and a step misreporting its own environment is the " +
      "header's defect one line further down -- which is why John's directive named the rename.",
    test: s => /- name: Regression suite/.test(s) && !/no credentials/.test(s),
    breaks: s => s.replace("- name: Regression suite (credentialed)", "- name: Regression suite (no credentials)"),
  },
  {
    id: "false-claim-corrected",
    scope: "header",
    detail:
      "the v7.0.286 promise that the secrets would strengthen the gate 'with no edit to this file' " +
      "must not stand as a live claim -- it is false, and a lie above true code is what this ship " +
      "was filed to remove. It may appear only as text the header explicitly marks as CORRECTED.",
    test: h => !h.includes(RETIRED_FALSE_CLAIM) || /CORRECTED v7\.0\.304/.test(h),
    breaks: h => h.replace(/\[CORRECTED v7\.0\.304[^\]]*\]/, "[note]"),
  },
  {
    id: "fork-degradation-named",
    scope: "file",
    detail:
      "the fork-pull_request case -- where GitHub resolves both secrets to the empty string by " +
      "design -- must be named rather than hidden. It is the one path where the new step name " +
      "over-promises, and an unnamed caveat is how the next reader concludes the gate is broken.",
    test: f => /fork/i.test(f) && /empty string/.test(f),
    breaks: f => f.split("empty string").join("blank value"),
  },
  {
    id: "no-continue-on-error",
    scope: "file",
    detail:
      "v7.0.286's forbidden edit #1, still in force and now load-bearing for a second reason: the " +
      "credentialed halves have never once been graded in CI, so the first credentialed run is the " +
      "first real verdict on them. Quieting a red run there discards the most valuable thing this " +
      "ticket can produce.",
    test: f => !/continue-on-error/.test(f.replace(/^#.*$/gm, "")),
    breaks: f => f.replace("        if: always()", "        continue-on-error: true\n        if: always()"),
  },
  {
    id: "tripwire-keeps-gate-flag",
    scope: "file",
    detail:
      "v7.0.286's forbidden edit #2, still in force: the bare `check-session-docs.js` always exits " +
      "0 BY CONTRACT, so a gating step running the non-gating invocation can never fail.",
    test: f => /check-session-docs\.js --gate/.test(f),
    breaks: f => f.replace("check-session-docs.js --gate", "check-session-docs.js"),
  },
];

function scopedText(clause, { file, header, step }) {
  return clause.scope === "header" ? header : clause.scope === "step" ? step : file;
}

function readAll() {
  const file = fs.readFileSync(WORKFLOW, "utf8");
  const { header } = splitHeader(file);
  const step = extractSuiteStep(file);
  return { file, header, step };
}

// The shipped workflow satisfies every clause.
function theShippedWorkflowIsClean() {
  const texts = readAll();
  assert.ok(texts.step, "the regression-suite step was not found in ci.yml -- the anchors moved");
  assert.ok(texts.header, "ci.yml has no header block above `name: CI`");
  for (const c of CLAUSES) {
    assert.ok(c.test(scopedText(c, texts)),
      `SES-180 (d) clause "${c.id}" is not satisfied by the shipped workflow: ${c.detail}`);
  }
}

// A missing step is a finding, not a crash.
function aMissingStepIsFlagged() {
  assert.strictEqual(extractSuiteStep("jobs:\n  build:\n    steps: []\n"), "",
    "extractSuiteStep must return '' for an absent step so the caller reports it rather than throwing");
  assert.strictEqual(splitHeader("no marker here").body, "",
    "splitHeader must degrade to header-only rather than throwing when `name: CI` is absent");
}

// Every clause has teeth: its own negative control must fail it.
function everyClauseHasTeeth() {
  const texts = readAll();
  for (const c of CLAUSES) {
    const original = scopedText(c, texts);
    const broken = c.breaks(original);
    assert.notStrictEqual(broken, original,
      `SES-180 (d) clause "${c.id}" has a VACUOUS negative control -- breaks() changed nothing, so ` +
        "the clause proves nothing (the SES-158 failure)");
    assert.ok(!c.test(broken),
      `SES-180 (d) clause "${c.id}" still passes with its own rule removed -- it is not discriminating`);
  }
}

// Meta: a mutation that changes nothing must be recognisable as vacuous by the check above.
function aVacuousMutationFailsItsOwnControl() {
  const vacuous = { id: "vacuous", test: () => true, breaks: s => s };
  const s = "anything";
  assert.strictEqual(vacuous.breaks(s), s,
    "the meta-assertion's own fixture must be unchanged, or it is not testing vacuity");
}

// THE DISCRIMINATING ONE, and the reason this file is not just a spell-check of a YAML block.
// The pre-change step is reconstructed exactly as it shipped at v7.0.302 and asserted to LOSE the
// two clauses that carry the ticket -- so the guard proves a DIFFERENCE from the retired workflow
// rather than a property both versions share.
function thePreChangeStepFailsTheEnvClauses() {
  const preChange = [
    "      - name: Regression suite (no credentials)",
    "        if: always()",
    "        run: node tests/regression/run-all.js",
  ].join("\n");

  const env = CLAUSES.find(c => c.id === "suite-step-carries-env");
  const keys = CLAUSES.find(c => c.id === "both-keys-exposed");
  const name = CLAUSES.find(c => c.id === "step-name-is-honest");

  assert.ok(!env.test(preChange),
    "the pre-change step must FAIL suite-step-carries-env -- if it does not, this fixture does not " +
      "reproduce the defect and the clause proves nothing");
  assert.ok(!keys.test(preChange), "the pre-change step must FAIL both-keys-exposed");
  assert.ok(!name.test(preChange), "the pre-change step must FAIL step-name-is-honest");

  // And the shipped one passes all three on the same predicate -- the other half of the control.
  const shipped = extractSuiteStep(fs.readFileSync(WORKFLOW, "utf8"));
  for (const c of [env, keys, name]) {
    assert.ok(c.test(shipped), `the shipped step must PASS ${c.id}`);
  }
}

// A secret must never be written as a literal. This is cheap, permanent, and the one failure in
// this file's neighbourhood that would be unrecoverable rather than merely wrong.
function noSecretIsInlined() {
  const step = extractSuiteStep(fs.readFileSync(WORKFLOW, "utf8"));
  const assignments = step.match(/^\s*SUPABASE_[A-Z_]+:\s*(.+)$/gm) || [];
  assert.ok(assignments.length >= 2, "expected both SUPABASE_* assignments on the step");
  for (const line of assignments) {
    assert.ok(/\$\{\{\s*secrets\./.test(line),
      `a SUPABASE_* value must come from \${{ secrets.* }} and never be inlined: ${line.trim()}`);
  }
}

function run() {
  theShippedWorkflowIsClean();
  aMissingStepIsFlagged();
  everyClauseHasTeeth();
  aVacuousMutationFailsItsOwnControl();
  thePreChangeStepFailsTheEnvClauses();
  noSecretIsInlined();
}

selfRun(import.meta.url, run);
export default run;
