// DeepBench v7.0.427 | tests/regression/ses-330-governance-lane.test.mjs | SES-330
//
// FEATURE: SES-330 -- a governance Product Focus Area with hidden visibility and a governance
// lane flag. The five governance agents (AGT-63..67) and the Development Manager hold
// capabilities the product broker (Michelle Manning) must never offer, and must never appear in
// a customer-facing agent picker -- while staying runnable by a direct executor call and by a
// session sub-agent. The DB half (`agents.lane`, migration `ses330_agent_lane`) is already live;
// this session closes the two leaks named in the kickoff's CONTEXT section: lib/project-manager.js's
// fetchRoster() (the broker's candidate list) and CreateWorkOrderScreen.jsx's client-side
// `from('agents')` read.
//
// FOUR PARTS, matching the kickoff's Task 3 (a)/(b)/(c) plus the QA section's discriminating check:
//   (a) STATIC -- both source files carry the lane='product' filter (grep exact strings).
//       Negative control: a copy of each source with the filter stripped fails the same check.
//   (b) LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN) -- agents?lane=eq.governance
//       resolves (the column exists, may be empty), and the ck_agents_lane CHECK constraint
//       rejects an invalid lane value with Postgres code 23514, rollback-safe (a single failed
//       INSERT persists nothing -- verified by re-reading the probe id after the attempt).
//   (c) STATIC -- execute.js's resolveCapabilityHolder() (the runtime holder lookup) selects only
//       is_active, never lane, so a governance holder resolves through the exact same branch as
//       a product one. Mutation control: a copy with a lane check spliced in is caught by the
//       same assertion, proving it discriminates rather than passing by construction.
//   (d) LIVE QA (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN) -- the kickoff's own
//       discriminating check: with a fixture agent inserted as lane='governance', is_active=true
//       (before-image printed first, deleted after), getRosterCandidates() -- the only exported
//       entry point onto fetchRoster() -- must not surface it, while a direct
//       agents?id=eq.<fixture> read confirms the row exists. Would this pass if Task 1 did
//       nothing? No -- the fixture would appear in the roster chunks.
//
// DRY-RUN against the unchanged tree (measured before this session's edits, v7.0.426): part (a)'s
// two positive checks FAIL (neither file yet carries a lane filter) while the negative controls
// (already-stripped text) pass trivially; part (c) passes today because execute.js never had a
// lane check to begin with -- unaffected by this ticket's edits, kept as a guard against a future
// regression; parts (b)/(d) declare NOT RUN without credentials, and (d) would FAIL with
// credentials (the fixture would appear in fetchRoster()'s roster before Task 1's filter exists).

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const PM_REL = "lib/project-manager.js";
const WO_REL = "src/screens/CreateWorkOrderScreen.jsx";
const EXEC_REL = "api/capabilities/execute.js";

const FIXTURE_ID = "ses330-fixture-governance-agent";
const REQUESTING_AGENT_ID = "chloe"; // measured live 2026-09-09: lane='product', is_active=true

// ---------------------------------------------------------------------------------------------
// Part (a) -- STATIC: both source files carry the lane='product' filter, with negative controls
// ---------------------------------------------------------------------------------------------
function rosterFetchIsLaneScoped(src) {
  // The exact fetch line Task 1 edits: is_active=eq.true kept, &lane=eq.product added.
  return /agents\?is_active=eq\.true&lane=eq\.product&select=/.test(src);
}

