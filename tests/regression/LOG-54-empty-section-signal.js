// DeepBench v7.0.246 | tests/regression/LOG-54-empty-section-signal.js | LOG-54
//
// Guards call_facts.empty_sections -- the signal ARCHITECTURE.md §19j's open question 1 was blocked
// on. §19j sequenced a reviewer SECOND, on John's explicit call ("ship the instruction first, then
// decide on a reviewer from real evidence"), and that was unexecutable because nothing anywhere
// recorded that a section came back empty. This file guards the thing that records it.
//
// THE ASSERTION THAT MATTERS MOST IS THE NEGATIVE CONTROL IN allFilledIsAnEmptyArray(): a compliant
// call -- where the specialist DID state "no complicating factors were found" in her own words --
// must come back as `[]`, present and empty. That single case kills two opposite defects at once: a
// detector that flags everything (it would return ['complicates'] because citations are empty), and
// a "tidy" refactor that omits `[]` (it would return undefined and collapse "checked, all filled"
// into "never checked", making a broken derivation read as perfect compliance).
//
// Credential-free by construction: the extractor is pure and imported from the shipped module, and
// the wiring assertions are source scans. Nothing here needs Supabase or a model call.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import {
  isEmptyDeclaredValue,
  extractEmptyDeclaredSections,
  buildCallFacts,
} from "../../api/prompt/request-receivable.js";
import { SIGNATURE_FIELDS, validateCriteria } from "../../lib/pattern-vocabulary.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RECEIVABLE = path.join(HERE, "..", "..", "api", "prompt", "request-receivable.js");

// A FIXTURE shaped like the live contract, never a copy of it -- and deliberately carrying no
// intent slug, so this file cannot become the place a capability name leaks back in.
const SECTION = { type: "object", required: ["text", "citations"], properties: {} };
const SCHEMA = {
  type: "object",
  required: ["supports", "complicates", "consider", "confidence"],
  properties: { supports: SECTION, complicates: SECTION, consider: SECTION, confidence: { type: "string" } },
};
const filled = (t) => ({ text: t, citations: ["c1"] });

// ---------------------------------------------------------------------------
// 1. Detection -- the case the ticket exists for
// ---------------------------------------------------------------------------
function detectsAnEmptySection() {
  const out = {
    supports: filled("revenue is up"),
    complicates: { text: null, citations: [] },
    consider: filled("watch Q4"),
    confidence: "high",
  };
  assert.deepStrictEqual(extractEmptyDeclaredSections(SCHEMA, out), ["complicates"]);
}

// ---------------------------------------------------------------------------
// 2. NEGATIVE CONTROL -- compliance is `[]`, not an omission and not a flag
// ---------------------------------------------------------------------------
function allFilledIsAnEmptyArray() {
  const compliant = {
    // §19j's whole point: she says it in her OWN words, with no citations to give. That is FILLED.
    supports: filled("revenue is up"),
    complicates: { text: "no complicating factors were found", citations: [] },
    consider: filled("watch Q4"),
    confidence: "high",
  };
  const got = extractEmptyDeclaredSections(SCHEMA, compliant);
  assert.deepStrictEqual(got, [], "a compliant call must report [] -- stated-in-own-words is filled");
  assert.ok(Array.isArray(got), "[] must be an array, never undefined -- it is the denominator");
}

// ---------------------------------------------------------------------------
// 3. Canonical order -- the property that keeps §19k signatures from fragmenting
// ---------------------------------------------------------------------------
function resultIsSorted() {
  const out = {
    supports: { text: "", citations: [] },
    complicates: { text: null, citations: [] },
    consider: filled("watch Q4"),
    confidence: "high",
  };
  assert.deepStrictEqual(extractEmptyDeclaredSections(SCHEMA, out), ["complicates", "supports"]);
}

// ---------------------------------------------------------------------------
// 4. Edge semantics -- what counts as empty, each with its opposite
// ---------------------------------------------------------------------------
function emptinessSemantics() {
  assert.strictEqual(isEmptyDeclaredValue(null), true);
  assert.strictEqual(isEmptyDeclaredValue(undefined), true);
  assert.strictEqual(isEmptyDeclaredValue("   "), true, "whitespace is not a statement");
  assert.strictEqual(isEmptyDeclaredValue("x"), false);
  // 0 and false are CONTENT. override_warning:false is a real answer, not a gap.
  assert.strictEqual(isEmptyDeclaredValue(0), false);
  assert.strictEqual(isEmptyDeclaredValue(false), false);
  assert.strictEqual(isEmptyDeclaredValue([]), true);
  assert.strictEqual(isEmptyDeclaredValue([null, ""]), true, "an array of empties is empty");
  assert.strictEqual(isEmptyDeclaredValue(["c1"]), false);
  assert.strictEqual(isEmptyDeclaredValue({}), true);
  assert.strictEqual(isEmptyDeclaredValue({ text: null, citations: [] }), true);
  // Documented under-report, asserted so it stays deliberate: any content anywhere = filled.
  assert.strictEqual(isEmptyDeclaredValue({ text: null, citations: ["c1"] }), false);
}

