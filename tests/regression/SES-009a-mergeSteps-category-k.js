// DeepBench v6.3.208 | tests/regression/SES-009a-mergeSteps-category-k.js | SES-009a
// FEATURE: SES-009a — persistent regression suite seed
//
// Persists 5 of STANDARDS.md Section 4's mandatory Category K assertions
// against the REAL mergeSteps() implementation. A future change to
// mergeSteps.js that breaks one of these invariants fails THIS file, not
// just a one-off session test that gets deleted after one run.

import assert from "assert";
import { mergeSteps } from "../../src/utils/mergeSteps.js";
import { selfRun } from "./_lib/self-run.js";

export default async function run() {
  // 1. Label-based dedup (not ID-based) for LLM-generated steps
  const current = [{ id: "a1", label: "Research market", type: "agent" }];
  const incoming = [{ id: "a2", label: "Research market", type: "agent" }];
  const r1 = mergeSteps(current, incoming, []);
  assert.strictEqual(r1.active.length, 1, "same label with different id must dedup to 1 active step");
  assert.strictEqual(r1.active[0].mergeStatus, "unchanged", "matched label must be tagged unchanged");

  // 2. New step (no matching label in current) is tagged "new"
  const r2 = mergeSteps([], [{ id: "b1", label: "Fresh step", type: "agent" }], []);
  assert.strictEqual(r2.active[0].mergeStatus, "new", "step with no prior match must be tagged new");

  // 3. Unmatched old step threads onto nearest incoming as pendingArchive (not dropped)
  const r3 = mergeSteps(
    [{ id: "c1", label: "Old step", type: "agent" }],
    [{ id: "c2", label: "New step", type: "agent" }],
    []
  );
  assert.ok(r3.active[0].pendingArchive, "unmatched old step must be threaded onto an incoming step, not dropped");
  assert.strictEqual(r3.active[0].pendingArchive.label, "Old step");

  // 4. alreadyArchived passed through unchanged
  const archived = [{ id: "d1", label: "Done step", mergeStatus: "archived" }];
  const r4 = mergeSteps([], [], archived);
  assert.deepStrictEqual(r4.archived, archived, "alreadyArchived must pass through unmodified");

  // 5. Type derivation falls back to keyword detection when incoming has no type
  const r5 = mergeSteps([], [{ id: "e1", label: "Please review and confirm" }], []);
  assert.strictEqual(r5.active[0].type, "hitl", "label containing HITL keyword must derive type hitl when incoming has no type");
}

selfRun(import.meta.url, run);
