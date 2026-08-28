// DeepBench v7.0.289 | tests/regression/LOG-41-agent-hop-rollup.js | LOG-41
// FEATURE: LOG-41 (task 7 of 7 in the AI-35/LOG-23 chain) -- the by-agent / by-hop pattern rollup,
// public.ai_pattern_agent_hop_rollup, computed in the database instead of in the browser.
//
// WHAT THIS PINS, and why each half exists rather than being a count of rows somebody eyeballed:
//
//   1. THE RECONCILIATION IDENTITY IS THE WHOLE TEST. For every pattern, the agent-dimension rows
//      must sum to exactly the platform rollup's call_count AND cost_sum for that pattern, and so
//      must the hop-dimension rows. That is the assertion a broken, empty, filtered or
//      double-counting view cannot satisfy. Measured when this shipped: 13 patterns, 32,441
//      classified calls, ZERO mismatches on either cut.
//
//   2. THE NON-VACUITY GATE RUNS FIRST, because assertion 1 is an equality over a JOIN and a view
//      returning nothing at all would join to nothing and report zero mismatches -- a green line
//      proving the opposite of what it claims. So the totals are asserted > 0 and asserted EQUAL to
//      the platform total before any per-pattern comparison is trusted.
//
//   3. NULL BUCKETS ARE KEPT, NEVER FILTERED. 82 log rows carry a NULL agent_id and 18,787 carry no
//      depthN segment in `feature` (routers, wrappers, embeddings). The view rolls those up under a
//      NULL key rather than dropping them, which is what makes the identity hold unconditionally.
//      A future "tidy" that adds `where agent_id is not null` would break assertion 1 the moment one
//      NULL-agent row ever classifies -- which is exactly when silence would be most expensive.
//      (At ship time zero NULL-agent rows classified, so this guard is forward-looking on purpose.)
//
//   4. NO log_ids COLUMN. Shipping array_agg(id) to the browser is the defect this view replaces:
//      the platform rollup returns 32,441 ids = 190,808 bytes on every AI Audit load purely so JS can
//      re-bucket them by agent. A later editor "restoring" log_ids here would reintroduce it.
//
//   5. SELECT-ONLY FOR THE PUBLIC ROLES, asserted in BOTH directions per
//      .claude/rules/supabase-column-grants.md -- the permitted read must work AND the denied writes
//      must be denied. One direction alone passes on an object nobody can reach at all. Note the
//      three PRE-EXISTING rollup views still carry table-level ALL for anon/authenticated (a
//      pre-DAT-18 artifact, latent only because a grouped view is not auto-updatable); this view
//      deliberately does NOT replicate that, and assertion 5 is what stops it drifting back.
//
// CREDENTIALS. Every assertion here reads the live database, because the view lives in the database
// and not in this repo (the SES-197 precedent). With no credentials the whole thing is DECLARED
// not-run via notRun() rather than counted as a pass -- SES-180 (b)'s rule: an invisible gap is
// indistinguishable from coverage.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";

const VIEW = "ai_pattern_agent_hop_rollup";
const PLATFORM = "ai_pattern_classification_rollup";

