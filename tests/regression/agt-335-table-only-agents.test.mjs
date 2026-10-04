// DeepBench v7.0.753 | tests/regression/agt-335-table-only-agents.test.mjs | AGT-335
//
// FEATURE: AGT-335 -- a public.agents row with no AGENTS entry reaches the Bench. Before this
// ship useAgents() rendered mergeRoster(AGENTS, data), which is `codeAgents.map(...)`: a table row
// the array does not hold was dropped, so an agent created at run time (the tester's "Max") had no
// card, no Personnel file and no Teach screen without a deploy. buildRoster() keeps mergeRoster()
// as the overlay (AGT-006 D1-D4 untouched) and appends one tableOnlyAgent() entry per unmatched
// row; AgentAvatar draws a neutral portrait for an id AVATAR_CFG does not hold, instead of
// borrowing another agent's face.
//
// The Designer's recorded reversible calls (JOHN-0925), which the assertions are written against:
//   (i)   a second function -- mergeRoster() itself is not edited;
//   (ii)  a table-only agent gets benchGroups [] (under "All" only);
//   (iii) absent text is "—", absent numbers 0, quip "" -- nothing invented;
//   (iv)  trainable follows agent_origin = 'customer';
//   (v)   inactive rows are appended too, the flag carried, never set;
//   (vi)  the neutral portrait, approved by John 2026-10-03.
//
// PURE (always run):
//   (a) THE DISCRIMINATOR -- buildRoster(AGENTS, [MAX]) is 25 entries while mergeRoster() on the
//       same input stays 24. The control is the second half: a test that only counted 25 would
//       pass if mergeRoster() had been widened instead, which is the change the kickoff forbids.
//   (b) the `max` entry, field by field: role, hiredOn, trainable, quip, benchGroups, color,
//       tableOnly, the ten zeros, code "—".
//   (c) hiredOn is the row's created_at in US Central (03:00Z on Oct 1 is still September there),
//       "—" with no created_at; trainable is false for agent_origin 'system'.
//   (d) a row AGENTS does hold is overlaid, not appended: 24 entries, dan.role from the table,
//       and no tableOnly key on dan.
//   (e) appended entries are sorted by name -- Zed then Amy in, Amy then Zed out.
//   (f) AGENTS itself is not mutated.
// STATIC (always run, comments included):
//   (g) useAgents.js holds `buildRoster(AGENTS, data)` and `.eq('lane', 'product')`;
//       SharedUI.jsx holds `data-avatar="default"` and no longer names the Chloe fallback.
//
// BASELINE: the file is new and RED on the unchanged tree -- buildRoster is not exported (arm (a)
// fails on its typeof assertion), and SharedUI.jsx still falls back to another agent's portrait.

// The hook imports src/lib/supabase.js, which constructs its client at module scope and throws
// without these two. Set BEFORE the dynamic import below -- that ordering is the reason the
// imports are dynamic at all.
process.env.VITE_SUPABASE_URL ||= "http://localhost";
process.env.VITE_SUPABASE_ANON_KEY ||= "regression-placeholder";

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const HOOK_REL = "src/hooks/useAgents.js";
const UI_REL = "src/components/SharedUI.jsx";
const EXPECTED_ROSTER = 24;
const MAX = { id: "max", name: "Max", role: "New Agent", agent_origin: "customer", created_at: "2026-10-03T15:00:00Z" };
const ZEROS = ["salary", "value", "hourly", "reportHrs", "reportCost", "skill", "situational", "docs", "classes", "chunks"];

