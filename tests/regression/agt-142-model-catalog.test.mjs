// DeepBench v7.0.588 | tests/regression/agt-142-model-catalog.test.mjs | AGT-142 (P10 - Tooling)
//
// FEATURE: AGT-142 -- one table names the model for every job type. public.model_catalog lists the
// models (price by join to public.model_pricing, the one price home, §19t); public.model_assignments
// maps each job (a runner lane, or a capability whose default Intent Skill runs a model no lane
// names) to its model; public.runner_model_lanes stays a table and becomes a trigger-kept mirror of
// the lane rows, refusing any direct write. Migration: docs/design/agt-142-model-catalog.sql.
//
// SIX PARTS, the kickoff's QA (docs/kickoffs/v7.0.588-AGT-142-model-catalog-assignments.md §6):
//   (a) OFFLINE -- computeCallCost prices claude-opus-5-5 at $4/$20 with its own $0.20 cache read.
//   (b) LIVE -- model_catalog has 6 rows; opus-5-5's dates; model_pricing prices it 0.004/0.020.
//   (c) LIVE -- model_assignments: 3 lane + exactly 2 capability rows; runner_model_lanes equals the
//       lane rows on all five columns and still equals the values measured 2026-09-25.
//   (d) LIVE -- anon key refused on both new tables; service key reads 6 and 5 (both directions).
//   (e) LIVE -- a direct PATCH to runner_model_lanes errors naming model_assignments; a no-op PATCH
//       through model_assignments succeeds and the mirror row still equals it.
//   (f) LIVE -- ses-313 part 4 and log-149 part (e) stay green (their own run() re-executed here).
//
// CONTROL: origin/dev before this ticket has no catalog, no claude-opus-5-5 price and accepts a
// direct write to runner_model_lanes -- every part above fails there. (e)'s writes are no-ops by
// construction (each PATCH writes the row's current value), so live state is unchanged.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";
import { computeCallCost, MODEL_PRICING } from "../../shared/models.js";

const near = (a, b, eps = 1e-12) => Math.abs(a - b) <= eps;

// Measured over MCP 2026-09-25 18:30Z (kickoff §2 CONTEXT).
const LANES_MEASURED = {
  orchestrator: { model_id: "claude-opus-5", updated_at: "2026-09-02T23:17:49.529179+00:00", updated_by: "ses-313-coding" },
  judgment: { model_id: "claude-fable-5-1", updated_at: "2026-09-09T19:20:19.34746+00:00",
    updated_by: "design-runner-24h-0908 (decision 91d43ca7-8e71-455a-b885-30a336367a27)" },
  mechanical: { model_id: "claude-sonnet-5", updated_at: "2026-09-02T23:17:49.529179+00:00", updated_by: "ses-313-coding" },
};
const LANE_COLS = ["model_id", "purpose", "updated_at", "updated_by"];

function partA() {
  const cost = computeCallCost("claude-opus-5-5", 1000, 1000);
  assert.ok(cost !== null, "computeCallCost('claude-opus-5-5', ...) returned null -- the model is unpriced");
  assert.ok(near(cost, 0.024), `computeCallCost('claude-opus-5-5', 1000, 1000) = ${cost}, expected 0.024`);
  assert.strictEqual(MODEL_PRICING["claude-opus-5-5"].cache_read_per_1k, 0.0002,
    "claude-opus-5-5 must carry its own published $0.20/MTok cache-read rate");
  // The own rate is what fires, not the 0.10x fallback (which would also be 0.0004 -> distinguishable).
  assert.ok(near(computeCallCost("claude-opus-5-5", 0, 0, 0, 1000), 0.0002),
    "1000 cache-read tokens must price at the model's own 0.0002, not a fallback");
  return ["a-opus-5-5-priced"];
}