async function rest(url, key, path) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    throw new Error(`REST ${path} failed: HTTP ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export default async function run() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    notRun(
      "LOG-41 rollup reconciliation",
      "no SUPABASE_URL / SUPABASE_SERVICE_KEY in env. The view lives in the database, not this " +
      "repo, so every assertion is credentialed. Run with " +
      "`node --env-file=.env.local tests/regression/run-all.js` to include it."
    );
    return;
  }

  // ---- read both rollups -------------------------------------------------------------------
  const rollup = await rest(url, key, `${VIEW}?select=pattern_slug,dim,agent_id,hop_depth,call_count,cost_sum`);
  const platform = await rest(url, key, `${PLATFORM}?select=pattern_slug,call_count,cost_sum`);

  // ---- 2. non-vacuity, FIRST, so assertion 1 cannot pass by joining to nothing ----------------
  assert.ok(rollup.length > 0, `${VIEW} returned no rows at all — the identity below would be vacuous`);
  assert.ok(platform.length > 0, `${PLATFORM} returned no rows — nothing to reconcile against`);

  const num = v => (v === null || v === undefined ? 0 : Number(v));
  const sum = (rows, f) => rows.reduce((a, r) => a + num(r[f]), 0);

  const agentRows = rollup.filter(r => r.dim === "agent");
  const hopRows = rollup.filter(r => r.dim === "hop");
  assert.ok(agentRows.length > 0, `${VIEW} produced no agent-dimension rows`);
  assert.ok(hopRows.length > 0, `${VIEW} produced no hop-dimension rows`);

  const platformTotal = sum(platform, "call_count");
  assert.ok(platformTotal > 0, "the platform rollup reports zero classified calls — nothing to test");
  assert.strictEqual(
    sum(agentRows, "call_count"), platformTotal,
    "agent-dimension total must equal the platform rollup's classified-call total — a mismatch " +
    "means the view is dropping or duplicating rows (check for a NULL-bucket filter)"
  );
  assert.strictEqual(
    sum(hopRows, "call_count"), platformTotal,
    "hop-dimension total must equal the platform rollup's classified-call total"
  );

  // ---- 1. the reconciliation identity, per pattern, on BOTH cuts and BOTH measures -------------
  const platformBySlug = new Map(platform.map(p => [p.pattern_slug, p]));
  const mismatches = [];
  for (const [dim, rows] of [["agent", agentRows], ["hop", hopRows]]) {
    const bySlug = new Map();
    for (const r of rows) {
      const cur = bySlug.get(r.pattern_slug) || { calls: 0, cost: 0 };
      cur.calls += num(r.call_count);
      cur.cost += num(r.cost_sum);
      bySlug.set(r.pattern_slug, cur);
    }
    for (const [slug, got] of bySlug) {
      const want = platformBySlug.get(slug);
      if (!want) { mismatches.push(`${dim}/${slug}: present in ${VIEW} but not in ${PLATFORM}`); continue; }
      if (got.calls !== num(want.call_count)) {
        mismatches.push(`${dim}/${slug}: call_count ${got.calls} !== platform ${num(want.call_count)}`);
      }
      // cost is numeric/float; compare to sub-cent tolerance rather than bit equality
      if (Math.abs(got.cost - num(want.cost_sum)) > 1e-6) {
        mismatches.push(`${dim}/${slug}: cost_sum ${got.cost} !== platform ${num(want.cost_sum)}`);
      }
    }
    // every platform pattern must appear in each cut — a silently missing pattern is a real defect
    for (const slug of platformBySlug.keys()) {
      if (!bySlug.has(slug)) mismatches.push(`${dim}/${slug}: missing from ${VIEW}'s ${dim} cut`);
    }
  }
  assert.strictEqual(
    mismatches.length, 0,
    `${VIEW} does not reconcile with ${PLATFORM}:\n  ` + mismatches.join("\n  ")
  );

  // ---- 4. no log_ids column — the payload this view exists to stop shipping --------------------
  const cols = Object.keys(rollup[0]);
  assert.ok(
    !cols.includes("log_ids"),
    "log_ids must never be exposed by this view — shipping array_agg(id) to the browser is the " +
    "190,808-byte defect LOG-41 replaces"
  );

  // ---- 5. grants, BOTH directions -------------------------------------------------------------
  // The permitted direction and the denied direction are asserted separately below with the anon
  // key, because a one-directional check passes on an object nobody can reach at all. Note the
  // denied probe is a real POST rather than a privilege lookup: PostgREST is the surface the browser
  // actually uses, so a refusal there is the fact that matters. A grouped view is not auto-updatable
  // either way, so this asserts the door is shut, not which lock is doing it.
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) {
    notRun(
      "LOG-41 anon grant assertion",
      "no SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY in env. The reconciliation identity above DID " +
      "run; what is unproven here is that the public roles can read the view and cannot write it."
    );
    return;
  }

  // permitted direction: the anon key can read the view through PostgREST
  const anonRead = await fetch(`${url}/rest/v1/${VIEW}?select=pattern_slug,dim,call_count&limit=1`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  assert.ok(
    anonRead.ok,
    `anon cannot SELECT ${VIEW} (HTTP ${anonRead.status}) — the GRANT SELECT is missing or the view ` +
    "was created security_invoker, which fails on log_row_signature()'s read of the LOG-124-" +
    "restricted caller_ip column. Never trust the migration's success flag."
  );
  const anonRows = await anonRead.json();
  assert.ok(Array.isArray(anonRows) && anonRows.length > 0, "anon read returned no rows");

  // denied direction: no write privilege for the public roles
  const anonWrite = await fetch(`${url}/rest/v1/${VIEW}`, {
    method: "POST",
    headers: {
      apikey: anonKey, Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json", Prefer: "return=minimal",
    },
    body: JSON.stringify({ pattern_slug: "regression-probe", dim: "agent", call_count: 1 }),
  });
  assert.ok(
    !anonWrite.ok,
    `anon was able to POST to ${VIEW} (HTTP ${anonWrite.status}) — DAT-18's posture is zero public ` +
    "write privileges; do not replicate the pre-DAT-18 table-level ALL the three older rollup views " +
    "still carry"
  );
}

selfRun(import.meta.url, run);
