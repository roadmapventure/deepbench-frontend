// DeepBench v6.3.222 | tests/regression/HAR-21-claim-resolver.js | HAR-21
// FEATURE: HAR-21 -- Category M persistence (STANDARDS.md Section 4/5). Imports the REAL
// resolveReferenceIds from lib/claim-resolver.js -- never a reimplementation, so a future edit to
// the service is what this test measures, not a copy of it that drifts silently.
//
// The failing input in case 3 is the literal one that broke AGT-37 live on 2026-07-29: Elena Cho --
// The Reasoner lifted the shortened chunk reference `(id: 0cecd001)` out of flagged_answer prose,
// lib/search-harness.js's AA-189 guard correctly refused it, and the whole Store as Forecast
// sequence died with a 422. Under this service that write degrades to an honest [].

import assert from "assert";
import { resolveReferenceIds } from "../../lib/claim-resolver.js";
import { selfRun } from "./_lib/self-run.js";

const REAL_UUID = "6bef824b-c56e-487b-a976-cccdefe567c4";
const OTHER_UUID = "0cecd001-1c8c-4b2f-9f0a-2b7d1e5a4c33";
const DECOY = "0cecd001"; // the live failing input -- a truncated chunk reference, not a UUID

export default async function run() {
  // 1. A caller-supplied fact beats a model claim, and the decoy never reaches the result.
  const caseOne = resolveReferenceIds({ supplied: [REAL_UUID], claimed: [DECOY] });
  assert.deepEqual(caseOne.ids, [REAL_UUID], "supplied id must win over a model claim");
  assert.equal(caseOne.source, "caller", "source must be 'caller' when supplied wins");
  assert.deepEqual(caseOne.dropped, [], "supplied path drops nothing -- claimed is not evaluated");

  // 2. With nothing supplied, a well-formed model claim is kept and nothing is dropped.
  const caseTwo = resolveReferenceIds({ supplied: [], claimed: [REAL_UUID] });
  assert.deepEqual(caseTwo.ids, [REAL_UUID], "a well-formed model claim is kept");
  assert.equal(caseTwo.source, "model-claim", "source must be 'model-claim'");
  assert.deepEqual(caseTwo.dropped, [], "a well-formed claim is not dropped");

  // 3. THE LIVE FAILING INPUT: a truncated id degrades to an honest empty link, recorded as dropped.
  const caseThree = resolveReferenceIds({ supplied: [], claimed: [DECOY] });
  assert.deepEqual(caseThree.ids, [], "the truncated decoy must never be written");
  assert.deepEqual(caseThree.dropped, [DECOY], "the decoy must be reported as dropped, not silent");
  assert.equal(caseThree.source, "none", "an all-dropped claim resolves to source 'none'");

  // 4. Mixed claim: the valid id survives, the truncated one does not. Not a blanket id-stripper.
  const caseFour = resolveReferenceIds({ supplied: null, claimed: [REAL_UUID, DECOY] });
  assert.deepEqual(caseFour.ids, [REAL_UUID], "only the well-formed id survives a mixed claim");
  assert.deepEqual(caseFour.dropped, [DECOY], "only the malformed id is dropped");
  assert.equal(caseFour.source, "model-claim", "a surviving claim is still source 'model-claim'");

  // 5. Both absent -- a correct, expected outcome, never a throw.
  for (const input of [{}, { supplied: null, claimed: null }, { supplied: [], claimed: [] }, undefined]) {
    const empty = resolveReferenceIds(input);
    assert.deepEqual(empty.ids, [], "absent input resolves to []");
    assert.equal(empty.source, "none", "absent input resolves to source 'none'");
    assert.deepEqual(empty.dropped, [], "absent input drops nothing");
  }

  // 6. Non-string entries in either input are dropped rather than thrown on. A malformed `supplied`
  //    falls through to `claimed` -- the caller is not more trustworthy than the guard.
  const junk = [null, 42, { id: REAL_UUID }, undefined, ""];
  const caseSixClaimed = resolveReferenceIds({ supplied: [], claimed: junk });
  assert.deepEqual(caseSixClaimed.ids, [], "no non-string entry is ever kept");
  assert.equal(caseSixClaimed.dropped.length, junk.length, "every non-string entry is reported dropped");
  assert.equal(caseSixClaimed.source, "none", "an all-junk claim resolves to source 'none'");

  const caseSixSupplied = resolveReferenceIds({ supplied: junk, claimed: [REAL_UUID] });
  assert.deepEqual(caseSixSupplied.ids, [REAL_UUID], "a malformed supplied value falls through to claimed");
  assert.equal(caseSixSupplied.source, "model-claim", "fall-through is honestly labelled 'model-claim'");

  // Bare (non-array) scalars are accepted on both sides -- the handler passes whatever the model
  // emitted, which is not guaranteed to be an array.
  const scalar = resolveReferenceIds({ supplied: OTHER_UUID, claimed: DECOY });
  assert.deepEqual(scalar.ids, [OTHER_UUID], "a bare supplied string is normalized to an array");
  assert.equal(scalar.source, "caller", "a bare supplied string still wins");

  const scalarClaim = resolveReferenceIds({ claimed: DECOY });
  assert.deepEqual(scalarClaim.ids, [], "a bare truncated claim is dropped");
  assert.deepEqual(scalarClaim.dropped, [DECOY], "a bare truncated claim is reported dropped");

  // The guard is not weakened: a well-formed but fabricated UUID is well-formed here by design and
  // is left for lib/search-harness.js's AA-189 cross-room/existence check to deny, exactly as before.
  const fabricated = resolveReferenceIds({ claimed: ["aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"] });
  assert.equal(fabricated.ids.length, 1, "a well-formed UUID passes the resolver -- existence is AA-189's job");
}

selfRun(import.meta.url, run);
