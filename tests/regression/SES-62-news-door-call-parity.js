// DeepBench v6.3.231 | tests/regression/SES-62-news-door-call-parity.js | SES-62 -- the test engine's
// news door must mirror MarketIntelligenceScreen.jsx's two-call sequence. This is the assertion that
// would have caught SES-62 the morning CHI-92 shipped: it fails if either side changes its calls or
// its field reads without the other following. Third recurrence of this mirror drifting
// (SES-31 field values, SES-57 payload fields, SES-62 call sequence) -- see docs/harvests/SES-57.md.
//
// Follows the SES-28 self-run guard pattern (default export + selfRun), same as
// SES-57-news-card-context-parity.js -- run-all.js calls each module's DEFAULT export, and a bare
// `node <file>` run would otherwise import the module, call nothing, and exit 0 (a vacuous green).

import assert from "node:assert";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const ENGINE = readFileSync(path.join(REPO_ROOT, "scripts/chi-true-regression.mjs"), "utf8");
const SCREEN = readFileSync(path.join(REPO_ROOT, "src/screens/MarketIntelligenceScreen.jsx"), "utf8");

// The news-door function only -- a match anywhere else in a 700-line file proves nothing.
function newsDoorBody(src) {
  const start = src.indexOf("async function runNewsDoorCaseJourney");
  assert.ok(start > 0, "runNewsDoorCaseJourney not found in the test engine");
  const end = src.indexOf("\nfunction executeCaseJourney", start);
  assert.ok(end > start, "could not bound runNewsDoorCaseJourney");
  return src.slice(start, end);
}

async function main() {
  const door = newsDoorBody(ENGINE);

  // 1. Both intents are called, in the screen's order.
  const iSearch = door.indexOf("ws-news-search-intent");
  const iDisplay = door.indexOf("ws-news-display-intent");
  assert.ok(iSearch > 0, "news door must call ws-news-search-intent");
  assert.ok(iDisplay > 0, "news door must call ws-news-display-intent -- CHI-92 split the flow in two");
  assert.ok(iSearch < iDisplay, "search must precede display");

  // 2. The display call forwards the stories, exactly as the screen does.
  assert.ok(/task_context:\s*\{\s*stories\s*\}/.test(door),
    "the display call must pass task_context: { stories }");

  // 3. The field reads match the screen's. THE regression: reading `cards` off the search call
  //    is the defect -- that key has never existed on it.
  assert.ok(/Array\.isArray\(search\.stories\)/.test(door), "must read stories off the search result");
  assert.ok(/Array\.isArray\(display\.cards\)/.test(door), "must read cards off the display result");
  assert.ok(!/Array\.isArray\(cardsResp\.cards\)/.test(door),
    "must NOT read .cards off the search call -- that is the SES-62 defect");

  // 4. The two failure modes stay distinguishable. One shared message is what made this defect
  //    read as a Jordan problem when it was a test-engine problem.
  assert.ok(/zero stories/.test(door), "an empty search must fail with its own message");
  assert.ok(/zero cards/.test(door), "an empty format step must fail with its own message");

  // 5. SES-57's resolver is still the article step -- this session must not have disturbed it.
  assert.ok(/resolveNewsCardContext\(card\.url,\s*FETCH_ARTICLE_ENDPOINT\)/.test(door),
    "the article step must still go through the Article Context Resolver (SES-57)");

  // 6. The screen side of the mirror is what we claim it is. If CHI-92's sequence is ever
  //    changed again, this fails on the screen rather than silently letting the engine drift.
  assert.ok(/intent_slug:\s*"ws-news-search-intent"/.test(SCREEN), "screen must call the search intent");
  assert.ok(/intent_slug:\s*"ws-news-display-intent"/.test(SCREEN), "screen must call the display intent");
  assert.ok(/Array\.isArray\(search\?\.stories\)/.test(SCREEN), "screen must read search?.stories");
  assert.ok(/Array\.isArray\(result\?\.cards\)/.test(SCREEN), "screen must read result?.cards");

  // 7. Only the reads the card schema guarantees. news-cards-format requires headline/snippet/
  //    source/url; published_at is nullable, so the news door must not depend on it.
  const cardReads = [...door.matchAll(/\bcard\.(\w+)/g)].map(m => m[1]);
  const allowed = new Set(["headline", "snippet", "source", "url"]);
  for (const f of cardReads) {
    assert.ok(allowed.has(f), `news door reads card.${f}, which news-cards-format does not guarantee`);
  }

  return "SES-62 news-door call parity: 7/7 PASS";
}

export default main;

selfRun(import.meta.url, main);
