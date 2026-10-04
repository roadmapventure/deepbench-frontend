// DeepBench v7.0.761 | tests/regression/agt-336-bench-private-and-bundle.test.mjs | AGT-336 slice 2
//
// FEATURE: AGT-336 -- the Bench and the agent bundle ask the one visibility check
// (shared/agent-visibility.js). Before this ship only api/_lib/mcp.js read it: tableOnlyAgent()
// returned benchGroups [] for every row, so an agent a user saved `sharing = 'private'` would show
// under All and never under Private; buildRoster() took no viewer; and agent-bundle.js decided its
// target on lane and is_active alone.
//
// The Designer's recorded reversible calls (JOHN-0925), which the assertions are written against:
//   (i)   the filter sits inside buildRoster();
//   (ii)  a hidden row also removes its AGENTS entry;
//   (iii) Private follows `sharing` for table-only rows only;
//   (iv)  the bundle's viewer arrives on handler_context.viewer, absent today.
//
// PURE (always run):
//   (a) THE DISCRIMINATOR -- tableOnlyAgent(ZOE).benchGroups is ["private"]; buildRoster(AGENTS,
//       [ZOE]) is 25 entries, 2 passing isPrivateAgent() (AGENTS alone: 1). Controls: sharing
//       "public", "users" and absent all give [].
//   (b) buildRoster() with a viewer: u1 gets 25 with pubx and without zoe, the owner u2 gets 26,
//       no third argument gets 26. A hidden row AGENTS holds takes its AGENTS entry with it: 23
//       without dan for u1, 24 with dan for no viewer.
//   (c) bundleTargetReadable(): each branch -- absent row, retired, governance lane with and
//       without the key, and the viewer rule on top of each.
// STATIC (always run, comments included):
//   (d) useAgents.js holds `+ AGENT_ACCESS_COLUMNS +` and `buildRoster(AGENTS, data)`;
//       agent-bundle.js holds `${AGENT_ACCESS_COLUMNS}` and
//       `if (!bundleTargetReadable(agentRow, handler_context))`.
// LIVE (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY, else NOT RUN), anon key, read-only:
//   (e) the hook's own widened select answers 200 on the product lane, every row with a
//       `sharing` key.
//
// BASELINE: the file is new and RED on the unchanged tree -- tableOnlyAgent(ZOE).benchGroups is
// [] (arm (a)), and agent-bundle.js exports no bundleTargetReadable.

const LIVE = !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY);
// The hook imports src/lib/supabase.js, which constructs its client at module scope and throws
// without these two. Set BEFORE the dynamic imports below, and AFTER LIVE is read -- a placeholder
// must never make the live arm run against http://localhost.
process.env.VITE_SUPABASE_URL ||= "http://localhost";
process.env.VITE_SUPABASE_ANON_KEY ||= "regression-placeholder";

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const HOOK_REL = "src/hooks/useAgents.js";
const BUNDLE_REL = "api/_lib/handlers/agent-bundle.js";
const EXPECTED_ROSTER = 24;
const ZOE = { id: "zoe", name: "Zoe", sharing: "private", owner_id: "u2" };
const PUB = { id: "pubx", name: "Pubx", sharing: "public" };