// ---------------------------------------------------------------------------------------------
// PURE: the roster builder
// ---------------------------------------------------------------------------------------------
async function partPure() {
  const results = [];
  const { buildRoster, mergeRoster, tableOnlyAgent } = await import("../../src/hooks/useAgents.js");
  const { AGENTS } = await import("../../src/data/agents.js");
  const { T } = await import("../../src/tokens.js");
  assert.strictEqual(typeof buildRoster, "function", "useAgents.js does not export buildRoster()");
  assert.strictEqual(typeof tableOnlyAgent, "function", "useAgents.js does not export tableOnlyAgent()");
  assert.strictEqual(AGENTS.length, EXPECTED_ROSTER,
    `the control failed: AGENTS holds ${AGENTS.length} entries, not ${EXPECTED_ROSTER}, so every count below is off`);
  assert.ok(!AGENTS.some(a => a.id === "max"), "the control failed: AGENTS holds a `max` entry, so MAX is not table-only");
  const snapshot = JSON.stringify(AGENTS);

  // (a) the discriminator, with its control.
  const a1 = buildRoster(AGENTS, [MAX]);
  assert.strictEqual(a1.length, EXPECTED_ROSTER + 1, `buildRoster() returned ${a1.length} entries, expected ${EXPECTED_ROSTER + 1}`);
  assert.strictEqual(mergeRoster(AGENTS, [MAX]).length, EXPECTED_ROSTER,
    "mergeRoster() no longer drops an unmatched row -- it was edited, and AGT-006 arm (c) is its contract");
  results.push("table-only-row-appended (25, mergeRoster control 24)");

  // (b) the entry itself.
  const max = a1.find(a => a.id === "max");
  assert.ok(max, "no `max` entry in the built roster");
  assert.strictEqual(a1[a1.length - 1], max, "the table-only entry is not appended after the AGENTS entries");
  assert.strictEqual(max.name, "Max");
  assert.strictEqual(max.role, "New Agent", `max.role is '${max.role}'`);
  assert.strictEqual(max.hiredOn, "Oct 2026", `max.hiredOn is '${max.hiredOn}'`);
  assert.strictEqual(max.trainable, true, "max.trainable is not true for agent_origin 'customer'");
  assert.strictEqual(max.quip, "", `max.quip is '${max.quip}', not the empty string`);
  assert.deepStrictEqual(max.benchGroups, [], "max.benchGroups is not []");
  assert.strictEqual(max.color, T.brass, `max.color is '${max.color}', not T.brass`);
  assert.strictEqual(max.tableOnly, true, "max.tableOnly is not true");
  for (const k of ZEROS) assert.strictEqual(max[k], 0, `max.${k} is ${JSON.stringify(max[k])}, not 0`);
  assert.strictEqual(max.code, "—", `max.code is '${max.code}', not the em dash`);
  assert.strictEqual(max.is_active, true, "a table-only row with no is_active did not default to true");
  results.push(`table-only-entry-shape (${ZEROS.length} zeros)`);

  // (c) hiredOn is US Central; trainable follows agent_origin.
  assert.strictEqual(tableOnlyAgent({ ...MAX, created_at: "2026-10-01T03:00:00Z" }).hiredOn, "Sep 2026",
    "03:00Z on Oct 1 did not read as September -- hiredOn is not rendered in America/Chicago");
  const { created_at: _dropped, ...noDate } = MAX;
  assert.strictEqual(tableOnlyAgent(noDate).hiredOn, "—", "a row with no created_at did not read the em dash");
  assert.strictEqual(tableOnlyAgent({ ...MAX, agent_origin: "system" }).trainable, false,
    "trainable is true for agent_origin 'system'");
  assert.strictEqual(tableOnlyAgent({ ...MAX, is_active: false }).is_active, false,
    "an inactive table-only row did not carry is_active false");
  results.push("hired-on-central-and-trainable-by-origin");

  // (d) a row AGENTS holds is overlaid, never appended.
  const arrayDan = AGENTS.find(a => a.id === "dan");
  assert.notStrictEqual(arrayDan.role, "X", "the control failed: AGENTS.dan.role is already 'X'");
  const a2 = buildRoster(AGENTS, [{ id: "dan", role: "X" }]);
  assert.strictEqual(a2.length, EXPECTED_ROSTER, `a matched row changed the roster length to ${a2.length}`);
  const dan = a2.find(a => a.id === "dan");
  assert.strictEqual(dan.role, "X", `dan.role is '${dan.role}', not the table's 'X'`);
  assert.ok(!("tableOnly" in dan), "dan gained a tableOnly key -- a matched row was treated as table-only");
  results.push("matched-row-overlaid-not-appended");

  // (e) appended entries are sorted by name.
  const a3 = buildRoster(AGENTS, [{ id: "zed", name: "Zed" }, { id: "amy", name: "Amy" }]);
  assert.strictEqual(a3.length, EXPECTED_ROSTER + 2, `two table-only rows gave ${a3.length} entries`);
  assert.strictEqual(a3[EXPECTED_ROSTER].name, "Amy", `entry 25 is '${a3[EXPECTED_ROSTER].name}', not Amy`);
  assert.strictEqual(a3[EXPECTED_ROSTER + 1].name, "Zed", `entry 26 is '${a3[EXPECTED_ROSTER + 1].name}', not Zed`);
  assert.deepStrictEqual(a3.slice(0, EXPECTED_ROSTER).map(a => a.id), AGENTS.map(a => a.id),
    "the AGENTS entries no longer lead the roster in their own order");
  results.push("appended-sorted-by-name");

  // (f) the source array is never mutated.
  assert.strictEqual(JSON.stringify(AGENTS), snapshot, "buildRoster() mutated the AGENTS array");
  results.push("agents-array-unmutated");
  return results;
}

// ---------------------------------------------------------------------------------------------
// STATIC: the hook builds the roster; the avatar has its own default
// ---------------------------------------------------------------------------------------------
function partStatic() {
  const results = [];
  const hook = read(HOOK_REL);
  assert.ok(hook.includes("buildRoster(AGENTS, data)"), `${HOOK_REL}: the hook does not call buildRoster(AGENTS, data)`);
  assert.ok(hook.includes(".eq('lane', 'product')"), `${HOOK_REL}: the roster read is not fenced on lane='product'`);
  results.push("hook-builds-roster-on-product-lane");

  const ui = read(UI_REL);
  assert.ok(ui.includes('data-avatar="default"'), `${UI_REL}: no neutral default portrait (data-avatar="default")`);
  assert.ok(!ui.includes("AVATAR_CFG.chloe"), `${UI_REL}: an unknown id still borrows another agent's portrait`);
  results.push("avatar-has-neutral-default");
  return results;
}

async function run() {
  const results = [];
  results.push(...(await partPure()));
  results.push(...partStatic());
  return results;
}

selfRun(import.meta.url, run);
export default run;
