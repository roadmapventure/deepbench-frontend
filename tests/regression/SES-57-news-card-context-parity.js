// DeepBench v6.3.230 | tests/regression/SES-57-news-card-context-parity.js | SES-57 -- the Article
// Context Resolver's contract, and the parity it exists to guarantee. Test 5 is the one that would
// have caught SES-57: it asserts both callers import the resolver rather than building a payload.
//
// Follows the SES-28 self-run guard pattern (default export + selfRun) copied from
// LOG-109-article-extraction-facts.js -- run-all.js calls each module's DEFAULT export, so a named-
// only `export function run()` would fail the suite with "does not export a default async function".

import assert from "node:assert";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveNewsCardContext } from "../../src/lib/newsCardContext.js";
import { selfRun } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SCREEN = readFileSync(path.join(REPO_ROOT, "src/screens/MarketIntelligenceScreen.jsx"), "utf8");
const ENGINE = readFileSync(path.join(REPO_ROOT, "scripts/chi-true-regression.mjs"), "utf8");

const KEYS = ["article_content", "article_source", "article_url", "article_unavailable_reason"];

export default async function run() {
  // 1. Success: article read, no reason, not degraded.
  {
    const fake = async () => ({ ok: true, json: async () => ({ text: "Full article body.", source: "full_text" }) });
    const r = await resolveNewsCardContext("https://example.com/a", "/api/fetch-article", fake);
    assert.deepStrictEqual(Object.keys(r.payload).sort(), [...KEYS].sort(), "payload must carry all four keys");
    assert.strictEqual(r.payload.article_content, "Full article body.");
    assert.strictEqual(r.payload.article_source, "full_text");
    assert.strictEqual(r.payload.article_url, "https://example.com/a");
    assert.strictEqual(r.payload.article_unavailable_reason, null, "a read article carries no reason");
    assert.strictEqual(r.failure, null);
    assert.strictEqual(r.degraded, false);
  }

  // 2. Non-OK WITH primary_failure: the route's classification is passed through verbatim.
  //    This is the case SES-57 broke -- the old test engine never read this body.
  {
    const pf = { http_status: 403, extraction_outcome: "below_threshold" };
    const fake = async () => ({ ok: false, status: 502, json: async () => ({ error: "x", primary_failure: pf }) });
    const r = await resolveNewsCardContext("https://example.com/b", "/api/fetch-article", fake);
    assert.deepStrictEqual(r.payload.article_unavailable_reason, pf, "primary_failure passed through unchanged");
    assert.deepStrictEqual(Object.keys(r.payload).sort(), [...KEYS].sort(), "payload must carry all four keys");
    assert.strictEqual(r.payload.article_content, null);
    assert.strictEqual(r.degraded, true);
  }

  // 3. Non-OK WITHOUT primary_failure (e.g. the 400 on a missing url): fallback shape, never a bare bool.
  {
    const fake = async () => ({ ok: false, status: 400, json: async () => ({ error: "url is required" }) });
    const r = await resolveNewsCardContext("https://example.com/c", "/api/fetch-article", fake);
    assert.deepStrictEqual(r.payload.article_unavailable_reason, { http_status: 400, extraction_outcome: "not_attempted" });
    assert.deepStrictEqual(Object.keys(r.payload).sort(), [...KEYS].sort(), "payload must carry all four keys");
    assert.strictEqual(r.degraded, true);
  }

  // 4. Throw: fails open with http_status null, does NOT propagate. This is the second divergence --
  //    the screen answered, the old test engine died as an infra death.
  {
    const fake = async () => { throw new Error("ECONNRESET"); };
    const r = await resolveNewsCardContext("https://example.com/d", "/api/fetch-article", fake);
    assert.deepStrictEqual(r.payload.article_unavailable_reason, { http_status: null, extraction_outcome: "not_attempted" });
    assert.deepStrictEqual(Object.keys(r.payload).sort(), [...KEYS].sort(), "payload must carry all four keys");
    assert.strictEqual(r.payload.article_url, "https://example.com/d", "url survives a failed fetch");
    assert.strictEqual(r.degraded, true);
  }

  // 4b. A non-OK response whose BODY is unreadable (html error page): res.json() rejects, the
  //     .catch(() => null) swallows it, and the status-derived fallback still produces a real
  //     object. A resolver that let this throw would resurrect the infra-death divergence.
  {
    const fake = async () => ({ ok: false, status: 504, json: async () => { throw new SyntaxError("Unexpected token <"); } });
    const r = await resolveNewsCardContext("https://example.com/e", "/api/fetch-article", fake);
    assert.deepStrictEqual(r.payload.article_unavailable_reason, { http_status: 504, extraction_outcome: "not_attempted" });
    assert.strictEqual(r.degraded, true);
  }

  // 4c. The no-throw contract is what Task 2 removed the screen's `finally` on: every path above
  //     resolved. Assert the source itself carries no throw, so a future edit cannot quietly
  //     reintroduce one and leak the news-card spinner.
  {
    const resolverSrc = readFileSync(path.join(REPO_ROOT, "src/lib/newsCardContext.js"), "utf8")
      .split("\n").filter(l => !/^\s*\/[/*]/.test(l) && !/^\s*\*/.test(l)).join("\n");
    assert.ok(!/\bthrow\b/.test(resolverSrc), "newsCardContext.js must contain no throw -- the screen dropped its finally on that guarantee");
    assert.ok(!/\bfinally\b/.test(resolverSrc), "newsCardContext.js must contain no finally that could rethrow");
  }

  // 5. THE PARITY GUARD -- the assertion that would have caught SES-57.
  //    Both callers must import the resolver, and neither may hand-build the payload.
  {
    assert.ok(/from\s+["']\.\.\/lib\/newsCardContext\.js["']/.test(SCREEN),
      "MarketIntelligenceScreen.jsx must import resolveNewsCardContext from ../lib/newsCardContext.js");
    assert.ok(/from\s+["']\.\.\/src\/lib\/newsCardContext\.js["']/.test(ENGINE),
      "chi-true-regression.mjs must import resolveNewsCardContext from ../src/lib/newsCardContext.js");
    // Neither file may contain its own article_content literal payload construction.
    for (const [name, src] of [["MarketIntelligenceScreen.jsx", SCREEN], ["chi-true-regression.mjs", ENGINE]]) {
      assert.ok(!/article_content\s*:\s*article(Text|Content)\b/.test(src),
        `${name} must not build the news-card payload itself -- call resolveNewsCardContext instead`);
      assert.ok(!/article_content\s*:/.test(src),
        `${name} must contain no article_content key at all -- the resolver owns every one of the four keys`);
    }
  }

  // 5b. Assertion 5 is a source scan, so it proves the import LINE exists, not that the path
  //     RESOLVES. A typo'd specifier would satisfy the regex and still kill every run. Importing
  //     the engine is the resolution proof; it does not start a run (its own isMainModule gate,
  //     SES-31) and AGT-36-honest-gap-scoring.js already imports it the same way.
  {
    const engineMod = await import("../../scripts/chi-true-regression.mjs");
    assert.ok(typeof engineMod.extractCases === "function",
      "scripts/chi-true-regression.mjs must import cleanly under plain Node -- its ../src/lib/newsCardContext.js specifier has to resolve, not just be present");
  }

  // 6. The three call sites the payload must reach in the test engine are still three, and all
  //    spread extraFields. Guards the mapping CONTEXT documents (answer / gate / display).
  {
    const spreads = (ENGINE.match(/\.\.\.extraFields/g) || []).length;
    assert.ok(spreads >= 3, `expected extraFields spread into at least 3 calls, found ${spreads}`);
  }

  return "SES-57 news-card context parity: 6/6 PASS";
}

selfRun(import.meta.url, run);