// ---------------------------------------------------------------------------------------------
// PURE: Private follows sharing; the roster and the bundle apply the viewer rule
// ---------------------------------------------------------------------------------------------
async function partPure() {
  const results = [];
  const { buildRoster, tableOnlyAgent } = await import("../../src/hooks/useAgents.js");
  const { AGENTS, isPrivateAgent } = await import("../../src/data/agents.js");
  assert.strictEqual(AGENTS.length, EXPECTED_ROSTER,
    `the control failed: AGENTS holds ${AGENTS.length} entries, not ${EXPECTED_ROSTER}, so every count below is off`);
  assert.ok(!AGENTS.some(a => a.id === "zoe" || a.id === "pubx"), "the control failed: AGENTS holds `zoe` or `pubx`");
  assert.ok(AGENTS.some(a => a.id === "dan"), "the control failed: AGENTS holds no `dan` entry");
  assert.strictEqual(AGENTS.filter(isPrivateAgent).length, 1,
    `the control failed: AGENTS alone holds ${AGENTS.filter(isPrivateAgent).length} private agents, not 1`);
  const snapshot = JSON.stringify(AGENTS);

  // (a) THE DISCRIMINATOR, with its controls.
  assert.deepStrictEqual(tableOnlyAgent(ZOE).benchGroups, ["private"],
    `(a) tableOnlyAgent(ZOE).benchGroups is ${JSON.stringify(tableOnlyAgent(ZOE).benchGroups)}, not ["private"] -- Private does not follow sharing`);
  const a1 = buildRoster(AGENTS, [ZOE]);
  assert.strictEqual(a1.length, EXPECTED_ROSTER + 1, `(a) buildRoster(AGENTS, [ZOE]) returned ${a1.length} entries`);
  assert.strictEqual(a1.filter(isPrivateAgent).length, 2,
    `(a) ${a1.filter(isPrivateAgent).length} roster entries pass isPrivateAgent(), expected 2`);
  for (const sharing of ["public", "users"]) {
    assert.deepStrictEqual(tableOnlyAgent({ ...ZOE, sharing }).benchGroups, [],
      `(a) control: sharing '${sharing}' did not give benchGroups []`);
  }
  const { sharing: _dropped, ...noSharing } = ZOE;
  assert.deepStrictEqual(tableOnlyAgent(noSharing).benchGroups, [], "(a) control: a row with no sharing did not give benchGroups []");
  results.push("private-follows-sharing (25 entries, 2 private; 3 controls [])");

  // (b) the roster applies the viewer rule.
  const ids = roster => roster.map(a => a.id);
  const b1 = buildRoster(AGENTS, [ZOE, PUB], { id: "u1" });
  assert.strictEqual(b1.length, EXPECTED_ROSTER + 1, `(b) viewer u1 got ${b1.length} entries, expected ${EXPECTED_ROSTER + 1}`);
  assert.ok(ids(b1).includes("pubx"), "(b) viewer u1 does not get the public row `pubx`");
  assert.ok(!ids(b1).includes("zoe"), "(b) viewer u1 gets u2's private row `zoe` -- buildRoster() does not apply the visibility check");
  assert.strictEqual(buildRoster(AGENTS, [ZOE, PUB], { id: "u2" }).length, EXPECTED_ROSTER + 2, "(b) the owner u2 does not get 26 entries");
  assert.strictEqual(buildRoster(AGENTS, [ZOE, PUB]).length, EXPECTED_ROSTER + 2, "(b) no viewer does not get 26 entries");

  const hiddenDan = [{ id: "dan", sharing: "private", owner_id: "u2" }];
  const b2 = buildRoster(AGENTS, hiddenDan, { id: "u1" });
  assert.strictEqual(b2.length, EXPECTED_ROSTER - 1, `(b) a hidden row AGENTS holds left ${b2.length} entries, expected ${EXPECTED_ROSTER - 1}`);
  assert.ok(!ids(b2).includes("dan"), "(b) viewer u1 still gets `dan` from the AGENTS array");
  const b3 = buildRoster(AGENTS, hiddenDan);
  assert.strictEqual(b3.length, EXPECTED_ROSTER, `(b) no viewer got ${b3.length} entries, expected ${EXPECTED_ROSTER}`);
  assert.ok(ids(b3).includes("dan"), "(b) no viewer lost `dan`");
  assert.strictEqual(JSON.stringify(AGENTS), snapshot, "buildRoster() mutated the AGENTS array");
  results.push("roster-applies-viewer-rule (u1 25 / u2 26 / none 26; hidden dan 23 / 24)");

  // (c) the bundle's target check.
  const { bundleTargetReadable } = await import("../../api/_lib/handlers/agent-bundle.js");
  assert.strictEqual(typeof bundleTargetReadable, "function", `${BUNDLE_REL} does not export bundleTargetReadable()`);
  const R = { id: "r", lane: "product", is_active: true, sharing: "private", owner_id: "u2" };
  const G = { ...R, lane: "governance" };
  assert.strictEqual(bundleTargetReadable(R, {}), true, "(c) (R, {}) is not readable");
  assert.strictEqual(bundleTargetReadable(R, undefined), true, "(c) (R, undefined) is not readable");
  assert.strictEqual(bundleTargetReadable(R, { viewer: { id: "u1" } }), false, "(c) u2's private agent is readable by viewer u1");
  assert.strictEqual(bundleTargetReadable(R, { viewer: { id: "u2" } }), true, "(c) the owner u2 cannot read their own agent");
  assert.strictEqual(bundleTargetReadable(null, {}), false, "(c) a missing row is readable");
  assert.strictEqual(bundleTargetReadable({ ...R, is_active: false }, {}), false, "(c) a retired agent is readable");
  assert.strictEqual(bundleTargetReadable(G, {}), false, "(c) a governance agent is readable without the key");
  assert.strictEqual(bundleTargetReadable(G, { governance_unlocked: true }), true, "(c) a governance agent is not readable with the key");
  assert.strictEqual(bundleTargetReadable(G, { governance_unlocked: true, viewer: { id: "u1" } }), false,
    "(c) the governance key let viewer u1 read u2's private agent");
  results.push("bundle-target-readable (9 cases)");
  return results;
}

