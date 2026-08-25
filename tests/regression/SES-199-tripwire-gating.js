// DeepBench v7.0.242 | tests/regression/SES-199-tripwire-gating.js | SES-199 (M3 Independent Verification)
//
// Guards the gating mode in scripts/check-session-docs.js -- the thing that lets the truth tripwire
// go red at all. Before SES-199 that script ended in process.exit(0) on every path.
//
// The policy is IMPORTED from the real script, never restated here (John, 2026-08-23: "you should
// never be throwing away tests"; and a test that copies the logic it guards passes forever while
// the shipped file rots). So GATING_CHECKS below is the shipped set: if a later edit widens it to
// get past a red gate, these assertions move with it and the widening is visible in this file's
// diff rather than silent.
//
// Every assertion is paired with a NEGATIVE CONTROL -- the same fixture with the one thing that
// should matter changed -- because the failure this whole ticket exists to close is a check that
// reports green while looking at nothing. "Would this still pass if the gate did nothing?" must
// answer "no" for each case.

import assert from "assert";
import { selfRun } from "./_lib/self-run.js";
import {
  GATING_CHECKS,
  GATING_SEVERITY,
  gatingFindings,
  gateModeRequested,
} from "../../scripts/check-session-docs.js";

const F = (check, severity, detail = "fixture") => ({ check, severity, detail });

// ---------------------------------------------------------------------------
// The gating set is the truth-registry classes, and nothing else
// ---------------------------------------------------------------------------
function gatingSetIsTheTruthRegistryClasses() {
  assert.deepStrictEqual(
    [...GATING_CHECKS].sort(),
    ["10", "11", "9"].sort(),
    "the gating set must be checks 9/10/11 -- the truth-registry checks. Widening it is a decision: " +
    "change the header's reasoning and this assertion together, never the set alone."
  );
  assert.strictEqual(GATING_SEVERITY, "FLAG");
}

function truthRegistryFlagGates() {
  const findings = [F("10", "FLAG", "canonical_doc does not exist")];
  assert.strictEqual(gatingFindings(findings).length, 1);

  // NEGATIVE CONTROL: identical finding, one variable changed -- the class. A size ratchet in
  // exactly the same shape must NOT gate, or the gate refuses changes over a doc being 1 KB big.
  const control = [F("1", "FLAG", "CLAUDE-STATE.md is over the baseline")];
  assert.strictEqual(gatingFindings(control).length, 0,
    "check 1 is a size ratchet and must stay advisory");
}

function advisoryChecksNeverGateHoweverManyThereAre() {
  // The live board's real shape at this ship: 18 over-cap description FLAGs (check 3d), plus the
  // 3c/3e counted WARNs. The ticket names these "plainly advisory" in John's own review.
  const findings = [];
  for (let i = 0; i < 18; i++) findings.push(F("3d", "FLAG", `ticket ${i} description over cap`));
  findings.push(F("3c", "WARN"), F("3e", "WARN"), F("6", "FLAG", "STANDARDS.md over baseline"));
  assert.strictEqual(gatingFindings(findings).length, 0,
    "21 advisory findings must not fail the gate -- a gate red on arrival is ignored, which is the " +
    "rubber stamp's twin failure rather than its fix");
}

// ---------------------------------------------------------------------------
// Severity is the second half of the policy, and it is load-bearing
// ---------------------------------------------------------------------------
function warnInAGatingClassDoesNotGate() {
  // This is the live case at this ship: B31/B32's stale canonical_doc anchors are check-10 WARNs,
  // and they are SES-202's ticket. Check 10 argues the severity itself ("a stale anchor rather
  // than a missing home -- WARN, not FLAG"), so the gate honours that judgement.
  const findings = [F("10", "WARN", "canonical_doc names a section that could not be located")];
  assert.strictEqual(gatingFindings(findings).length, 0);

  // NEGATIVE CONTROL: same class, same text, severity raised. It must gate -- otherwise the
  // severity test above is passing because NOTHING gates.
  const promoted = [F("10", "FLAG", "canonical_doc names a section that could not be located")];
  assert.strictEqual(gatingFindings(promoted).length, 1);
}

// ---------------------------------------------------------------------------
// Fail-closed: a gate that goes green having looked at nothing is the defect
// ---------------------------------------------------------------------------
function registryThatCouldNotBeReadFailsTheGate() {
  // loadRules() reports both unreadable-snapshot cases as check-9 FLAGs, so this arrives in the
  // gating set for free. If a later edit moves that reporting to another class or downgrades it to
  // WARN, the gate would pass on a run that checked nothing -- this assertion is what catches that.
  const missing = [F("9", "FLAG", "RULES-SNAPSHOT.md not found -- the truth checks (9/10/11) could not run at all")];
  const unparseable = [F("9", "FLAG", "RULES-SNAPSHOT.md parsed to zero rule rows -- the truth checks could not run")];
  assert.strictEqual(gatingFindings(missing).length, 1);
  assert.strictEqual(gatingFindings(unparseable).length, 1);
}

function cleanBoardIsGreen() {
  assert.strictEqual(gatingFindings([]).length, 0);
}

// ---------------------------------------------------------------------------
// The default invocation is unchanged, which is the compatibility half
// ---------------------------------------------------------------------------
function gateIsOptInOnly() {
  assert.strictEqual(gateModeRequested(["node", "check-session-docs.js"]), false,
    "the bare invocation is what CI runs today -- it must never gate");
  assert.strictEqual(gateModeRequested(["node", "check-session-docs.js", "--worktree=/tmp/x"]), false);
  assert.strictEqual(gateModeRequested(["node", "check-session-docs.js", "--gate"]), true);
  assert.strictEqual(gateModeRequested(["node", "check-session-docs.js", "--worktree=/tmp/x", "--gate"]), true);

  // NEGATIVE CONTROL: a flag that merely CONTAINS the word must not switch the mode on, or an
  // unrelated future `--gate-list` silently starts failing runs.
  assert.strictEqual(gateModeRequested(["node", "check-session-docs.js", "--gateway"]), false);
}

function run() {
  gatingSetIsTheTruthRegistryClasses();
  truthRegistryFlagGates();
  advisoryChecksNeverGateHoweverManyThereAre();
  warnInAGatingClassDoesNotGate();
  registryThatCouldNotBeReadFailsTheGate();
  cleanBoardIsGreen();
  gateIsOptInOnly();
}

selfRun(import.meta.url, run);
export default run;
