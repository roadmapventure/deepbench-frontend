// DeepBench v7.0.251 | tests/regression/SES-71-unmeasured-outcome-class.js | SES-71
//
// Guards the rule that an ACCOUNT-level failure is UNMEASURED, never FAIL, in
// scripts/chi-true-regression.mjs and scripts/lib/regression-outcome.mjs.
//
// IT IMPORTS THE REAL FUNCTIONS rather than restating them, which is the whole reason the reducer
// was split into its own module: the driver calls loadBypassSecret() at module scope and
// process.exit(1)s without credentials, so a guard that imported the driver could not run in CI and
// would have had to re-implement the logic -- SES-45's defect, filed on this very suite. The half
// that CANNOT be imported (the wiring inside the driver: the three-value console word, the abort
// loop, the terminal) is asserted against the driver's source, the SES-64 precedent in this
// directory.
//
// EVERY ASSERTION HAS A NEGATIVE CONTROL -- the same input with the one thing that should matter
// removed. "Would this still pass if the change did nothing?" must answer "no". Two clauses carry
// the ticket's own measured incident as their control:
//
//   * `null-is-not-false` -- summarizeRun over one unmeasured case must return null. The PRE-CHANGE
//     expression (`results.every(r => r.case_pass)`) returns FALSE on the identical input, and the
//     test asserts that difference directly rather than trusting the new value in isolation. This
//     is the 9-FAIL gate read the ticket is written from, reproduced in four lines.
//   * `upstream-not-ours` -- a 400 from OUR api must stay case-level. Without this the obvious
//     "simplification" (key on err.status) passes every other clause in this file while making the
//     suite structurally unable to fail, which is SES-71's bug with the sign flipped.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied (SES-180 (b)): it never executes a
// live 24-case run -- that costs real money and needs credentials this suite does not assume. The
// abort loop is asserted structurally, and the reducer is asserted behaviourally over fixtures.

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import { classifyInfraError, summarizeRun, ACCOUNT_DEATH_ABORT_N } from "../../scripts/lib/regression-outcome.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRIVER_PATH = path.join(__dirname, "..", "..", "scripts", "chi-true-regression.mjs");

// The pre-change run verdict, reproduced verbatim from the shipped file at v7.0.34 so the controls
// below compare against what ACTUALLY ran, not against a paraphrase of it.
const legacyVerdict = results => (results.length === 0 ? null : results.every(r => r.case_pass));

const caseRec = (over = {}) => ({ n: 1, id: "x", case_pass: true, terminal: "direct", fail_causes: [], ...over });
const measuredPass = () => caseRec({ case_pass: true });
const measuredFail = () => caseRec({ case_pass: false, terminal: "infra_death", fail_causes: ["infra_death: boom"] });
const unmeasured = () => caseRec({ case_pass: null, terminal: "unmeasured", unmeasured_reason: "account_error: fetch failed" });

