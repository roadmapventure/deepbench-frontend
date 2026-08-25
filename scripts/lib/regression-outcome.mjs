// DeepBench v7.0.251 | scripts/lib/regression-outcome.mjs | SES-71 -- account-level failures are
// UNMEASURED, never FAIL.
//
// THE BUG THIS EXISTS FOR, measured live 2026-08-01 (S-HAR-02b QA): chi-true-regression.mjs turns
// every thrown error into `terminal: "infra_death"`, `case_pass: false`, and the run verdict is
// `results.every(r => r.case_pass)`. So when the ANTHROPIC ACCOUNT ran out of usage on 2026-07-31
// (~23:00 UTC, SES-66's class, reset at the month boundary), 15 cases that were never actually
// exercised were recorded as failures and the gate read as 9 FAILs. A gate that says FAIL when it
// measured nothing is worse than one that says nothing: it invites a session to go hunting for a
// regression that does not exist, and it hides the one fact that mattered -- the run did not run.
//
// THE DISTINCTION THAT DOES THE WORK, and the one an editor will collapse: `err.status` is OUR
// API's HTTP status; `err.upstreamStatus` is the status the model provider returned, attached by
// postJSON() in the driver. A 400 from OUR api/capabilities/execute is a malformed request -- a
// real, case-level defect that must still FAIL. A 400 from UPSTREAM on a request our own API
// accepted is the usage-cap signature. Keying this on `status` instead of `upstreamStatus` would
// silently reclassify genuine request-shape bugs as "unmeasured" and make the suite unable to fail,
// which is the same defect as the original with the sign flipped. tests/regression/
// SES-71-unmeasured-outcome-class.js pins both directions.
//
// This module is deliberately SEPARATE from the driver and holds no I/O: the driver calls
// loadBypassSecret() at module scope and process.exit(1)s without credentials, so a test that
// imported it could never run in CI. Splitting the pure logic out is what lets the guard import the
// real functions instead of re-implementing them -- the failure SES-45 is filed about.

// How many CONSECUTIVE account-dead cases end the run.
//
// NOT CHOSEN FOR FEEL. The incident this ticket is written from ran 15 consecutive cases into a
// dead account, so any N >= 1 would have caught it; the constraint is the other direction. N = 1
// would abort a whole run on a single unlucky case, so the smallest value that cannot fire on one
// case is 2 -- and a case is only account-dead when BOTH of its attempts died account-level, so
// N = 2 already means four consecutive account-level errors. The cost of being wrong is bounded and
// asymmetric: too high wastes minutes of a run that was doomed anyway, too low destroys a real run.
export const ACCOUNT_DEATH_ABORT_N = 2;

// Text signatures of an account/environment-level failure. Kept beside the status rule rather than
// replacing it: `fetch failed` is undici's local network death (named in the ticket) and never
// carries an upstream status at all, so a status-only rule misses exactly the second half of the
// class SES-71 names.
const ACCOUNT_ERROR_TEXT = /fetch failed|credit balance|usage limit|quota exceeded|rate.?limit|overloaded|insufficient[_ ]quota/i;

/**
 * Classify a thrown driver error as account-level (the environment is dead, nothing was measured)
 * or case-level (a real finding about the platform).
 * Pure. Returns "account" | "case".
 */
export function classifyInfraError(err) {
  if (!err) return "case";
  // The model provider rejected a request our own API had already accepted -- SES-66's usage-cap
  // signature. Read upstreamStatus, NEVER status (see the header).
  if (err.upstreamStatus === 400 || err.upstreamStatus === 401 || err.upstreamStatus === 429) return "account";
  if (err.failureClass === "account" || err.failureClass === "upstream_quota") return "account";
  const msg = typeof err.message === "string" ? err.message : "";
  if (ACCOUNT_ERROR_TEXT.test(msg)) return "account";
  return "case";
}

/**
 * Reduce the per-case records to the run verdict.
 * Pure. `case_pass === null` is the unmeasured marker set by the driver.
 *
 * run_pass_server_side is NULL -- not false -- as soon as ANY case is unmeasured, and that is the
 * whole point of the ticket: a suite cannot report a verdict over cases it never exercised. null is
 * also the fail-closed direction, because every existing reader tests for `=== true` or truthiness,
 * so an unmeasured run can never be read as green by code written before this shipped.
 */
export function summarizeRun(results) {
  const total = results.length;
  const unmeasured = results.filter(r => r.case_pass === null).length;
  const measured = total - unmeasured;
  const run_pass_server_side =
    total === 0 ? null
      : unmeasured > 0 ? null
        : results.every(r => r.case_pass === true);
  return { total, measured, unmeasured, run_pass_server_side };
}
