// DeepBench v7.0.380 | tests/regression/ses-247-partial-remainder-tree.test.mjs | SES-247 (M6, built ahead by John's order)
//
// The chain gate handed back, three times in one hour, a `partial` the closing cycle had just
// declared not buildable now (SES-154's defect in its fourth costume). SES-247 closes it by a
// decision tree recorded in docs/runbooks/runner-cycle.md rather than a new column: (a) the
// remainder awaits another ticket -> blocked_by; (b) it awaits a decision -> the closing cycle
// decides now (M6-01) and either builds or leaves the partial re-pickable; (c) it is genuinely not
// buildable now for a non-ticket reason -> defer_status = 'yes' with the reason, which SES-305
// keeps out of the pick and reports in the census. The forbidden one-liner (status <> 'partial')
// stays forbidden. Doc arm with negative controls; the pick-path behaviour it relies on is graded by
// tests/regression/ses-305-deferred-never-picked.test.mjs.
//
// Invocation: node tests/regression/ses-247-partial-remainder-tree.test.mjs

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DOC_REL = "docs/runbooks/runner-cycle.md";

const CLAUSES = [
  {
    id: "fourth-costume-section-present",
    test: s => /\*\*Fourth costume, closed by `SES-247` \(2026-09-02, v7\.0\.380\)/.test(s),
    breaks: s => s.replace("Fourth costume, closed by `SES-247`", "Fourth costume, still open"),
    detail: "the runbook must carry SES-247's closing section at the partial/remainder criterion",
  },
  {
    id: "three-branches-named",
    test: s => /\(a\)[^\n]*`blocked_by`/.test(s) && /\(b\)[^\n]*decide(s| it) now/.test(s) && /\(c\)[^\n]*`defer_status = 'yes'`/.test(s),
    breaks: s => s.replace("write `defer_status = 'yes'` with `defer_reason`", "write `defer_status = 'maybe'` with `defer_reason`"),
    detail: "all three branches of the decision tree must be present: blocked_by, decide now (M6-01), defer with reason",
  },
  {
    id: "forbidden-one-liner-still-forbidden",
    test: s => /`AND b\.status <> 'partial'`/.test(s) && /NOT uniformly do-not-re-pick/.test(s),
    breaks: s => s.replace(/NOT uniformly do-not-re-pick/g, "uniformly do-not-re-pick"),
    detail: "SES-218's boundary survives: a buildable partial must come back; the blanket clause is never the fix",
  },
];

async function run() {
  const results = [];
  const s = fs.readFileSync(path.join(REPO, DOC_REL), "utf8").replace(/\r\n/g, "\n");
  for (const c of CLAUSES) {
    assert.ok(c.test(s), `${DOC_REL} lost clause "${c.id}": ${c.detail}`);
    const mutated = c.breaks(s);
    assert.notStrictEqual(mutated, s, `control: mutation for "${c.id}" changed nothing`);
    assert.ok(!c.test(mutated), `control: clause "${c.id}" still passes after its own mutation`);
    results.push(c.id);
  }
  return results;
}

selfRun(import.meta.url, run);
export default run;
