// DeepBench v7.0.1126 | tests/regression/agt-790-gate-text-names-its-run.test.mjs | AGT-790
//
// A RED GATE'S DETAIL NAMES ITS NOT-RUN COUNT, AND THE CI GATE CANNOT CERTIFY ITSELF.
//
// WHY THE CONTROL IN CLAUSE (A) IS THE WHOLE TEST. The retired `summarizeGateOutput` built one
// `summary` array -- pass lines THEN notice lines -- and kept `summary.slice(0, 1)`. Whenever a run
// printed both, the pass count won the single slot and `NOT A FULL RUN:` was dropped, so no red
// verdict in the ledger ever carried the count of parts that did not run. Asserting only that the
// new text CONTAINS the notice would also pass under an implementation that merely reordered the
// two lines and dropped the pass count instead, which is the same defect wearing the other hat. So
// (A) asserts the exact full string AND replays the retired expression on the same trimmed lines,
// demanding that the old form does NOT name the notice. One clause, both directions.
//
// (B) IS THE CAP, SPENT IN THE RIGHT PLACE. The two summary lines are short and they anchor the
// verdict, so the 600-byte cap is taken out of `[FAIL]` text and never out of them. With four
// 222-byte failures the result must be EXACTLY `DETAIL_CAP`, must still start with the first
// failure's name, and must still END on both counts -- an implementation that capped the whole
// joined string would truncate the tail and lose them, which is the pre-change behaviour in a
// different disguise.
//
// (D) IS A SEPARATE CONSTANT ON PURPOSE (kickoff call D1). The two CI files are NOT appended to
// `SELF_CERTIFYING_PATHS`: `tests/regression/agt-67-verifier.test.mjs` clause (5) requires every
// entry of that list to be named in the live `vf-guardrails` Skill text, and no Skill row is
// written by this ticket. So (D) pins BOTH constants' contents -- a future edit that moves a CI
// file into the first list turns agt-67 red, and one that drops it from the second turns this file
// red. The near-miss fixtures matter as much as the hits: `selfCertificationBlock` matches by exact
// array membership, never by substring, so `scripts/ci-new-reds.js.bak` and a second workflow file
// must stay unblocked. Without them a substring implementation would pass.
//
// PURE AND READ-ONLY: no network, no credentials, no database, no model call, no writes.

import assert from "node:assert/strict";
import { selfRun } from "./_lib/self-run.js";
import {
  summarizeGateOutput,
  DETAIL_CAP,
  selfCertificationBlock,
  SELF_CERTIFYING_PATHS,
  SELF_CERTIFYING_CI_FILES,
} from "../../scripts/verifier.js";

const sum = summarizeGateOutput;

// The fixtures are the real shapes: run-all.js indents `[FAIL]` two spaces, prints the pass count
// unindented, and appends the not-run notice with its name list in parentheses.
const PASS = "regression suite: 2/4 passed";
const HEAD = "NOT A FULL RUN: 6 parts declared not-run across 3 tests";
const NOTICE = HEAD + " (a.test.mjs, b.test.mjs, c.test.mjs). Those parts are UNVERIFIED -- a green suite does not cover them.";
const F1 = "  [FAIL] a.test.mjs -- 1 arm(s) failed:";
const F2 = "  [FAIL] b.test.mjs -- 1 arm(s) failed:";

// The retired expression, replayed verbatim as the negative control for clause (A).
function retiredForm(lines) {
  const fails = lines.filter(l => l.startsWith("[FAIL]"));
  const summary = lines.filter(l => /^regression suite:/.test(l))
    .concat(lines.filter(l => /^NOT A FULL RUN:/.test(l)));
  const chosen = fails.length ? [...fails.slice(0, 4), ...summary.slice(0, 1)] : lines.slice(-3);
  return chosen.join(" | ");
}

