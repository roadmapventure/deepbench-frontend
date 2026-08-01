// DeepBench v7.0.23 | tests/regression/SES-64-news-door-honest-gap-scoring.js | SES-64
// FEATURE: SES-64 -- Category B (pure logic), persisted matching the sibling AGT-36 test's
// convention for this same class of defect (case 24 has flipped green/red on an identical
// degraded condition four separate measured times per the SES-64 FEATURES.md row -- this guards
// the fix, not just documents it).
//
// The rule this locks in: case 24 (the news door) scores against runbook §5b's honest-gap table
// when that run's article could not be read, and the rich-answer rubric when it could -- a
// RUN-CONDITIONAL class, never a HONEST_GAP_IDS membership change (§5b amendment, 2026-08-01).
//
// The real implementation is imported (never reimplemented) -- resolveNewsDoorOutcomeClass,
// HONEST_GAP_IDS, and extractCases come from scripts/chi-true-regression.mjs itself. Importing
// that module runs its top-level loadBypassSecret(), which process.exit(1)s when the secret is
// absent, so the env placeholder below is set BEFORE the import -- same guard
// AGT-36-honest-gap-scoring.js uses, for the same reason.
//
// Asserts:
//   1. resolveNewsDoorOutcomeClass(true) === "honest-gap" -- a degraded article scores the
//      honest-gap bar.
//   2. resolveNewsDoorOutcomeClass(false) === "rich-answer" -- a readable article scores the
//      normal bar, unchanged from before this session.
//   3. resolveNewsDoorOutcomeClass(undefined) === "rich-answer" -- fails safe (an unexpected
//      falsy-but-not-boolean input never accidentally grants the easier bar).
//   4. HONEST_GAP_IDS is UNCHANGED by this session -- still exactly the three fixed-membership
//      questions, "news-first-card" is not among them. A failure here means a future edit tried
//      to "fix" case 24 by adding it to the wrong mechanism.
//   5. extractCases()'s STATIC tag for case 24 is still "rich-answer" -- this session's fix is a
//      runtime mutation inside runNewsDoorCaseJourney(), never a change to the static baseline
//      extractCases() produces. (Mirrors AGT-36-honest-gap-scoring.js assertion 2's case-24 check;
//      re-asserted here because THIS file is the one whose scope is specifically case 24.)
//   6. Source-text wiring proof (no live network call needed, same technique
//      SES-62-news-door-call-parity.js uses): runNewsDoorCaseJourney()'s body calls
//      resolveNewsDoorOutcomeClass( and assigns it to ctx.outcome_class, and that assignment
//      appears BEFORE the runDirectCaseJourney( call in the same function -- proves the mutation
//      actually happens before the judge call can read it, not just that the function exists.
//   7. Source-text proof the console marker reads the dynamic value: runOneCase()'s classMarker
//      line reads record.outcome_class, never caseObj.outcome_class.

import assert from "assert";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||= "test-placeholder";
const { resolveNewsDoorOutcomeClass, HONEST_GAP_IDS, extractCases } =
  await import("../../scripts/chi-true-regression.mjs");

export default async function run() {
  // ── 1-3. The pure function ──
  assert.strictEqual(resolveNewsDoorOutcomeClass(true), "honest-gap", "a degraded article scores honest-gap");
  assert.strictEqual(resolveNewsDoorOutcomeClass(false), "rich-answer", "a readable article scores rich-answer");
  assert.strictEqual(resolveNewsDoorOutcomeClass(undefined), "rich-answer", "fails safe on a non-boolean input");

  // ── 4. HONEST_GAP_IDS membership untouched by this session ──
  assert.deepStrictEqual(
    [...HONEST_GAP_IDS].sort(),
    ["south-korea-coop", "vietnam-reseller", "vitrine-tech"],
    "HONEST_GAP_IDS is unchanged -- case 24 must never be added here, its class is run-conditional"
  );
  assert.ok(!HONEST_GAP_IDS.has("news-first-card"), "case 24's id is never in the fixed-membership set");

  // ── 5. extractCases()'s static tag for case 24 is unchanged ──
  const { cases } = extractCases();
  assert.strictEqual(
    cases.find(c => c.n === 24)?.outcome_class,
    "rich-answer",
    "case 24's STATIC tag stays rich-answer -- the fix is a runtime ctx mutation, not a baseline change here"
  );

  // ── 6 & 7. Source-text wiring proof ──
  const ENGINE_PATH = path.join(REPO_ROOT, "scripts/chi-true-regression.mjs");
  const source = readFileSync(ENGINE_PATH, "utf8");

  const fnMatch = source.match(/async function runNewsDoorCaseJourney\([^)]*\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(fnMatch, "runNewsDoorCaseJourney() found in scripts/chi-true-regression.mjs");
  const fnBody = fnMatch[1];

  const assignIdx = fnBody.indexOf("ctx.outcome_class = resolveNewsDoorOutcomeClass(");
  assert.ok(assignIdx !== -1, "runNewsDoorCaseJourney() assigns ctx.outcome_class from resolveNewsDoorOutcomeClass(...)");
  const callIdx = fnBody.indexOf("runDirectCaseJourney(");
  assert.ok(callIdx !== -1, "runNewsDoorCaseJourney() calls runDirectCaseJourney(...)");
  assert.ok(
    assignIdx < callIdx,
    "ctx.outcome_class is set BEFORE runDirectCaseJourney() is called -- proves the judge call can see the run-conditional class, not just that both lines exist somewhere in the function"
  );

  const markerMatch = source.match(/const classMarker = ([^;]+);/);
  assert.ok(markerMatch, "classMarker assignment found in runOneCase()");
  assert.ok(
    markerMatch[1].includes("record.outcome_class"),
    "the console [honest-gap] marker reads record.outcome_class (dynamic), not caseObj.outcome_class (static)"
  );
  assert.ok(
    !markerMatch[1].includes("caseObj.outcome_class"),
    "the console marker no longer reads the static per-case tag"
  );
}

selfRun(import.meta.url, run);