async function live() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("AGT-142 (b)-(f) live catalog, assignments, grants, mirror guard",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- export them from public.runner_secrets by name");
    return [];
  }
  const base = url.replace(/\/+$/, "");
  const svc = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async (q, headers = svc) => {
    const r = await fetch(`${base}/rest/v1/${q}`, { headers });
    if (!r.ok) assert.fail(`GET ${q} -> HTTP ${r.status} ${await r.text()}`);
    return r.json();
  };
  const results = [];

  // (b)
  const catalog = await get("model_catalog?select=model_id,family,released_on,retire_not_before&order=model_id");
  assert.strictEqual(catalog.length, 6, `model_catalog holds ${catalog.length} rows, expected 6`);
  const o55 = catalog.find(r => r.model_id === "claude-opus-5-5");
  assert.ok(o55, "model_catalog has no claude-opus-5-5 row");
  assert.strictEqual(o55.released_on, "2026-09-22");
  assert.strictEqual(o55.retire_not_before, "2027-09-22");
  const price = await get("model_pricing?select=model,input_per_1k,output_per_1k&model=eq.claude-opus-5-5");
  assert.strictEqual(price.length, 1, "model_pricing does not price claude-opus-5-5");
  assert.ok(near(Number(price[0].input_per_1k), 0.004) && near(Number(price[0].output_per_1k), 0.020),
    `model_pricing prices claude-opus-5-5 at ${price[0].input_per_1k}/${price[0].output_per_1k}, expected 0.004/0.020`);
  results.push("b-catalog-6-rows-opus-5-5-dated-and-priced");

  // (c)
  const assigns = await get("model_assignments?select=job_kind,job_key,model_id,purpose,updated_at,updated_by&order=job_kind,job_key");
  const laneRows = assigns.filter(r => r.job_kind === "lane");
  const capRows = assigns.filter(r => r.job_kind === "capability");
  assert.strictEqual(laneRows.length, 3, `model_assignments holds ${laneRows.length} lane rows, expected 3`);
  assert.deepStrictEqual(capRows.map(r => r.job_key).sort(), ["bench-report-card", "data-room-custody"],
    `capability rows are [${capRows.map(r => r.job_key)}], expected exactly bench-report-card + data-room-custody`);
  const mirror = await get("runner_model_lanes?select=lane,model_id,purpose,updated_at,updated_by&order=lane");
  assert.strictEqual(mirror.length, 3, `runner_model_lanes holds ${mirror.length} rows, expected 3`);
  const ts = v => new Date(v).getTime() + (String(v).match(/\.(\d+)/)?.[1] ?? "").padEnd(6, "0").slice(3); // keep microseconds
  for (const m of mirror) {
    const a = laneRows.find(r => r.job_key === m.lane);
    assert.ok(a, `runner_model_lanes lane "${m.lane}" has no model_assignments row`);
    for (const c of LANE_COLS) {
      const eq = c === "updated_at" ? ts(a[c]) === ts(m[c]) : a[c] === m[c];
      assert.ok(eq, `lane ${m.lane}: runner_model_lanes.${c} (${m[c]}) != model_assignments.${c} (${a[c]})`);
    }
    const want = LANES_MEASURED[m.lane];
    assert.ok(want, `unexpected lane ${m.lane}`);
    assert.strictEqual(m.model_id, want.model_id, `lane ${m.lane} model moved from the measured ${want.model_id}`);
    assert.strictEqual(m.updated_by, want.updated_by, `lane ${m.lane} updated_by moved`);
    assert.strictEqual(ts(m.updated_at), ts(want.updated_at), `lane ${m.lane} updated_at moved`);
  }
  results.push("c-assignments-3-lane-2-capability-mirror-equal");

  // (d) both directions
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) {
    notRun("AGT-142 (d) anon half", "no SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY -- the anon refusal is unverified here");
  } else {
    const anon = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
    for (const t of ["model_catalog", "model_assignments"]) {
      const r = await fetch(`${base}/rest/v1/${t}?select=*`, { headers: anon });
      const body = await r.text();
      const leaked = r.ok && (() => { try { const j = JSON.parse(body); return Array.isArray(j) && j.length > 0; } catch { return false; } })();
      assert.ok(!r.ok, `anon GET ${t} returned HTTP ${r.status}${leaked ? " WITH ROWS" : ""} -- expected a refusal`);
    }
    results.push("d-anon-refused-both-tables");
  }
  assert.strictEqual((await get("model_catalog?select=model_id")).length, 6, "service key must read 6 catalog rows");
  assert.strictEqual((await get("model_assignments?select=job_key")).length, 5, "service key must read 5 assignment rows");
  results.push("d-service-reads-6-and-5");

  // (e) no-op writes: each PATCH writes the row's current value.
  const mech = mirror.find(m => m.lane === "mechanical");
  const direct = await fetch(`${base}/rest/v1/runner_model_lanes?lane=eq.mechanical`, {
    method: "PATCH", headers: { ...svc, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ purpose: mech.purpose }),
  });
  const directBody = await direct.text();
  assert.ok(!direct.ok, `direct PATCH runner_model_lanes returned HTTP ${direct.status} -- the mirror guard is not enforcing`);
  assert.ok(directBody.includes("model_assignments"), `direct write was refused but not by the guard: ${directBody}`);
  results.push("e-direct-lane-write-refused-by-guard");

  const mechAssign = laneRows.find(r => r.job_key === "mechanical");
  const via = await fetch(`${base}/rest/v1/model_assignments?job_kind=eq.lane&job_key=eq.mechanical`, {
    method: "PATCH", headers: { ...svc, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ updated_by: mechAssign.updated_by }),
  });
  if (!via.ok) assert.fail(`PATCH model_assignments (mechanical) -> HTTP ${via.status} ${await via.text()}`);
  const viaRows = await via.json();
  assert.strictEqual(viaRows.length, 1, "PATCH model_assignments must touch exactly the mechanical lane row");
  const after = (await get("runner_model_lanes?select=lane,model_id,purpose,updated_at,updated_by&lane=eq.mechanical"))[0];
  for (const c of LANE_COLS) {
    const eq = c === "updated_at" ? ts(after[c]) === ts(viaRows[0][c]) : after[c] === viaRows[0][c];
    assert.ok(eq, `after the sync, runner_model_lanes.mechanical.${c} != model_assignments`);
    const unchanged = c === "updated_at" ? ts(after[c]) === ts(mech[c]) : after[c] === mech[c];
    assert.ok(unchanged, `the no-op write changed runner_model_lanes.mechanical.${c}`);
  }
  results.push("e-write-through-assignments-syncs-mirror");

  // (f)
  const ses313 = (await import("./ses-313-model-lanes.test.mjs")).default;
  await ses313();
  results.push("f-ses-313-green");
  const log149 = (await import("./log-149-api-dollars-ledger.test.mjs")).default;
  await log149();
  results.push("f-log-149-green");

  return results;
}

async function run() {
  const results = [...partA(), ...(await live())];
  console.log(`AGT-142: ${results.length} checks passed -- ${results.join(", ")}`);
  return results;
}

selfRun(import.meta.url, run);
export default run;