// ---------------------------------------------------------------------------
// 5. Tri-state -- absent vs [] vs names, including the {} -> NULL contract
// ---------------------------------------------------------------------------
function notApplicableIsNull() {
  const out = { supports: filled("x") };
  assert.strictEqual(extractEmptyDeclaredSections(null, out), null, "no schema");
  assert.strictEqual(extractEmptyDeclaredSections({ type: "object" }, out), null, "no required list");
  assert.strictEqual(extractEmptyDeclaredSections({ type: "object", required: [] }, out), null);
  assert.strictEqual(extractEmptyDeclaredSections({ type: "string" }, out), null, "not an object schema");
  assert.strictEqual(extractEmptyDeclaredSections(SCHEMA, "plain text"), null, "text output");
  assert.strictEqual(extractEmptyDeclaredSections(SCHEMA, ["a"]), null, "array output");
  assert.strictEqual(extractEmptyDeclaredSections(SCHEMA, null), null);
}

function buildCallFactsCarriesTheTriState() {
  // The {} -> NULL contract is untouched: an all-empty call still yields {}.
  assert.deepStrictEqual(buildCallFacts({}), {}, "omitting emptySections must leave call_facts {}");
  assert.strictEqual("empty_sections" in buildCallFacts({}), false);
  assert.strictEqual("empty_sections" in buildCallFacts({ emptySections: null }), false);
  // Array.isArray, never truthiness -- [] must survive.
  assert.deepStrictEqual(buildCallFacts({ emptySections: [] }).empty_sections, []);
  assert.deepStrictEqual(buildCallFacts({ emptySections: ["complicates"] }).empty_sections, ["complicates"]);
}

// ---------------------------------------------------------------------------
// 6. WIRING -- the assertion that makes this QA rather than theatre.
//    A defined-but-never-called extractor fails here.
// ---------------------------------------------------------------------------
function stripWholeLineComments(src) {
  return src.split("\n").filter(l => !/^\s*\/\//.test(l)).join("\n");
}

function derivationIsActuallyWiredIntoTheWritePath() {
  const src = stripWholeLineComments(fs.readFileSync(RECEIVABLE, "utf8"));
  const call = src.match(/mergeCallFacts\(\s*buildCallFacts\(\{[\s\S]*?\}\)/);
  assert.ok(call, "the STEP 4 mergeCallFacts(buildCallFacts({...})) assembly must still exist");
  assert.ok(
    /emptySections:\s*extractEmptyDeclaredSections\(/.test(call[0]),
    "extractEmptyDeclaredSections() must be called INSIDE the buildCallFacts argument block -- " +
    "an extractor that is defined but never wired records nothing, which is the pre-LOG-54 state"
  );
  assert.ok(
    /format_contract\?\.schema/.test(call[0]),
    "the derivation must read the DECLARED schema -- reading the output alone cannot know what was required"
  );
}

// ---------------------------------------------------------------------------
// 7. capabilities-are-data -- generic, never a slug conditional
// ---------------------------------------------------------------------------
function noCapabilityConditionalWasIntroduced() {
  const src = stripWholeLineComments(fs.readFileSync(RECEIVABLE, "utf8"));
  const region = src.slice(
    src.indexOf("export function isEmptyDeclaredValue"),
    src.indexOf("export function extractToolCalls")
  );
  assert.ok(region.length > 0, "the LOG-54 extractor block must exist");
  for (const banned of ["hyp-", "intent_slug", "capability_slug", "agent_id"]) {
    assert.ok(
      !region.includes(banned),
      `the LOG-54 derivation must stay generic -- found "${banned}" in it. ` +
      ".claude/rules/capabilities-are-data.md: the fix for a gap is a generic field read, never a conditional"
    );
  }
}

// ---------------------------------------------------------------------------
// 8. Vocabulary boundary -- a diagnostic fact, not criteria (LOG-109 precedent)
// ---------------------------------------------------------------------------
function staysOffTheSignatureAllowlist() {
  assert.ok(
    !SIGNATURE_FIELDS.includes("empty_sections"),
    "empty_sections is a diagnostic fact. Promoting it to pattern vocabulary is Susan's review " +
    "path plus a §19k amendment -- never a silent allowlist edit"
  );
  assert.throws(() => validateCriteria({ empty_sections: { ">": 0 } }));
}

function run() {
  detectsAnEmptySection();
  allFilledIsAnEmptyArray();
  resultIsSorted();
  emptinessSemantics();
  notApplicableIsNull();
  buildCallFactsCarriesTheTriState();
  derivationIsActuallyWiredIntoTheWritePath();
  noCapabilityConditionalWasIntroduced();
  staysOffTheSignatureAllowlist();
}

selfRun(import.meta.url, run);
export default run;
