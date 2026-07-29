// DeepBench v6.3.220 | tests/regression/AGT-36-honest-gap-scoring.js | AGT-36
// FEATURE: AGT-36 — Category M (cross-reference consistency), persisted per SES-009a.
//
// The rule this locks in: the two `honest-gap` questions (runbook D7/§5b — CHI-TRUE-REGRESSION.md)
// are scored against §5b's own criteria table, NOT against Owen Marsh — Proofreader's overall
// `pass` flag. That flag encodes the rich-answer rubric, which structurally requires a metric to
// be present; cases 12 (vietnam-reseller) and 23 (south-korea-coop) exist to prove the agents
// REFUSE to produce one, so a perfect refusal could never pass under it. The cross-reference being
// held consistent is driver ↔ runbook: HONEST_GAP_IDS and extractCases()'s tagging must keep
// matching §5b's locked membership, and scoreVerdict() must keep matching §5b's table.
//
// The real implementation is imported (never reimplemented) — scoreVerdict/HONEST_GAP_IDS/
// extractCases come from scripts/chi-true-regression.mjs itself. Importing that module runs its
// top-level loadBypassSecret(), which process.exit(1)s when the secret is absent, so the env
// placeholder below is set BEFORE the import — otherwise this file could kill the whole suite on
// any machine without .env.local.
//
// Asserts:
//   1. HONEST_GAP_IDS is exactly {vietnam-reseller, south-korea-coop} — no more, no fewer.
//      A failure here means someone changed the baseline without a runbook §8 approval.
//   2. extractCases() tags exactly those two (as cases 12 and 23), and every other case —
//      including case 24, the news door — is rich-answer.
//   3. The rich-answer path still mirrors Owen's own `pass` flag (default path unchanged).
//   4. honest-gap: metric explicitly false + guidance + no platform language → PASS, even with
//      verdict.pass === false. The whole point of the class.
//   5. honest-gap: quantitative_content_present true → FAIL, even with verdict.pass === true.
//      §5b's stated regression signal.
//   6. honest-gap: the metric key ABSENT → FAIL (vacuous-pass guard).
//   7. honest-gap: the metric key malformed ("false" as a string) → FAIL (same guard).
//   8. honest-gap: named_entities_present false → still passes (informational only in this class).
//   9. honest-gap: no guidance → FAIL; platform language detected → FAIL.

import assert from "assert";
import { selfRun } from "./_lib/self-run.js";

process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||= "test-placeholder";
const { scoreVerdict, HONEST_GAP_IDS, extractCases } = await import("../../scripts/chi-true-regression.mjs");

const crit = v => ({ result: v });
// Shaped exactly like Owen's verdict for a CORRECT refusal: no metric, real guidance, no platform
// jargon, no named entity — and his own overall flag false, because the rich-answer rubric demands
// a metric that this question is designed never to have.
const goodGap = () => ({
  named_entities_present:       crit(false),
  quantitative_content_present: crit(false),
  actionable_guidance_present:  crit(true),
  platform_language_detected:   crit(false),
  pass: false,
});

export default async function run() {
  // ── 1. The locked §5b membership ──
  assert.deepStrictEqual(
    [...HONEST_GAP_IDS].sort(),
    ["south-korea-coop", "vietnam-reseller"],
    "HONEST_GAP_IDS must be exactly the two ids runbook §5b locks — adding or removing one is a §8 baseline change"
  );

  // ── 2. The tagging, against the real screen ──
  const { cases } = extractCases();
  const tagged = cases.filter(c => c.outcome_class === "honest-gap");
  assert.strictEqual(tagged.length, 2, "exactly two cases carry the honest-gap class");
  assert.deepStrictEqual(
    tagged.map(c => `${c.n}:${c.id}`).sort(),
    ["12:vietnam-reseller", "23:south-korea-coop"],
    "the tagged cases are #12 vietnam-reseller and #23 south-korea-coop (runbook §2's table)"
  );
  const others = cases.filter(c => c.outcome_class !== "honest-gap");
  assert.ok(
    others.every(c => c.outcome_class === "rich-answer"),
    "every other case is rich-answer — no case may be left untagged"
  );
  assert.strictEqual(
    cases.find(c => c.n === 24)?.outcome_class,
    "rich-answer",
    "case 24 (the news door) is rich-answer"
  );

  // ── 3. The rich-answer path is unchanged: pass still comes from Owen's own flag ──
  assert.strictEqual(scoreVerdict({ ...goodGap(), pass: true }, "rich-answer").pass, true, "rich-answer honours pass:true");
  assert.strictEqual(scoreVerdict(goodGap(), "rich-answer").pass, false, "rich-answer honours pass:false");
  assert.strictEqual(scoreVerdict({ ...goodGap(), pass: true }, undefined).pass, true, "an untagged verdict defaults to rich-answer");
  assert.deepStrictEqual(
    scoreVerdict(goodGap(), "rich-answer").failed_criteria,
    ["named_entities_present", "quantitative_content_present"],
    "rich-answer still builds failed_criteria the same way"
  );

  // ── 4. The whole point: a correct refusal PASSES despite Owen's flag being false ──
  const gap = scoreVerdict(goodGap(), "honest-gap");
  assert.strictEqual(gap.pass, true, "a correct refusal passes the honest-gap class even though verdict.pass is false");
  assert.deepStrictEqual(gap.failed_criteria, [], "a correct refusal has no failed criteria");

  // ── 5. §5b's regression signal: a metric appears ──
  const withMetric = scoreVerdict({ ...goodGap(), quantitative_content_present: crit(true), pass: true }, "honest-gap");
  assert.strictEqual(withMetric.pass, false, "a real metric fails the class even when Owen's overall flag is true");
  assert.ok(
    withMetric.failed_criteria.includes("quantitative_content_present"),
    "and the failure names quantitative_content_present"
  );

  // ── 6 & 7. Vacuous-pass guards: 'not true' is never 'correctly refused' ──
  const { quantitative_content_present: _drop, ...noKey } = goodGap();
  assert.strictEqual(scoreVerdict(noKey, "honest-gap").pass, false, "an ABSENT metric key fails — shape drift must never read as a refusal");
  assert.strictEqual(
    scoreVerdict({ ...goodGap(), quantitative_content_present: crit("false") }, "honest-gap").pass,
    false,
    "a malformed metric key (string \"false\") fails — same guard"
  );
  assert.strictEqual(scoreVerdict(null, "honest-gap").pass, false, "a null verdict fails");

  // ── 8. named_entities_present is informational only in this class ──
  assert.ok(
    !gap.failed_criteria.includes("named_entities_present"),
    "a missing named entity never fails the honest-gap class"
  );
  assert.strictEqual(
    scoreVerdict({ ...goodGap(), named_entities_present: crit(false) }, "honest-gap").pass,
    true,
    "named_entities_present false still passes when the other three hold"
  );

  // ── 9. The two bars §5b deliberately kept ──
  assert.strictEqual(
    scoreVerdict({ ...goodGap(), actionable_guidance_present: crit(false) }, "honest-gap").pass,
    false,
    "no actionable guidance fails the class — §5b keeps this bar"
  );
  const jargon = scoreVerdict({ ...goodGap(), platform_language_detected: crit(true) }, "honest-gap");
  assert.strictEqual(jargon.pass, false, "platform language fails the class — §5b keeps this bar too");
  assert.ok(jargon.failed_criteria.includes("platform_language_detected"), "and the failure names platform_language_detected");
}

selfRun(import.meta.url, run);
