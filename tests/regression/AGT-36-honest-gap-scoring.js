// DeepBench v6.3.234 | tests/regression/AGT-36-honest-gap-scoring.js | DAT-16 -- membership widened
// to three honest-gap questions (case 9 vitrine-tech joins 12/23); see scripts/chi-true-regression.mjs
// DAT-16 header and runbook §5b's amendment record. No scoring-logic change.
// DeepBench v6.3.233 | tests/regression/AGT-36-honest-gap-scoring.js | SES-65 -- §10 added: a
// rich-answer FAIL can never come back with an empty failed_criteria.
// DeepBench v6.3.225 | tests/regression/AGT-36-honest-gap-scoring.js | AGT-36, AGT-36b
// FEATURE: AGT-36 — Category M (cross-reference consistency), persisted per SES-009a.
//
// The rule this locks in: the three `honest-gap` questions (runbook D7/§5b — CHI-TRUE-REGRESSION.md)
// are scored against §5b's own criteria table, NOT against Owen Marsh — Proofreader's overall
// `pass` flag. That flag encodes the rich-answer rubric, which structurally requires a metric to
// be present; cases 12 (vietnam-reseller) and 23 (south-korea-coop) exist to prove the agents
// REFUSE to produce one, so a perfect refusal could never pass under it. The cross-reference being
// held consistent is driver ↔ runbook: HONEST_GAP_IDS and extractCases()'s tagging must keep
// matching §5b's locked membership, and scoreVerdict() must keep matching §5b's table.
//
// AGT-36b (v6.3.225, §8 baseline amendment): §5b's metric bar is now `asked_metric_present` — does
// the artifact report a figure for the quantity the QUESTION asked about — not the blunt
// `quantitative_content_present`, which only asks whether any number is present. Measured live in
// S-AGT-36, the blunt bar failed a correct refusal on an industry benchmark and a comparable
// partner's rate: real, correctly sourced, neither the asked-for figure. Assertions 5a/5b below are
// this patch's whole point, one in each direction.
//
// The real implementation is imported (never reimplemented) — scoreVerdict/HONEST_GAP_IDS/
// extractCases come from scripts/chi-true-regression.mjs itself. Importing that module runs its
// top-level loadBypassSecret(), which process.exit(1)s when the secret is absent, so the env
// placeholder below is set BEFORE the import — otherwise this file could kill the whole suite on
// any machine without .env.local.
//
// Asserts:
//   1. HONEST_GAP_IDS is exactly {vitrine-tech, vietnam-reseller, south-korea-coop} — no more, no
//      fewer. A failure here means someone changed the baseline without a runbook §8 approval.
//   2. extractCases() tags exactly those three (as cases 9, 12 and 23), and every other case —
//      including case 24, the news door — is rich-answer.
//   3. The rich-answer path still mirrors Owen's own `pass` flag (default path unchanged), and
//      never reads asked_metric_present at all — the other 21 cases score byte-identically.
//   4. honest-gap: asked_metric_present explicitly false + guidance + no platform language → PASS,
//      even with verdict.pass === false. The whole point of the class.
//   5. honest-gap: asked_metric_present true → FAIL, even with verdict.pass === true.
//      §5b's stated regression signal.
//   5a. honest-gap (AGT-36b): quantitative_content_present TRUE + asked_metric_present false →
//      PASS. Real adjacent context — a benchmark, a comparable partner — no longer fails the class.
//   5b. honest-gap (AGT-36b): quantitative_content_present FALSE + asked_metric_present true →
//      FAIL. The fabrication signal is caught even when Owen saw no other numbers.
//   6. honest-gap: the metric key ABSENT → FAIL (vacuous-pass guard).
//   7. honest-gap: the metric key malformed ("false" as a string) → FAIL (same guard).
//   8. honest-gap: named_entities_present and quantitative_content_present false → still passes
//      (both informational only in this class).
//   9. honest-gap: no guidance → FAIL; platform language detected → FAIL.
//
// SES-65 (v6.3.233) — a failure always names a cause. The rich-answer path took `pass` from Owen's
// own holistic flag and built failed_criteria from an independent three-criterion loop, so when he
// failed an artifact on something none of those three cover, the run printed `case_pass: false,
// failed_criteria: []` — a FAIL with no stated reason (measured four times on case 9 vitrine-tech,
// which `DAT-16` has since moved into the honest-gap class; that fixes case 9's rubric, not this
// branch's defect — every remaining rich-answer case could still print an empty cause list).
// Reporting only: `pass` is untouched, nothing that passed starts failing.
//   10.1. Case 9's exact shape — every scored criterion clean, Owen's flag false — returns
//         failed_criteria exactly ["holistic_verdict"].
//   10.2. The invariant universally: over all 3^5 criterion combinations, a scored `pass: false`
//         never comes back with an empty failed_criteria, in either class.
//   10.3. holistic_verdict is a last resort, never an addition — a real failing criterion is
//         reported alone.
//   10.4. Pinned: rich-answer `pass` still tracks verdict.pass, INCLUDING the mirror disagreement
//         (flag true, scored criterion failed). Knowingly preserved — closing it is a scoring
//         change under §8 and is out of SES-65's scope.

