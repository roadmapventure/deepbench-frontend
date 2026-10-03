// DeepBench v7.0.293 | tests/regression/LOG-145-classification-fetch-cache.js | LOG-145
// FEATURE: LOG-145 -- fetchPatternClassification() gets the module-level cache its four sibling
// reads already have, and the "cutover" LOG-145 imagined is pinned as impossible-by-design:
//
//   1. A FAILED read is never cached (preservation control -- passes before and after; a cache
//      that swallowed failures would freeze the By Pattern section empty for the whole page
//      session, which is worse than the refetch this ticket removes).
//   2. Two CONCURRENT mounts (AI Audit + the MI Agents drawer) share ONE in-flight rollup query.
//      Pre-change: 2 queries, each re-shipping the 190,808-byte log_ids payload at ~2,194ms as
//      anon against the 3s statement-timeout cap. THIS IS THE DISCRIMINATING ASSERTION -- it
//      fails on unchanged source with `2 !== 1`, verified by running it there.
//   3. A LATER mount is served from the module cache: zero new queries, zero re-shipped bytes.
//   4. Source-level pins of LOG-145's binding constraint: the read KEEPS selecting log_ids
//      (LOG-97's cost re-derivation, LOG-81's countable totals + reclassification union, and
//      LOG-112's scoped latency join each need row identity -- kickoff v7.0.293 §2), and NO src/
//      file reads ai_pattern_agent_hop_rollup (measured at LOG-41's ship: 2,353ms as anon beside
//      the existing 2,194ms read, with one observed 57014 statement timeout -- adding it ALONGSIDE
//      the payload is strictly worse than today, which is the constraint LOG-145 itself states).
//
// Parts 1-3 are behavioral and exercise the REAL exported function against a stubbed fetch --
// never a reimplementation of the cache inside this file (SES-45). The stub is installed BEFORE
// the module graph loads, so whatever reference supabase-js captures at client creation is the
// stub, and is restored in `finally` because run-all.js runs every guard in one process.
//
// THE ENV IS SAVED AND RESTORED, NOT PLANTED AND LEFT (SES-217). Seven existing guards do
// `if (!process.env.VITE_SUPABASE_ANON_KEY) process.env.VITE_SUPABASE_ANON_KEY = "regression-placeholder"`
// and never restore it; because run-all.js imports every module into ONE process, that value
// outlives its own test and defeats the `if (!anonKey) declare not-run` credential guard in files
// sorted after it -- which is why LOG-41-agent-hop-rollup.js reports a 401 as a missing GRANT in
// the suite while passing when run alone. This guard needs the same placeholder to load the module
// graph, so it takes it and puts it back.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