function workOrderReadIsLaneScoped(src) {
  // The exact chain Task 2 edits: .eq('id', 'victoria') immediately followed (allowing for
  // whitespace/comments) by .eq('lane', 'product') before .single().
  return /\.eq\(['"]id['"],\s*['"]victoria['"]\)[\s\S]{0,200}?\.eq\(['"]lane['"],\s*['"]product['"]\)/.test(src);
}

function partA_staticLaneFilters() {
  const results = [];

  const pmSrc = read(PM_REL);
  assert.ok(rosterFetchIsLaneScoped(pmSrc),
    `${PM_REL}'s fetchRoster() agents fetch does not carry both is_active=eq.true and lane=eq.product`);
  results.push("project-manager-roster-fetch-is-lane-scoped");

  // Negative control: strip only the lane clause back out and confirm the same check now fails.
  const pmStripped = pmSrc.replace("is_active=eq.true&lane=eq.product&select=", "is_active=eq.true&select=");
  assert.notStrictEqual(pmStripped, pmSrc,
    `control setup failed: the exact lane=eq.product substring was not found verbatim in ${PM_REL} -- fix the mutation string, not the assertion`);
  assert.ok(!rosterFetchIsLaneScoped(pmStripped),
    `control: stripping lane=eq.product from ${PM_REL} still passes the check -- it does not discriminate`);
  results.push("project-manager-control-stripped-filter-fails");

  const woSrc = read(WO_REL);
  assert.ok(workOrderReadIsLaneScoped(woSrc),
    `${WO_REL}'s from('agents') read does not chain .eq('lane', 'product') after .eq('id', 'victoria')`);
  results.push("work-order-screen-agents-read-is-lane-scoped");

  // Negative control: remove just the .eq('lane', 'product') line and confirm the check fails.
  const woStripped = woSrc.replace(/\n\s*\.eq\(['"]lane['"],\s*['"]product['"]\)/, "");
  assert.notStrictEqual(woStripped, woSrc,
    `control setup failed: the .eq('lane', 'product') line was not found verbatim in ${WO_REL} -- fix the mutation string, not the assertion`);
  assert.ok(!workOrderReadIsLaneScoped(woStripped),
    `control: stripping .eq('lane', 'product') from ${WO_REL} still passes the check -- it does not discriminate`);
  results.push("work-order-screen-control-stripped-filter-fails");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (b) -- LIVE: agents?lane=eq.governance resolves; the CHECK constraint rejects a bad lane
// ---------------------------------------------------------------------------------------------
async function partB_liveLaneColumnAndCheck(ctx = {}) {
  const results = [];
  const url = ctx.url ?? process.env.SUPABASE_URL;
  const key = ctx.key ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("the live arm (agents.lane column existence, ck_agents_lane CHECK enforcement)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Measured over MCP when this shipped " +
      "(2026-09-09): agents.lane is text NOT NULL DEFAULT 'product', CHECK constraint " +
      "ck_agents_lane restricts it to ('product','governance'); agents?lane=eq.governance " +
      "returned zero rows (no governance agents seeded yet).");
    return results;
  }

  const base = url.replace(/\/+$/, "");
  const hdr = { apikey: key, Authorization: `Bearer ${key}` };

  // (b1) The column exists and the request succeeds -- may legitimately be an empty list today.
  // Read the body ONCE, and only on the failure path -- an eagerly-evaluated template literal
  // consumes the stream before .json() runs even when res.ok is true.
  const govRes = await fetch(`${base}/rest/v1/agents?lane=eq.governance&select=id`, { headers: hdr });
  if (!govRes.ok) assert.fail(`agents?lane=eq.governance did not resolve: HTTP ${govRes.status} ${await govRes.text()}`);
  const govRows = await govRes.json();
  assert.ok(Array.isArray(govRows), "agents?lane=eq.governance did not return a JSON array");
  results.push("agents-lane-governance-query-resolves");

  // (b2) The CHECK constraint rejects an invalid lane value, rollback-safe: a single failed
  // INSERT statement persists nothing by construction (Postgres aborts the statement, not a
  // multi-statement transaction we'd need to roll back ourselves) -- verified below anyway.
  const probeId = "ses330-check-constraint-probe";
  // Safety: confirm the probe id doesn't already exist before asserting "nothing persisted" after.
  const before = await fetch(`${base}/rest/v1/agents?id=eq.${probeId}&select=id`, { headers: hdr });
  const beforeRows = before.ok ? await before.json() : [];
  console.log(`  [SES-330] before-image for ${probeId}: ${JSON.stringify(beforeRows)}`);
  assert.strictEqual(beforeRows.length, 0,
    `control premise: ${probeId} already exists -- pick a different probe id before trusting the "nothing persisted" assertion below`);

  const insertRes = await fetch(`${base}/rest/v1/agents`, {
    method: "POST",
    headers: { ...hdr, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ id: probeId, name: "SES-330 CHECK constraint probe (must never persist)", lane: "not-a-real-lane" }),
  });
  assert.strictEqual(insertRes.status >= 400, true,
    `POST with an invalid lane value did not fail (HTTP ${insertRes.status}) -- ck_agents_lane is not enforcing`);
  const insertBody = await insertRes.json().catch(() => ({}));
  assert.strictEqual(insertBody.code, "23514",
    `POST with an invalid lane value failed with code "${insertBody.code}", expected Postgres CHECK-violation code "23514". Body: ${JSON.stringify(insertBody)}`);
  results.push("invalid-lane-rejected-with-23514");

  const after = await fetch(`${base}/rest/v1/agents?id=eq.${probeId}&select=id`, { headers: hdr });
  const afterRows = after.ok ? await after.json() : [];
  assert.strictEqual(afterRows.length, 0,
    `${probeId} was found after the rejected insert -- the CHECK violation persisted a row, which must never happen`);
  results.push("rejected-insert-persisted-nothing");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (c) -- STATIC: execute.js's resolveCapabilityHolder() gates on is_active only, never lane
// ---------------------------------------------------------------------------------------------
function extractFunctionBody(src, fnName) {
  const startMatch = src.match(new RegExp(`async function ${fnName}\\([^)]*\\)\\s*\\{`));
  if (!startMatch) return null;
  const bodyStart = startMatch.index + startMatch[0].length;
  let depth = 1;
  let i = bodyStart;
  for (; i < src.length && depth > 0; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") depth--;
  }
  if (depth !== 0) return null; // unbalanced -- structural failure, never a silent empty slice
  return src.slice(startMatch.index, i);
}

function holderLookupHasNoLaneGate(fnBody) {
  // Positive proof: the two REST reads this function makes both select is_active.
  const selectsIsActive = /select=is_active/.test(fnBody);
  // The actual gate: never references lane anywhere in the function body.
  const noLaneReference = !/\blane\b/.test(fnBody);
  return selectsIsActive && noLaneReference;
}

function partC_staticHolderLookupIgnoresLane() {
  const results = [];
  const execSrc = read(EXEC_REL);

  const fnBody = extractFunctionBody(execSrc, "resolveCapabilityHolder");
  assert.ok(fnBody, `${EXEC_REL} -- could not extract resolveCapabilityHolder()'s body (brace-matching failed or the function was renamed)`);
  assert.ok(fnBody.length > 100, `${EXEC_REL} -- resolveCapabilityHolder() extraction returned a suspiciously short slice, re-anchor before trusting it`);
  results.push("resolveCapabilityHolder-extracted");

  assert.ok(holderLookupHasNoLaneGate(fnBody),
    `${EXEC_REL}'s resolveCapabilityHolder() either lost its is_active gate or gained a lane gate -- ` +
    `a governance holder must resolve through the exact same branch as a product one`);
  results.push("holder-lookup-gates-on-is-active-only");

  // The two throw branches key only on rows.length and is_active -- neither mentions lane, so the
  // success branch (return agentId) is reached whenever is_active is true regardless of lane.
  assert.ok(/if \(!rows\.length\)/.test(fnBody), `${EXEC_REL} -- expected "no holder found" branch (!rows.length) not present as expected`);
  assert.ok(/if \(!activeRows\?\.\[0\]\?\.is_active\)/.test(fnBody), `${EXEC_REL} -- expected "holder inactive" branch not present as expected`);
  assert.ok(/return agentId;/.test(fnBody), `${EXEC_REL} -- expected success branch (return agentId) not present as expected`);
  results.push("branch-structure-confirms-lane-independent-success-path");

  // Mutation control: splice a lane gate into a copy and confirm the same checker catches it --
  // proving holderLookupHasNoLaneGate() discriminates rather than passing by construction.
  const mutatedFnBody = fnBody.replace(
    "if (!activeRows?.[0]?.is_active) throw",
    "if (!activeRows?.[0]?.is_active || activeRows?.[0]?.lane !== 'product') throw"
  );
  assert.notStrictEqual(mutatedFnBody, fnBody,
    "control setup failed: the is_active throw line was not found verbatim -- fix the mutation string, not the assertion");
  assert.ok(!holderLookupHasNoLaneGate(mutatedFnBody),
    "control: a function body with a spliced-in lane gate still passes holderLookupHasNoLaneGate() -- it does not discriminate");
  results.push("control-spliced-lane-gate-is-caught");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (d) -- LIVE QA: the kickoff's discriminating check. A governance fixture must not appear
// in getRosterCandidates()'s roster while a direct read confirms it exists.
// ---------------------------------------------------------------------------------------------
async function partD_liveFixtureExcludedFromRoster(ctx = {}) {
  const results = [];
  const url = ctx.url ?? process.env.SUPABASE_URL;
  const key = ctx.key ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("the live QA fixture (governance agent excluded from getRosterCandidates(), present via direct read)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Measured live when this shipped (2026-09-09): " +
      "a fixture agent inserted as lane='governance', is_active=true did not appear in " +
      "getRosterCandidates()'s roster chunks, while agents?id=eq.<fixture> confirmed the row existed.");
    return results;
  }

  const { getRosterCandidates } = await import("../../lib/project-manager.js");

  const base = url.replace(/\/+$/, "");
  const hdr = { apikey: key, Authorization: `Bearer ${key}` };
  process.env.SUPABASE_URL = url;
  process.env.SUPABASE_SERVICE_KEY = key;

  // Before-image, printed first: the fixture must not already exist.
  const before = await fetch(`${base}/rest/v1/agents?id=eq.${FIXTURE_ID}&select=id,lane,is_active`, { headers: hdr });
  const beforeRows = before.ok ? await before.json() : [];
  console.log(`  [SES-330] before-image for ${FIXTURE_ID}: ${JSON.stringify(beforeRows)}`);
  assert.strictEqual(beforeRows.length, 0,
    `control premise: ${FIXTURE_ID} already exists -- delete it manually before trusting this test`);

  try {
    const insertRes = await fetch(`${base}/rest/v1/agents`, {
      method: "POST",
      headers: { ...hdr, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        id: FIXTURE_ID,
        name: "SES-330 QA Fixture (governance, delete-after)",
        role: "QA Fixture",
        lane: "governance",
        is_active: true,
      }),
    });
    if (!insertRes.ok) assert.fail(`fixture insert failed: HTTP ${insertRes.status} ${await insertRes.text()}`);
    results.push("fixture-inserted");

    // Direct read: the fixture DOES exist.
    const directRes = await fetch(`${base}/rest/v1/agents?id=eq.${FIXTURE_ID}&select=id,lane,is_active`, { headers: hdr });
    if (!directRes.ok) assert.fail(`direct fixture read failed: HTTP ${directRes.status} ${await directRes.text()}`);
    const directRows = await directRes.json();
    assert.strictEqual(directRows.length, 1, `direct agents?id=eq.${FIXTURE_ID} read did not find exactly 1 row`);
    assert.strictEqual(directRows[0].lane, "governance", `fixture row's lane was not "governance"`);
    results.push("fixture-present-via-direct-read");

    // getRosterCandidates() -- the only exported entry point onto fetchRoster() -- must not
    // surface it. Would this pass if Task 1 did nothing? No -- the fixture would be in chunks.
    const roster = await getRosterCandidates({ requestingAgentId: REQUESTING_AGENT_ID });
    assert.strictEqual(roster?._project_manager?.granted, true,
      `getRosterCandidates() denied the roster for requesting agent "${REQUESTING_AGENT_ID}" -- ` +
      `${JSON.stringify(roster?._project_manager)} (confirm this id is still lane='product', is_active=true)`);
    const chunkIds = (roster.chunks ?? []).map(c => c.id);
    assert.ok(!chunkIds.includes(FIXTURE_ID),
      `getRosterCandidates() surfaced the governance fixture "${FIXTURE_ID}" in its roster chunks -- ` +
      `the lane filter in fetchRoster() is not excluding it`);
    results.push("fixture-excluded-from-roster-candidates");
  } finally {
    const delRes = await fetch(`${base}/rest/v1/agents?id=eq.${FIXTURE_ID}`, { method: "DELETE", headers: hdr });
    if (!delRes.ok) console.log(`  [SES-330] WARNING: fixture cleanup delete failed (HTTP ${delRes.status}) -- ${FIXTURE_ID} may still exist, delete manually`);
    const verifyGone = await fetch(`${base}/rest/v1/agents?id=eq.${FIXTURE_ID}&select=id`, { headers: hdr });
    const goneRows = verifyGone.ok ? await verifyGone.json() : null;
    console.log(`  [SES-330] after-image for ${FIXTURE_ID} (post-cleanup): ${JSON.stringify(goneRows)}`);
  }

  return results;
}

async function run() {
  const results = [];
  results.push(...partA_staticLaneFilters());
  results.push(...(await partB_liveLaneColumnAndCheck()));
  results.push(...partC_staticHolderLookupIgnoresLane());
  results.push(...(await partD_liveFixtureExcludedFromRoster()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