// ---------------------------------------------------------------------------------------------
// STATIC
// ---------------------------------------------------------------------------------------------
function partStatic() {
  const results = [];
  const hook = read(HOOK_REL);
  assert.ok(hook.includes("+ AGENT_ACCESS_COLUMNS +"), `${HOOK_REL}: the roster select does not name + AGENT_ACCESS_COLUMNS +`);
  assert.ok(hook.includes("buildRoster(AGENTS, data)"), `${HOOK_REL}: the hook does not call buildRoster(AGENTS, data)`);
  results.push("hook-reads-access-columns");

  const bundle = read(BUNDLE_REL);
  assert.ok(bundle.includes("${AGENT_ACCESS_COLUMNS}"), `${BUNDLE_REL}: the agents read does not name \${AGENT_ACCESS_COLUMNS}`);
  assert.ok(bundle.includes("if (!bundleTargetReadable(agentRow, handler_context))"),
    `${BUNDLE_REL}: handle() does not decide its target through bundleTargetReadable()`);
  results.push("bundle-reads-access-columns-and-asks-the-check");
  return results;
}

// ---------------------------------------------------------------------------------------------
// LIVE (anon key, read-only)
// ---------------------------------------------------------------------------------------------
async function partLive() {
  if (!LIVE) {
    notRun("the live widened roster read",
      "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set -- run `node --env-file-if-exists=.env.local tests/regression/run-all.js`");
    return [];
  }
  const { ROSTER_SELECT } = await import("../../src/hooks/useAgents.js");
  assert.strictEqual(typeof ROSTER_SELECT, "string", `${HOOK_REL} does not export ROSTER_SELECT`);
  const base = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/agents?select=${ROSTER_SELECT}&lane=eq.product`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const body = await res.text();
  assert.strictEqual(res.status, 200, `the widened roster read -> HTTP ${res.status}: ${body.slice(0, 200)}`);
  const rows = JSON.parse(body);
  assert.ok(Array.isArray(rows) && rows.length >= 1, "the widened roster read returned no product-lane row");
  for (const r of rows) assert.ok("sharing" in r, `row '${r.id}' carries no sharing key`);
  return [`live-widened-roster-read (200, ${rows.length} rows, each with sharing)`];
}

async function run() {
  const results = [];
  results.push(...(await partPure()));
  results.push(...partStatic());
  results.push(...(await partLive()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
