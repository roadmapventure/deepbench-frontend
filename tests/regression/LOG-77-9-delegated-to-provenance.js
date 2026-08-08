// DeepBench v6.3.208 | tests/regression/LOG-77-9-delegated-to-provenance.js | LOG-77-9
// FEATURE: LOG-77-9 — Category M (cross-reference consistency), persisted per SES-009a.
//
// Locks in the §19k `delegated_to_provenance` contract (Susan Smith — Trainer's
// Evaluator-Optimizer MISSING SIGNAL resolution, design-log-72b-0728 / log77-9-design):
//   - `delegated_to_provenance` is the 17th SIGNATURE_FIELDS entry, at position 7,
//     directly after `integration_followed` (John's placement call, 2026-07-28).
//   - Its two backing facts, `delegation_target` and `task_provenance`, are plumbing
//     with literal agent ids in them — like `trace_id`/`span_id`, they must NEVER
//     become legal criteria keys (the signature is agent-agnostic, §19k locked
//     constraint 2). validateCriteria() must reject them.
//   - The write-path extractor captures verbatim facts only — no comparison, no
//     conclusion; the derived boolean lives in the Displayer view (ai_call_patterns)
//     alone, never in call_facts. Asserted here via the extractor's output shape.
//   - PROVENANCE_KEYS is the platform's own delegation vocabulary, exactly
//     ['agent_id', 'capability_slug', 'intent_slug'], defined once in
//     api/prompt/request-receivable.js.

import assert from "assert";
import { SIGNATURE_FIELDS, validateCriteria } from "../../lib/pattern-vocabulary.js";
import { extractDelegationProvenanceFacts, PROVENANCE_KEYS } from "../../api/prompt/request-receivable.js";
import { selfRun } from "./_lib/self-run.js";

export default async function run() {
  // Allowlist shape: 17 entries, delegated_to_provenance at position 7 (index 6),
  // directly after integration_followed.
  assert.strictEqual(SIGNATURE_FIELDS.length, 17, `SIGNATURE_FIELDS must have 17 entries, got ${SIGNATURE_FIELDS.length}`);
  assert.strictEqual(SIGNATURE_FIELDS[6], "delegated_to_provenance", `SIGNATURE_FIELDS[6] must be delegated_to_provenance, got "${SIGNATURE_FIELDS[6]}"`);
  assert.strictEqual(SIGNATURE_FIELDS[5], "integration_followed", `SIGNATURE_FIELDS[5] must be integration_followed, got "${SIGNATURE_FIELDS[5]}"`);

  // Plumbing facts must never be criteria-legal (agent-agnosticism), same exclusion
  // class as trace_id.
  for (const plumbing of ["delegation_target", "task_provenance", "trace_id", "span_id", "parent_span_id"]) {
    assert.ok(!SIGNATURE_FIELDS.includes(plumbing), `plumbing key "${plumbing}" must not be in SIGNATURE_FIELDS`);
    assert.throws(() => validateCriteria({ [plumbing]: "x" }), /not in the signature-field allowlist/, `validateCriteria must reject criteria key "${plumbing}"`);
  }

  // The new field is authorable as a bare boolean (closed set true|false, §19k).
  validateCriteria({ delegated_to_provenance: true });
  validateCriteria({ delegated_to_provenance: false });

  // Extractor contract: exactly PROVENANCE_KEYS, verbatim, no derived conclusion key.
  assert.deepStrictEqual(PROVENANCE_KEYS, ["agent_id", "capability_slug", "intent_slug"], "PROVENANCE_KEYS must be exactly the 3 delegation-vocabulary keys");
  const facts = extractDelegationProvenanceFacts(
    { agent_id: "a1", capability_slug: "c1", intent_slug: "i1", task: "t", reasoning: "r" },
    { agent_id: "a1", capability_slug: "c1", question: "q" }
  );
  assert.deepStrictEqual(Object.keys(facts).sort(), ["delegationTarget", "taskProvenance"], "extractor must emit exactly the two backing-fact keys, never a conclusion");
  assert.deepStrictEqual(facts.delegationTarget, { agent_id: "a1", capability_slug: "c1", intent_slug: "i1" });
  assert.deepStrictEqual(facts.taskProvenance, { agent_id: "a1", capability_slug: "c1" });
  assert.ok(!("delegated_to_provenance" in facts) && !("match" in facts), "extractor output must carry no comparison/conclusion");

  // Omission contract: null (never {}) when a side has no string-valued provenance keys.
  assert.strictEqual(extractDelegationProvenanceFacts({ question: "q" }, null).delegationTarget, null);
  assert.strictEqual(extractDelegationProvenanceFacts(null, { question: "q" }).taskProvenance, null);
  assert.strictEqual(extractDelegationProvenanceFacts(["agent_id"], { agent_id: 7 }).delegationTarget, null);
  assert.strictEqual(extractDelegationProvenanceFacts(["agent_id"], { agent_id: 7 }).taskProvenance, null);
}

selfRun(import.meta.url, run);