async function run() {
  // --- (A) both counts survive beside the failures, and the retired form loses the notice -------
  const aOut = sum({ stdout: [F1, F2, "", PASS, NOTICE].join("\n"), stderr: "WARN: x" });
  assert.equal(aOut, [F1.trim(), F2.trim(), PASS, HEAD].join(" | "),
    "a red gate's detail must carry BOTH the pass count and the not-run count, the notice cut at its name list");

  const aLines = [F1, F2, "", PASS, NOTICE, "WARN: x"].map(l => l.trim()).filter(Boolean);
  const control = retiredForm(aLines);
  assert.ok(!control.includes("NOT A FULL RUN"),
    "negative control is broken: the retired form must DROP the not-run notice on these same lines -- " +
    "if it keeps it, this test no longer discriminates the fix from the pre-change code");
  assert.ok(aOut.includes("NOT A FULL RUN") && aOut.includes(PASS),
    "the shipped form keeps both lines the retired form could not");

  // --- (B) the cap is spent on [FAIL] text, never on the two counts ------------------------------
  const long = [0, 1, 2, 3].map(i => `  [FAIL] t${i}.test.mjs -- ` + "x".repeat(200));
  const bOut = sum({ stdout: [...long, PASS, NOTICE].join("\n"), stderr: "" });
  assert.equal(bOut.length, DETAIL_CAP,
    `an over-cap detail must land exactly on DETAIL_CAP (${DETAIL_CAP}), got ${bOut.length}`);
  assert.ok(bOut.startsWith("[FAIL] t0.test.mjs"),
    "the capped detail still opens on the first failure, so a reader sees what blocked");
  assert.ok(bOut.endsWith(" | " + PASS + " | " + HEAD),
    "the two counts are the LAST thing the cap gives up -- they must survive a truncated [FAIL] run");

  // --- (C) the shapes with no notice, no summary, and no [FAIL] vocabulary at all ----------------
  assert.equal(sum({ stdout: [F1, PASS].join("\n"), stderr: "" }), F1.trim() + " | " + PASS,
    "a failure with only a pass count keeps that count");
  assert.equal(sum({ stdout: F1, stderr: "" }), F1.trim(),
    "a failure with no summary line at all is the failure alone -- no stray separator");
  assert.equal(sum({ stdout: "a\nb\nc\nd", stderr: "npm ERR! build broke" }), "c | d | npm ERR! build broke",
    "output with no [FAIL] vocabulary (npm build, the hygiene tripwire) still falls back to the last three COMBINED lines");

  // --- (D) the CI gate is in its own constant, and it cannot take the auto-done bar --------------
  assert.deepEqual(SELF_CERTIFYING_CI_FILES, [".github/workflows/ci.yml", "scripts/ci-new-reds.js"],
    "the CI half of the verification is these two files");
  assert.deepEqual(SELF_CERTIFYING_PATHS, ["scripts/verifier.js", "scripts/check-session-docs.js", "tests/regression/run-all.js"],
    "the CI files must NOT be appended to SELF_CERTIFYING_PATHS -- agt-67-verifier.test.mjs clause (5) " +
    "binds every entry of THIS list to the live vf-guardrails text, and this ticket writes no Skill row (D1)");

  for (const p of SELF_CERTIFYING_CI_FILES) {
    const got = selfCertificationBlock(["docs/SESSIONS.md", p]);
    assert.equal(got.blocked, true, `a diff touching ${p} grades itself and must be refused the auto-done bar`);
    assert.ok(got.reason.includes(p),
      `the refusal must NAME ${p} -- a blanket refusal reads the same in the ledger as a real hit`);
  }

  for (const clean of [".github/workflows/meter-reader.yml", "scripts/ci-new-reds.js.bak", "docs/SESSIONS.md"]) {
    assert.equal(selfCertificationBlock([clean]).blocked, false,
      `${clean} is not the verification: the match is exact array membership, never substring, so this must stay unblocked`);
  }

  console.log("  AGT-790: (A) both counts survive a red gate and the retired form provably drops the " +
    "not-run notice; (B) the 600-byte cap is spent on [FAIL] text, landing exactly on DETAIL_CAP with " +
    "both counts still at the tail; (C) no-notice / no-summary / no-[FAIL] shapes unchanged; (D) the " +
    "two CI files block the auto-done bar by name from their own constant, SELF_CERTIFYING_PATHS is " +
    "untouched, and three near-miss paths stay unblocked.");
}

export default run;
selfRun(import.meta.url, run);
