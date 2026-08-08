// DeepBench v6.3.208 | tests/regression/CHI-31-source-simulation-consistency.js | CHI-31
// FEATURE: CHI-31 -- Category M persistent regression test (SES-009a standing rule).
//
// source_simulation is a new value cutting across 3 places: the_library data (Task 1, live
// Supabase writes -- not re-asserted here, that's a one-time migration, not a standing
// invariant), describeDataType()'s display-label taxonomy (src/screens/MarketIntelligenceScreen.jsx),
// and both ci-answer-intent/qg-review-intent Skill Profiles' method text (Task 2). This test
// asserts the latter two stay consistent going forward.
//
// describeDataType() lives inside a .jsx file (a React component module) and is not exported --
// plain Node has no JSX transform, so it can't be imported directly the way SES-009a's
// mergeSteps() test imports a plain .js module. Its source has no JSX of its own (pure switch/
// object-literal logic), so it's extracted from the real file by brace-matching and evaluated
// with the real T token import bound into scope -- this runs the actual current function body,
// not a re-implementation that could silently drift from it.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { T } from "../../src/tokens.js";
import { selfRun } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env.local") });

function extractDescribeDataType() {
  const filePath = path.join(__dirname, "../../src/screens/MarketIntelligenceScreen.jsx");
  const src = fs.readFileSync(filePath, "utf8");
  const startMarker = "function describeDataType(dataType, { isBaseline, source } = {}) {";
  const start = src.indexOf(startMarker);
  assert.ok(start >= 0, "describeDataType() must exist in MarketIntelligenceScreen.jsx with its expected signature");

  // startMarker's own text already contains balanced braces (the destructured parameter, `{}`'s
  // default) plus the function body's real opening brace as its very last character -- depth
  // starts at 1 (that opening brace already consumed) and scanning begins right after it, not
  // from `start`, so those parameter-list braces never get mistaken for the body's own.
  const bodyStart = start + startMarker.length;
  let depth = 1, end = -1;
  for (let i = bodyStart; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  assert.ok(end > start, "describeDataType()'s closing brace must be found (brace-matching failed)");

  const fnSource = src.slice(start, end);
  const factory = new Function("T", `${fnSource}\nreturn describeDataType;`);
  return factory(T);
}

export default async function run() {
  const describeDataType = extractDescribeDataType();

  // 1. New source_simulation the_library.data_type value gets its own explicit label/color.
  const sim = describeDataType("source_simulation");
  assert.strictEqual(sim.label, "Source Simulation", "source_simulation must render label 'Source Simulation'");
  assert.strictEqual(sim.color, T.mutedDeep, "source_simulation must use T.mutedDeep (same color the derived case used)");
  assert.strictEqual(sim.whoTag, null, "source_simulation must never carry a whoTag");

  // 2. synthesized no longer special-cases isBaseline -- always "Analysis" now, so the deliberate
  // Signal Mobile guardrail holdout (synthesized, is_baseline: true) displays honestly instead of
  // masquerading under the new safer "Source Simulation" label.
  const synthBaseline = describeDataType("synthesized", { isBaseline: true });
  assert.strictEqual(synthBaseline.label, "Analysis", "synthesized+isBaseline:true must now render 'Analysis', not the old derived 'Source Simulation'");
  const synthNonBaseline = describeDataType("synthesized", { isBaseline: false });
  assert.strictEqual(synthNonBaseline.label, "Analysis", "synthesized+isBaseline:false must still render 'Analysis'");
  assert.strictEqual(synthBaseline.color, T.brass, "synthesized must use T.brass, same as inferred's Analysis color");

  // 3. Both Skill Profiles' method text must carry the new CHI-31 clauses (Task 2), and the
  // pre-existing rules they sit alongside must still be intact (no accidental overwrite).
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  assert.ok(supabaseUrl && supabaseKey, "SUPABASE_URL/SUPABASE_SERVICE_KEY must be configured (.env.local) to verify Skill Profile text");
  const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };

  const res = await fetch(
    `${supabaseUrl}/rest/v1/skill_profiles?slug=in.(ci-answer-intent,qg-review-intent)&select=slug,method`,
    { headers }
  );
  if (!res.ok) throw new Error("skill_profiles fetch must succeed -- " + (await res.text()).slice(0, 200));
  const rows = await res.json();

  const marcus = rows.find(r => r.slug === "ci-answer-intent");
  const owen = rows.find(r => r.slug === "qg-review-intent");
  assert.ok(marcus, "ci-answer-intent Skill Profile row must exist");
  assert.ok(owen, "qg-review-intent Skill Profile row must exist");

  assert.ok(marcus.method.includes("SOURCE_SIMULATION EXCEPTION TO WEAKEST-LINK"), "ci-answer-intent method must carry the CHI-31 source_simulation weakest-link clause");
  assert.ok(marcus.method.includes("CONFIDENCE_TIER RESOLUTION (added v6.3.47, LOO-007)"), "ci-answer-intent method must still carry the pre-existing LOO-007 weakest-link rule, untouched");
  assert.ok(marcus.method.includes("ENTITY RESOLUTION (added v6.3.53, CHI-19)"), "ci-answer-intent method must still carry the pre-existing CHI-19 entity-resolution addition, untouched");

  assert.ok(owen.method.includes("SOURCE_SIMULATION IS NOT A TIER MISMATCH"), "qg-review-intent method must carry the CHI-31 source_simulation tier-mismatch clause");
  assert.ok(owen.method.includes("SYNTHESIZED_AS_FACT VERIFICATION (added v6.3.43, LOO-006)"), "qg-review-intent method must still carry the pre-existing LOO-006 verification flow, untouched");
  assert.ok(owen.method.includes("ESCALATION FOR UNFIXABLE BLOCKS"), "qg-review-intent method must still carry the pre-existing escalation logic, untouched");

  // Found this session: this is the first regression file in this suite to use global fetch().
  // run-all.js's own process.exit() call, fired right after this test's promise resolves, races
  // undici's keep-alive socket teardown on Windows/Node 24 -- a bare fetch+process.exit() script
  // with none of this file's own logic reproduces the same libuv crash (`UV_HANDLE_CLOSING`
  // assertion in src/win/async.c). A brief pause here lets that teardown settle before run-all.js's
  // process.exit() fires, without touching the shared harness file (out of this session's scope).
  // Flagged as a real (if minor) latent run-all.js bug for a future session: process.exit() should
  // be process.exitCode + a natural drain, per Node's own guidance -- this workaround only masks it
  // for this one file.
  await new Promise(r => setTimeout(r, 150));
}

selfRun(import.meta.url, run);
