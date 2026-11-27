// DeepBench v7.0.1127 | tests/regression/agt-822-regrade-line-names-its-count.test.mjs | AGT-822
//
// A RE-GRADED GATE LINE STATES THE COUNT OF TESTS ITS CI JOB RAN, OR NAMES THE ABSENCE.
//
// WHAT THE RETIRED LINE DID. `regradeGateResults()` wrote `CI job "<job>" = <conclusion>` as a
// re-graded gate's WHOLE source, and the map it read from kept only `j.conclusion ?? null` -- so
// every other field of the CI job entry was discarded before the line was built. A reader of the
// stored verdict could not tell a job that ran one test from a job that ran two hundred.
//
// WHY ARM A IS AN ABSENCE AND NOT A SKIP. Live `ci_run_conclusions` publishes no `tests_run` at all
// (600 of 600 job entries in the newest 300 rows carry only `name` and `conclusion`), so TODAY every
// re-graded line takes the absence branch. That makes the absence the production path, not the edge
// case: it is asserted as an exact string, and the sentence must also reach `reason`, because the
// reason is what the ledger row shows a human.
//
// WHY ARM C IS SIX NEAR-MISSES. `tests_run` is read off data this file does not control, so the
// count must be a NON-NEGATIVE INTEGER or it is not a count. `"7"` (a numeric string), `-1`, `1.5`,
// `null`, `NaN` and `true` each pass at least one looser test -- `n >= 0` admits `"7"`, `true` and
// `1.5`; `typeof n === "number"` admits `-1`, `1.5` and `NaN` -- so a single discriminating fixture
// would not catch the guard being loosened. All six must print the absence instead.
//
// WHY ARM D CUTS FROM THE CONCLUSION. The count is the new information and it sits at the tail, so
// the 600-byte `DETAIL_CAP` is taken out of the conclusion text and never out of the count. With a
// 2000-byte conclusion the result must be EXACTLY `DETAIL_CAP` and must still END on the count --
// an implementation that capped the whole assembled line would land on 600 too but lose the tail,
// which is the defect wearing the other hat.
//
// WHY ARM E EXISTS. This ticket moves source TEXT only. No gate status, verdict or exit code moves,
// so a re-grade's `gateResults` must be byte-identical with and without a `tests_run` present.
//
// PURE AND READ-ONLY: no network, no credentials, no database, no model call, no writes.

import assert from "node:assert/strict";
import { selfRun } from "./_lib/self-run.js";
import { regradeGateResults, regradeSourceLine, DETAIL_CAP } from "../../scripts/verifier.js";

const B = "Build (blocking)";
const C = "Tripwire + regression (blocking)";
const ABSENT = "; tests run: not published by CI";
const RED1 = { build: "green", regression: "red", hygiene: "green" };
const jobs = (b, c) => [{ name: B, conclusion: b }, { name: C, ...c }];

const line = regradeSourceLine;
const grade = regradeGateResults;

async function run() {
  // (A) ABSENCE -- the live shape. The CI entry carries no `tests_run`, so the line says so, and
  // the sentence reaches the stored reason as well as the per-gate source.
  const r = grade({ gates: RED1, jobs: jobs("failure", { conclusion: "success" }) });
  assert.equal(r.ok, true, `a red regression gate whose CI job is success re-grades: ${r.reason}`);
  assert.equal(r.source.regression, `CI job "${C}" = success` + ABSENT,
    "the re-graded regression source states the absence of a published count, exactly");
  assert.ok(r.reason.includes(ABSENT),
    `the reason a reader sees carries the absence too, not only source: ${r.reason}`);

  // (B) COUNT -- a non-negative integer prints as the count. Zero is a real count, not a falsy
  // value to fall through: a job that ran no tests is a different fact from a job that published
  // nothing, and the two must not collapse onto one sentence.
  const seven = grade({ gates: RED1, jobs: jobs("failure", { conclusion: "success", tests_run: 7 }) });
  assert.equal(seven.source.regression, `CI job "${C}" = success; tests run: 7`,
    "a published count of 7 is stated as the count, not as an absence");
  const zero = grade({ gates: RED1, jobs: jobs("failure", { conclusion: "success", tests_run: 0 }) });
  assert.ok(zero.source.regression.endsWith("; tests run: 0"),
    `0 is a count, not a missing value: ${zero.source.regression}`);

  // (C) NOT A COUNT -- six near-misses, each admitted by some looser guard, all printing absence.
  for (const v of ["7", -1, 1.5, null, NaN, true]) {
    const got = line(C, { conclusion: "success", tests_run: v });
    assert.ok(got.endsWith(ABSENT),
      `tests_run=${String(v)} (${typeof v}) is not a non-negative integer, so the line must name the absence: ${got}`);
  }
  assert.equal(line(C, undefined), `CI job "${C}" = null` + ABSENT,
    "no entry at all: the conclusion reads null and the count reads absent, both named rather than thrown");

  // (D) CAP -- spent on the conclusion, never on the count.
  const long = line(C, { conclusion: "x".repeat(2000) });
  assert.equal(long.length, DETAIL_CAP,
    `a 2000-byte conclusion is cut to exactly DETAIL_CAP (got ${long.length})`);
  assert.ok(long.endsWith(ABSENT),
    "the cap is taken out of the conclusion, so the absence sentence survives at the tail");
  const longCounted = line(C, { conclusion: "x".repeat(2000), tests_run: 12 });
  assert.equal(longCounted.length, DETAIL_CAP,
    `with a count the cut still lands on exactly DETAIL_CAP (got ${longCounted.length})`);
  assert.ok(longCounted.endsWith("; tests run: 12"),
    `the count is never what gets cut: ${longCounted.slice(-40)}`);

  // (E) NO STATUS MOVES -- text only, with and without a count, and on an empty prior verdict.
  const withCount = grade({ gates: RED1, jobs: jobs("success", { conclusion: "failure", tests_run: 99 }) });
  assert.deepEqual(withCount.gateResults, { build: "green", regression: "red", hygiene: "green" },
    "a failure conclusion still grades red and a carried green stays green -- the count changes no status");
  const without = grade({ gates: RED1, jobs: jobs("success", { conclusion: "failure" }) });
  assert.deepEqual(without.gateResults, { build: "green", regression: "red", hygiene: "green" },
    "identical gateResults without tests_run: this delivery moves source text only");
  const fresh = grade({ gates: {}, jobs: jobs("success", { conclusion: "success" }) });
  for (const key of ["build", "regression", "hygiene"]) {
    assert.equal(fresh.gateResults[key], "green",
      `every gate re-graded from a success job is green (${key})`);
    assert.ok(fresh.source[key].endsWith(ABSENT),
      `each re-graded gate's own source names the absent count (${key}): ${fresh.source[key]}`);
  }

  console.log("  AGT-822: (A) the live absence is stated exactly and reaches the reason; (B) 7 and 0 " +
    "both print as counts; (C) six near-miss values -- \"7\", -1, 1.5, null, NaN, true -- and a missing " +
    "entry all name the absence; (D) a 2000-byte conclusion lands on exactly DETAIL_CAP with the count " +
    "intact at the tail; (E) gateResults are identical with and without a count, and all three gates " +
    "re-grade green from a success job.");
}

export default run;
selfRun(import.meta.url, run);
