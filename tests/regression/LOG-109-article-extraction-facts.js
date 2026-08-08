// DeepBench v6.3.216 | tests/regression/LOG-109-article-extraction-facts.js | LOG-109
// FEATURE: LOG-109/CHI-91 -- Category M (cross-reference consistency), persisted per SES-009a.
//
// The rules this locks in: the primary path's `ai_type` is the generated SERVICE_SLUG catalog
// constant, never a literal and never 'deterministic' (the stale value LOG-109's own backlog row
// proposed -- see kickoff CONTEXT); `call_facts` carries no unbounded per-call value (LOG-91's
// signature blow-up, 720 -> 24,826); and articleFaultText's platform-fault copy is honest about
// retry advice and leaks no internal status code or field name to the user.
//
// DEVIATION (full rationale in src/lib/articleFaultText.js's own header): the kickoff's Task 2a
// specified articleFaultText inline in MarketIntelligenceScreen.jsx, but plain Node cannot import
// a .jsx file at all ("Unknown file extension .jsx", confirmed live this session -- a loader-level
// rejection, not a JSX-syntax parse error). It lives in a JSX-free sibling module instead
// (LOG-83/resolveAgent.js precedent) and this test imports that real implementation -- never a
// copy of the logic. MarketIntelligenceScreen.jsx and useAIActivity.js are both still JSX/React
// files that plain Node cannot import, so assertions 4 and 8 are source scans, per the kickoff's
// own specified methodology for assertion 4.
//
// Asserts:
//   1. classifyExtraction() bands correctly: full_text >500, below_threshold 1-500, empty at 0,
//      not_attempted for any null/non-2xx status regardless of text.
//   2. SERVICE_SLUG.ARTICLE_EXTRACTION === 'article-extraction', and it is a real SERVICE_CATALOG slug.
//   3. api/fetch-article.js (whole-line comments stripped) never contains the literal
//      'deterministic', and never contains a bare 'article-extraction' string literal -- the value
//      must come through SERVICE_SLUG.
//   4. src/hooks/useAIActivity.js's AI_TYPE_TO_SERVICE gained no 'article-extraction' key (source
//      scan -- the file is a React hook module, not importable under plain Node).
//   5. SIGNATURE_FIELDS contains neither http_status nor extraction_outcome, and validateCriteria
//      throws on a criteria object referencing either.
//   6. articleFaultText() returns null for null/undefined, the timeout wording only when
//      http_status is null, the unreadable-page wording for empty/below_threshold at 200, and the
//      blocked wording for 403.
//   7. Every string articleFaultText() can return ends with "Answering from the headline alone."
//      and contains no status code or field name.
//   8. MarketIntelligenceScreen.jsx (source scan) imports articleFaultText from
//      ../lib/articleFaultText.js and defines no function of that name itself -- guards the
//      "never assert against a copy of the logic" rule against a future silent re-divergence.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { classifyExtraction } from "../../api/fetch-article.js";
import { SERVICE_SLUG, SERVICE_CATALOG } from "../../shared/ai-patterns.js";
import { SIGNATURE_FIELDS, validateCriteria } from "../../lib/pattern-vocabulary.js";
import { articleFaultText } from "../../src/lib/articleFaultText.js";
import { selfRun } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Strips only whole-line `//` comments (a line whose only content, after leading whitespace, is a
// `//` comment). Deliberately NOT a strip-from-first-`//`-to-end-of-line approach: fetch-article.js
// contains "https://api.anthropic.com/v1/messages" inline in real code, and stripping from that
// `//` onward would silently truncate the line and corrupt the scan.
function stripWholeLineComments(src) {
  return src.split("\n").filter(line => !/^\s*\/\//.test(line)).join("\n");
}

export default async function run() {
  // ── 1. the band, not the count ──
  const long = "x".repeat(501), short = "x".repeat(500), tiny = "x";
  assert.strictEqual(classifyExtraction(200, long), "full_text", ">500 chars is full_text");
  assert.strictEqual(classifyExtraction(200, short), "below_threshold", "exactly 500 is below_threshold");
  assert.strictEqual(classifyExtraction(200, tiny), "below_threshold", "1 char is below_threshold");
  assert.strictEqual(classifyExtraction(200, ""), "empty", "empty string is empty");
  assert.strictEqual(classifyExtraction(200, null), "empty", "null text is empty");
  assert.strictEqual(classifyExtraction(403, long), "not_attempted", "403 is not_attempted despite text");
  assert.strictEqual(classifyExtraction(500, ""), "not_attempted", "500 is not_attempted");
  assert.strictEqual(classifyExtraction(null, long), "not_attempted", "null status is not_attempted");
  assert.strictEqual(classifyExtraction(204, ""), "empty", "204 is 2xx, so it bands by text");
  assert.strictEqual(classifyExtraction(299, long), "full_text", "299 is still 2xx");
  assert.strictEqual(classifyExtraction(300, long), "not_attempted", "300 is not 2xx");

  // ── 2. the slug comes from the catalog, never a literal ──
  assert.strictEqual(SERVICE_SLUG.ARTICLE_EXTRACTION, "article-extraction", "SERVICE_SLUG resolves the slug");
  assert.ok(SERVICE_CATALOG.some(s => s.slug === "article-extraction"), "and it is a real catalog entry");

  // ── 3. source scan of api/fetch-article.js: no stale 'deterministic'; no NEW bare literal ──
  // Exactly one bare 'article-extraction' string literal may exist: the fallback path's
  // pre-existing feature: "article-extraction" (fetch-article.js:72-79's logActivity call), which
  // Scope Rules require stay byte-for-byte untouched. Zero would over-constrain (it would fail the
  // moment that protected old line is read back); two-or-more would mean the primary path added a
  // second hand-written literal instead of going through SERVICE_SLUG.
  const fetchArticleSrc = stripWholeLineComments(fs.readFileSync(path.join(__dirname, "../../api/fetch-article.js"), "utf8"));
  assert.ok(!fetchArticleSrc.includes("deterministic"), "'deterministic' must never appear in api/fetch-article.js");
  const literalMatches = fetchArticleSrc.match(/['"]article-extraction['"]/g) || [];
  assert.strictEqual(literalMatches.length, 1, "exactly one bare 'article-extraction' literal may survive (the pre-existing, untouched fallback line) -- the primary path must come through SERVICE_SLUG, never a second hand-written literal");

  // ── 4. no redundant AI_TYPE_TO_SERVICE entry (source scan -- React hook file) ──
  const useAIActivitySrc = fs.readFileSync(path.join(__dirname, "../../src/hooks/useAIActivity.js"), "utf8");
  assert.ok(!/['"]article-extraction['"]\s*:/.test(useAIActivitySrc), "AI_TYPE_TO_SERVICE must gain no 'article-extraction' key -- the || rawSlug fallback resolves it");

  // ── 5. the facts are diagnostic, never pattern vocabulary ──
  assert.ok(!SIGNATURE_FIELDS.includes("http_status"), "http_status off the allowlist");
  assert.ok(!SIGNATURE_FIELDS.includes("extraction_outcome"), "extraction_outcome off the allowlist");
  assert.throws(() => validateCriteria({ http_status: 200 }), "criteria may not reference http_status");

  // ── 6/7. the fault copy ──
  assert.strictEqual(articleFaultText(null), null, "no failure -> no bubble (null)");
  assert.strictEqual(articleFaultText(undefined), null, "no failure -> no bubble (undefined)");
  const timeoutText = articleFaultText({ http_status: null, extraction_outcome: "not_attempted" });
  assert.ok(/didn't respond in time/.test(timeoutText), "no response -> retry may work wording");
  assert.ok(/retrying may work/.test(timeoutText), "no response -> says retry may work");
  const emptyText = articleFaultText({ http_status: 200, extraction_outcome: "empty" });
  assert.ok(/no readable article text/.test(emptyText), "200+empty -> unreadable page");
  const belowText = articleFaultText({ http_status: 200, extraction_outcome: "below_threshold" });
  assert.ok(/no readable article text/.test(belowText), "200+below_threshold -> unreadable");
  const blockedText = articleFaultText({ http_status: 403, extraction_outcome: "not_attempted" });
  assert.ok(/blocks automated readers/.test(blockedText), "403 -> blocked, no retry");
  assert.ok(/retrying won't help/.test(blockedText), "403 says retry will not help");

  const all = [timeoutText, emptyText, belowText, blockedText];
  assert.ok(all.every(s => s.endsWith("Answering from the headline alone.")), "every variant ends the same way");
  assert.ok(all.every(s => !/\d{3}/.test(s)), "no variant leaks a status code");
  assert.ok(all.every(s => !/http_status|extraction_outcome/.test(s)), "no variant leaks a field name");

  // ── 8. the screen imports the real implementation, never a copy (source scan -- .jsx file) ──
  const screenSrc = fs.readFileSync(path.join(__dirname, "../../src/screens/MarketIntelligenceScreen.jsx"), "utf8");
  assert.ok(/from\s+["']\.\.\/lib\/articleFaultText\.js["']/.test(screenSrc), "MarketIntelligenceScreen.jsx must import articleFaultText from ../lib/articleFaultText.js");
  assert.ok(!/function\s+articleFaultText/.test(screenSrc), "MarketIntelligenceScreen.jsx must not define its own copy of articleFaultText");
}

selfRun(import.meta.url, run);