export default async function run() {
  const realFetch = globalThis.fetch;
  const hadUrl = Object.prototype.hasOwnProperty.call(process.env, "VITE_SUPABASE_URL");
  const hadKey = Object.prototype.hasOwnProperty.call(process.env, "VITE_SUPABASE_ANON_KEY");
  const prevUrl = process.env.VITE_SUPABASE_URL;
  const prevKey = process.env.VITE_SUPABASE_ANON_KEY;

  const calls = [];
  let mode = "fail";
  const json = body => new Response(JSON.stringify(body), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
  globalThis.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    if (mode === "fail") throw new Error("LOG-145 stub: simulated network failure");
    if (u.includes("ai_pattern_classification_rollup")) {
      return json([{
        pattern_slug: "stub-pattern", pattern_name: "Stub Pattern", pattern_description: "d",
        call_count: 2, cost_sum: "1.5", log_ids: [11, 12],
      }]);
    }
    if (u.includes("ai_pattern_reclassification_count")) {
      return json({ reclassification_count: 7 }); // .single() resolves an object
    }
    return json([]);
  };

  try {
    // Placeholder Supabase env only so the module graph loads under plain `node`
    // (src/lib/supabase.js falls back to process.env); no network call is made -- fetch is stubbed.
    if (!process.env.VITE_SUPABASE_URL) process.env.VITE_SUPABASE_URL = "http://localhost:54321";
    if (!process.env.VITE_SUPABASE_ANON_KEY) process.env.VITE_SUPABASE_ANON_KEY = "regression-placeholder";

    const { fetchPatternClassification } = await import("../../src/hooks/useAIActivity.js");
    const rollupCalls = () => calls.filter(u => u.includes("ai_pattern_classification_rollup")).length;

    // -- 1. A failure is never cached (preservation control; passes before and after) --
    const r1 = await fetchPatternClassification();
    assert.deepStrictEqual(
      r1, { classified: [], reclassificationCount: 0 },
      "on a failed read the function must resolve (never reject) to the empty fallback shape"
    );
    assert.ok(calls.length > 0, "the failure phase must actually have attempted a query");
    mode = "ok";
    calls.length = 0;

    // -- 2. Concurrent mounts share ONE in-flight read (fails on unchanged source: 2 !== 1) --
    const [r2a, r2b] = await Promise.all([fetchPatternClassification(), fetchPatternClassification()]);
    assert.strictEqual(
      rollupCalls(), 1,
      "two concurrent mounts (AI Audit + the MI Agents drawer) must share one in-flight rollup " +
      "query -- each extra query re-ships the 190,808-byte log_ids payload and re-pays a ~2,194ms " +
      "anon read against the 3s statement-timeout cap"
    );
    assert.strictEqual(r2a.classified[0].slug, "stub-pattern", "the mapped shape survives the cache");
    assert.deepStrictEqual(r2a.classified[0].logIds, [11, 12], "log_ids still hydrates logIds");
    assert.strictEqual(r2a.classified[0].total, 2, "call_count still maps to total");
    assert.strictEqual(r2a.classified[0].cost, 1.5, "cost_sum is still coerced to a number");
    assert.strictEqual(r2a.reclassificationCount, 7, "the reclassification count survives");
    assert.deepStrictEqual(r2b, r2a, "both concurrent callers see the same result");

    // -- 3. A later mount is served from the module cache: zero new queries --
    calls.length = 0;
    const r3 = await fetchPatternClassification();
    assert.strictEqual(
      calls.length, 0,
      "a re-mount after success must be served from the module cache -- zero new queries and " +
      "zero re-shipped bytes, the same discipline fetchPatternVocabulary() already keeps"
    );
    assert.deepStrictEqual(r3, r2a, "the cached result is the same data");

    // -- 4. The payload is replaced by NOTHING: log_ids stays, the hop rollup stays unread --
    const hookSrc = fs.readFileSync(path.join(ROOT, "src/hooks/useAIActivity.js"), "utf8");
    assert.ok(
      /from\('ai_pattern_classification_rollup'\)\.select\('[^']*log_ids/.test(hookSrc),
      "fetchPatternClassification must keep selecting log_ids: LOG-97's cost re-derivation, " +
      "LOG-81's countable totals and reclassification union, and LOG-112's scoped latency join " +
      "all need row identity, which no per-pattern aggregate can supply"
    );
    const srcFiles = [];
    (function walk(dir) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(js|jsx)$/.test(e.name)) srcFiles.push(p);
      }
    })(path.join(ROOT, "src"));
    // What is forbidden is READING the view, not naming it. A bare substring scan flags the
    // comment in useAIActivity.js that documents WHY the view stays unread -- i.e. it would make
    // the explanation of the constraint into a violation of it, and the cheap way out would be
    // deleting the explanation. So the pin matches a Supabase read: `.from('<view>')`, or the
    // PostgREST path a hand-rolled fetch would use.
    const READS_HOP_VIEW = /\.from\(\s*['"`]ai_pattern_agent_hop_rollup['"`]|rest\/v1\/ai_pattern_agent_hop_rollup/;
    const offenders = srcFiles.filter(f => READS_HOP_VIEW.test(fs.readFileSync(f, "utf8")));
    assert.strictEqual(
      offenders.length, 0,
      "no src/ file may read ai_pattern_agent_hop_rollup: LOG-41 measured it at 2,353ms as anon " +
      "beside the existing 2,194ms rollup read, with one run hitting the 3s statement timeout -- " +
      "adding it alongside log_ids is strictly worse than today (LOG-145's binding constraint). " +
      "Offenders: " + offenders.join(", ")
    );
  } finally {
    globalThis.fetch = realFetch;
    if (hadUrl) process.env.VITE_SUPABASE_URL = prevUrl; else delete process.env.VITE_SUPABASE_URL;
    if (hadKey) process.env.VITE_SUPABASE_ANON_KEY = prevKey; else delete process.env.VITE_SUPABASE_ANON_KEY;
  }
}

selfRun(import.meta.url, run);