export default async function run() {
  const source = fs.readFileSync(DRIVER_PATH, "utf8");

  // ---- 1. classifyInfraError: the account side --------------------------------------------------
  assert.strictEqual(
    classifyInfraError({ message: "HTTP 500 from api", upstreamStatus: 400 }), "account",
    "an upstream 400 (SES-66's usage-cap signature) classifies as account-level"
  );
  assert.strictEqual(
    classifyInfraError({ message: "fetch failed" }), "account",
    "undici's local network death classifies as account-level"
  );

  // ---- 2. THE PIN: upstream, never ours ---------------------------------------------------------
  // Negative control for clause 1: the SAME 400, on OUR status field instead of upstream's.
  assert.strictEqual(
    classifyInfraError({ message: "HTTP 400 from api/capabilities/execute", status: 400 }), "case",
    "a 400 from OUR OWN api is a malformed request and stays case-level -- keying this on err.status instead of err.upstreamStatus makes the suite unable to fail"
  );
  assert.strictEqual(
    classifyInfraError({ message: "news door: Jordan returned zero stories" }), "case",
    "an ordinary platform failure is case-level"
  );
  assert.strictEqual(
    classifyInfraError({ message: "non-JSON response (HTTP 502) from api" }), "case",
    "a gateway error with no upstream status is case-level, not silently excused"
  );

  // ---- 3. THE PIN: null is not false ------------------------------------------------------------
  const oneUnmeasured = [measuredPass(), measuredPass(), unmeasured()];
  const summary = summarizeRun(oneUnmeasured);
  assert.strictEqual(
    summary.run_pass_server_side, null,
    "a run containing ANY unmeasured case reports null -- it measured neither pass nor fail"
  );
  assert.strictEqual(
    legacyVerdict(oneUnmeasured), false,
    "NEGATIVE CONTROL: the pre-change expression returns FALSE on the identical input -- this is the 9-FAIL gate read the ticket is written from, and the difference between these two lines is the entire ship"
  );
  assert.notStrictEqual(
    summary.run_pass_server_side, legacyVerdict(oneUnmeasured),
    "the new verdict and the old verdict genuinely differ on this input (a vacuous control would let both be false)"
  );
  assert.strictEqual(summary.measured, 2, "measured counts only the cases actually exercised");
  assert.strictEqual(summary.unmeasured, 1, "unmeasured is reported as its own total");

  // ---- 4. an unmeasured run is still not GREEN, and a real FAIL is still a FAIL ------------------
  assert.strictEqual(
    summarizeRun([measuredPass(), measuredPass()]).run_pass_server_side, true,
    "a complete, clean run still reports true -- this ship does not make the gate unfailable-green"
  );
  assert.strictEqual(
    summarizeRun([measuredPass(), measuredFail()]).run_pass_server_side, false,
    "a real case failure still reports FALSE -- unmeasured must not become a hiding place for regressions"
  );
  assert.notStrictEqual(
    summarizeRun([measuredPass(), measuredFail()]).run_pass_server_side,
    summarizeRun([measuredPass(), unmeasured()]).run_pass_server_side,
    "FAIL and UNMEASURED are distinguishable run verdicts -- the conflation SES-71 names"
  );

  // ---- 5. the abort threshold -------------------------------------------------------------------
  assert.strictEqual(
    ACCOUNT_DEATH_ABORT_N, 2,
    "the abort fires on 2 consecutive account-dead cases -- 1 would abort a whole run on a single unlucky case, and a case is only account-dead when BOTH its attempts died account-level"
  );

  // ---- 6. the driver's wiring (source-asserted; the driver cannot be imported) -------------------
  assert.ok(
    /import \{ classifyInfraError, summarizeRun, ACCOUNT_DEATH_ABORT_N \} from "\.\/lib\/regression-outcome\.mjs";/.test(source),
    "the driver imports the real reducer rather than carrying its own copy"
  );
  assert.ok(
    !/const run_pass_server_side = results\.length === 0 \? null : results\.every/.test(source),
    "the pre-change inline verdict expression is GONE from the driver -- leaving it beside the new one would give the rule two homes and let them disagree"
  );
  assert.ok(
    /case_pass: accountDeath \? null : fail_causes\.length === 0/.test(source),
    "finalizeCase sets case_pass to null (not false) on an account death"
  );
  assert.ok(
    /terminal: accountDeath \? "unmeasured" : "infra_death"/.test(source),
    "the terminal distinguishes an account death from an infra death rather than reusing one word for both"
  );
  assert.ok(
    /if \(infraDeath && !accountDeath\) fail_causes\.push/.test(source),
    "an account death contributes NO fail cause -- it is not a finding about the platform"
  );

  // The console word. This is the exact expression the bug shipped, so the assertion is paired:
  // the three-value form must be present AND the two-value form must be gone.
  assert.ok(
    /record\.case_pass === null \? "UNMEASURED" : record\.case_pass \? "PASS" : "FAIL"/.test(source),
    "the per-case progress line has a third word for the third value"
  );
  assert.ok(
    !/\$\{record\.case_pass \? "PASS" : "FAIL"\}/.test(source),
    "NEGATIVE CONTROL: the two-value expression that printed FAIL over 15 unrun cases is gone -- null is falsy, so adding the UNMEASURED branch beside it would have changed nothing"
  );

  assert.ok(
    /consecutiveAccountDeaths >= ACCOUNT_DEATH_ABORT_N/.test(source),
    "the run loop aborts on the shared threshold constant, not on a literal of its own"
  );
  assert.ok(
    /consecutiveAccountDeaths = isAccountDeath \? consecutiveAccountDeaths \+ 1 : 0/.test(source),
    "the streak RESETS on any measured case -- a counter that only climbed would abort a healthy long run after two unrelated transients"
  );
  assert.ok(
    /function notRunRecord\(/.test(source) && /not_run: run aborted after/.test(source),
    "cases the abort skipped are recorded as unmeasured/not_run rather than left as a hole in the case list"
  );
  assert.ok(
    /cases_measured: summary\.measured, cases_unmeasured: summary\.unmeasured/.test(source),
    "the report's totals separate what was measured from what was merely recorded"
  );
}

selfRun(import.meta.url, run);