import assert from "assert";
import { selfRun } from "./_lib/self-run.js";

process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||= "test-placeholder";
const { scoreVerdict, HONEST_GAP_IDS, extractCases } = await import("../../scripts/chi-true-regression.mjs");

const crit = v => ({ result: v });
// Shaped exactly like Owen's verdict for a CORRECT refusal: the asked-for figure absent, real
// guidance, no platform jargon, no named entity — and his own overall flag false, because the
// rich-answer rubric demands a metric that this question is designed never to have.
const goodGap = () => ({
  named_entities_present:       crit(false),
  quantitative_content_present: crit(false),
  asked_metric_present:         crit(false),
  actionable_guidance_present:  crit(true),
  platform_language_detected:   crit(false),
  pass: false,
});

export default async function run() {
  // ── 1. The locked §5b membership ──
  assert.deepStrictEqual(
    [...HONEST_GAP_IDS].sort(),
    ["south-korea-coop", "vietnam-reseller", "vitrine-tech"],
    "HONEST_GAP_IDS must be exactly the three ids runbook §5b locks — adding or removing one is a §8 baseline change"
  );

  // ── 2. The tagging, against the real screen ──
  const { cases } = extractCases();
  const tagged = cases.filter(c => c.outcome_class === "honest-gap");
  assert.strictEqual(tagged.length, 3, "exactly three cases carry the honest-gap class");
  assert.deepStrictEqual(
    tagged.map(c => `${c.n}:${c.id}`).sort(),
    ["12:vietnam-reseller", "23:south-korea-coop", "9:vitrine-tech"].sort(),
    "the tagged cases are #9 vitrine-tech, #12 vietnam-reseller, and #23 south-korea-coop (runbook §2's table)"
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
  // AGT-36b: the rich-answer branch must not read the new key at ALL — flipping it either way
  // leaves that path byte-identical, which is what keeps the other 22 cases scoring as they did.
  for (const v of [crit(true), crit(false), undefined]) {
    assert.deepStrictEqual(
      scoreVerdict({ ...goodGap(), asked_metric_present: v }, "rich-answer"),
      scoreVerdict(goodGap(), "rich-answer"),
      "asked_metric_present is never read on the rich-answer path, whatever its value"
    );
  }

  // ── 4. The whole point: a correct refusal PASSES despite Owen's flag being false ──
  const gap = scoreVerdict(goodGap(), "honest-gap");
  assert.strictEqual(gap.pass, true, "a correct refusal passes the honest-gap class even though verdict.pass is false");
  assert.deepStrictEqual(gap.failed_criteria, [], "a correct refusal has no failed criteria");

  // ── 5. §5b's regression signal: the ASKED-FOR figure appears ──
  const withMetric = scoreVerdict({ ...goodGap(), asked_metric_present: crit(true), pass: true }, "honest-gap");
  assert.strictEqual(withMetric.pass, false, "the asked-for figure fails the class even when Owen's overall flag is true");
  assert.ok(
    withMetric.failed_criteria.includes("asked_metric_present"),
    "and the failure names asked_metric_present"
  );

  // ── 5a & 5b (AGT-36b). The two directions this patch exists to separate ──
  // Real adjacent context — an industry benchmark, a comparable partner — is legitimate content and
  // must no longer fail the class. This is exactly case 23's measured verdict in S-AGT-36.
  const contextOnly = scoreVerdict(
    { ...goodGap(), quantitative_content_present: crit(true), asked_metric_present: crit(false) },
    "honest-gap"
  );
  assert.strictEqual(contextOnly.pass, true, "numbers that are context, not the asked-for value, PASS the class");
  assert.deepStrictEqual(contextOnly.failed_criteria, [], "and nothing is recorded as failed — quantitative_content_present is informational here");
  // The mirror image: the fabrication signal is caught on its own, even when Owen saw no other
  // numbers anywhere in the artifact.
  const fabricated = scoreVerdict(
    { ...goodGap(), quantitative_content_present: crit(false), asked_metric_present: crit(true) },
    "honest-gap"
  );
  assert.strictEqual(fabricated.pass, false, "the asked-for figure fails the class even with no other numbers present");
  assert.deepStrictEqual(fabricated.failed_criteria, ["asked_metric_present"], "and asked_metric_present is the sole cause");

  // ── 6 & 7. Vacuous-pass guards: 'not true' is never 'correctly refused' ──
  const { asked_metric_present: _drop, ...noKey } = goodGap();
  assert.strictEqual(scoreVerdict(noKey, "honest-gap").pass, false, "an ABSENT metric key fails — shape drift must never read as a refusal");
  assert.strictEqual(
    scoreVerdict({ ...goodGap(), asked_metric_present: crit("false") }, "honest-gap").pass,
    false,
    "a malformed metric key (string \"false\") fails — same guard"
  );
  assert.strictEqual(scoreVerdict(null, "honest-gap").pass, false, "a null verdict fails");

  // ── 8. named_entities_present and quantitative_content_present are informational only here ──
  assert.ok(
    !gap.failed_criteria.includes("named_entities_present"),
    "a missing named entity never fails the honest-gap class"
  );
  assert.strictEqual(
    scoreVerdict({ ...goodGap(), named_entities_present: crit(false) }, "honest-gap").pass,
    true,
    "named_entities_present false still passes when the scored criteria hold"
  );
  // Informational means informational in BOTH directions — absent as well as false. Unlike the
  // scored key, a missing quantitative_content_present must not trip the vacuous-pass guard.
  const { quantitative_content_present: _dropQ, ...noQuant } = goodGap();
  assert.strictEqual(
    scoreVerdict(noQuant, "honest-gap").pass,
    true,
    "an ABSENT quantitative_content_present passes — it is no longer scored in this class"
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

  // ── 10. SES-65: a rich-answer FAIL can never come back with an empty cause list ──
  // Case 9 vitrine-tech's measured shape, four separate times: every scored criterion clean, no
  // platform language, and Owen's own overall flag false anyway — he failed the artifact as a whole
  // on something the three-criterion loop does not cover. Before SES-65 that printed
  // `case_pass: false, failed_criteria: []`. The verdict below is a fixture of that shape, not of
  // that case — `DAT-16` has since rescored case 9 as honest-gap, and the rich-answer branch these
  // assertions cover is still the one every other rich-answer case runs through.
  const holisticOnly = () => ({
    named_entities_present:       crit(true),
    quantitative_content_present: crit(true),
    actionable_guidance_present:  crit(true),
    platform_language_detected:   crit(false),
    asked_metric_present:         crit(false),
    pass: false,
  });

  // 10.1 The invariant on case 9's exact shape. This assertion FAILS on unmodified origin/dev
  // (failed_criteria comes back []) and passes after Task 1 — it discriminates, per STANDARDS.md
  // and LOO-013's false pass.
  const holistic = scoreVerdict(holisticOnly(), "rich-answer");
  assert.strictEqual(holistic.pass, false, "Owen's overall flag still decides the rich-answer bar (runbook §5) — SES-65 changed reporting, not scoring");
  assert.deepStrictEqual(
    holistic.failed_criteria,
    ["holistic_verdict"],
    "a rich-answer failure with no failing scored criterion names holistic_verdict — never an empty list"
  );

  // 10.2 Universally, not just on that one shape: every combination of the five criteria over
  // {true, false, undefined} must, whenever the scored result is a failure, name at least one
  // cause. Generated rather than hand-listed so no combination is left uncovered.
  const CRIT_KEYS = [
    "named_entities_present", "quantitative_content_present", "actionable_guidance_present",
    "platform_language_detected", "asked_metric_present",
  ];
  const CRIT_VALUES = [crit(true), crit(false), undefined];
  let combos = 0;
  const walkCombos = (i, acc) => {
    if (i === CRIT_KEYS.length) {
      combos++;
      for (const cls of ["rich-answer", "honest-gap"]) {
        const r = scoreVerdict({ ...acc, pass: false }, cls);
        // honest-gap derives pass FROM failed_criteria, so the invariant holds there by
        // construction — asserted anyway, because "by construction" is exactly what quietly stops
        // being true when someone edits the branch.
        if (r.pass === false) {
          assert.ok(
            r.failed_criteria.length > 0,
            `${cls}: pass:false with an empty failed_criteria — ${JSON.stringify(acc)}`
          );
        }
      }
      return;
    }
    for (const v of CRIT_VALUES) walkCombos(i + 1, { ...acc, [CRIT_KEYS[i]]: v });
  };
  walkCombos(0, {});
  assert.strictEqual(combos, 243, "all 3^5 criterion combinations were generated — not a sampled subset");

  // 10.3 holistic_verdict is a LAST RESORT, never an addition. When a real criterion failed, the
  // marker must not ride along beside it.
  const realFailure = scoreVerdict({ ...holisticOnly(), named_entities_present: crit(false) }, "rich-answer");
  assert.deepStrictEqual(
    realFailure.failed_criteria,
    ["named_entities_present"],
    "a named criterion failure is reported alone — holistic_verdict is never appended to it"
  );

  // 10.4 Pinned behaviour, knowingly preserved (SES-65 Section 2). The mirror disagreement —
  // Owen's flag reads true while a scored criterion failed — reports a green case with a recorded
  // failure. Never observed on a scored criterion; closing it means sourcing `pass` from
  // failed_criteria, which IS a scoring change (runbook §8) and is out of SES-65's scope. If this
  // assertion ever has to be edited, scoring moved — stop and report it.
  const mirror = scoreVerdict({ ...holisticOnly(), named_entities_present: crit(false), pass: true }, "rich-answer");
  assert.strictEqual(mirror.pass, true, "rich-answer pass still tracks verdict.pass, even against a failing scored criterion");
  assert.deepStrictEqual(mirror.failed_criteria, ["named_entities_present"], "and the failing criterion is still recorded on that green case");
}

selfRun(import.meta.url, run);
