// DeepBench v7.0.392 | tests/regression/ses-301-b34-rendered-block.test.mjs | SES-301
//
// FEATURE: SES-301 -- B34 was superseded by M6-07 (SES-285, v7.0.359) yet docs/runbooks/runner-cycle.md
// step 2 still rendered its {{rule:B34}} block, stating a withdrawn rule in live voice -- the defect
// SES-300 fixed for B12. This guard pins BOTH directions of the removal (marker gone, rendered line
// gone), the premise that makes the removal correct (B34 reads `superseded` in the registry
// snapshot), and the clauses that live in the same passage and must survive the edit untouched:
// SES-289's withdrawal annotation, the three SES-134 pins, and the John reasoning SES-201 half 2
// holds byte-for-byte.
//
// DRY-RUN (STANDARDS.md Section 4), measured against the unchanged runbook at origin/dev 1b002d08
// before the kickoff committed: the two CHANGE clauses FAIL (marker present at step 2, rendered line
// present); the premise and all five KEEP clauses PASS, as preserved invariants must.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";
const SNAPSHOT_REL = "docs/governance/RULES-SNAPSHOT.md";
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

// Content clauses: each FAILS on the pre-change runbook and PASSES after SES-301's edit.
export const CHANGE = [
  { id: "b34-marker-is-gone",
    test: s => !s.includes("{{rule:B34}}"),
    detail: "a withdrawn rule keeps no rendered-rule marker (SES-300's B12 precedent)" },
  { id: "b34-rendered-line-is-gone",
    test: s => !/^> \*\*Rule B34\*\* —/m.test(s),
    detail: "the `> **Rule B34** — …` line restates a superseded rule in live voice" },
];

// Preserved invariants: PASS before AND after. They are here so the edit cannot take them with it.
export const KEEP = [
  { id: "ses-289-annotation-survives",
    test: s => /`B34` was SUPERSEDED 2026-09-01 by `M6-07`/.test(s) },
  { id: "ses-134-gated-card-touches-nothing",
    test: s => /`gated_before_build` card →\s+\*\*nothing\*\*\s+\(B34\)/.test(s) },
  { id: "ses-134-idempotence-is-structural",
    test: s => /runner_items\.ladder_applied_at/.test(s) && /idempotent by construction/.test(s) },
  { id: "ses-134-stale-grep-corrected",
    test: s => /\*\*both only read\*\*\s+it/.test(s) },
  { id: "johns-b34-reasoning-survives-byte-for-byte",
    test: s => s.includes("pays the runner for asking permission, which is the one behaviour\nthat must always be free") },
];

async function run() {
  const results = [];
  const runbook = read(RUNBOOK_REL);
  const snapshot = read(SNAPSHOT_REL);

  // Premise: the registry says B34 is superseded. If that ever flips back to live, the removal
  // below is the wrong state and this guard must say so rather than keep passing.
  assert.ok(/^\|\s*B34\s*\|\s*superseded\s*\|/m.test(snapshot),
    `${SNAPSHOT_REL}: B34 is not \`superseded\` -- re-export the snapshot or re-read SES-285`);
  results.push("b34-is-superseded-in-the-registry");

  for (const c of CHANGE) {
    assert.ok(c.test(runbook), `${RUNBOOK_REL} fails "${c.id}": ${c.detail}`);
    results.push(c.id);
  }
  for (const k of KEEP) {
    assert.ok(k.test(runbook), `${RUNBOOK_REL} lost preserved clause "${k.id}"`);
    results.push(k.id);
  }

  // Check 9's window is the enclosing block, so the withdrawal vocabulary must sit on the line that
  // mentions B34 -- a bold lead-in line naming the superseding rule (the SES-289 placement).
  const annot = runbook.split("\n").find(l => l.startsWith("**`B34` was SUPERSEDED"));
  assert.ok(annot && annot.includes("`M6-07`"),
    "the B34 withdrawal annotation must remain a bold lead-in line naming M6-07");
  assert.ok(!annot.includes("<!--"),
    "the annotation line must no longer carry the marker comment -- SES-289 joined them only because the block existed");
  results.push("annotation-is-a-clean-block-lead-in");
  return results;
}

selfRun(import.meta.url, run);
export default run;
