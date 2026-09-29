// DeepBench v7.0.722 | tests/regression/agt-006-agents-table-authoritative.test.mjs | AGT-006
//
// FEATURE: AGT-006 -- public.agents is the authoritative roster store and the Bench reads it.
// Two things landed together and this file pins both: the seed
// (docs/design/agt-006-agents-table-seed.sql) that filled the table's blanks ONCE under one
// `agent-row` decision with a before-image per changed row, and useAgents.js, which stopped
// returning the static AGENTS array and now overlays the table on it.
//
// The Designer's recorded reversible decisions (JOHN-0925-DESIGNER-DECIDES), which are what the
// assertions below are written against:
//   D1 public.agents is authoritative for every field it holds; agents.js keeps only what the
//      table lacks (quip, color, benchGroups, the doc/class/chunk counts) until AGT-57.
//   D2 where BOTH hold a value the TABLE stands -- nadia's role reads "Data Analyst" (the table),
//      not "Data Expert" (the array), which is what her prompt identity card already reads.
//   D3 the array filled the blanks once: 19 of the 24 product rows, each with its own
//      runner_before_images row under one decision handle; is_active untouched.
//   D4 the hook renders AGENTS first and overlays the table on arrival.
//
// PURE (always run) -- mergeRoster(), the merge rule itself, with its negative controls:
//   (a) a table value present WINS over the array's (nadia role + skill_score), and the control is
//       that the array's own value is a different string -- so a merge that did nothing fails.
//   (b) a NULL table column LOSES to the array's value (dan skill_score/salary null -> 80/105000).
//       This is the half a naive `{...a, ...t}` spread gets wrong, so it is asserted by itself.
//   (c) a table row with no array counterpart is dropped (`jerry` -> still 24 entries, no jerry).
//   (d) fields the table does not hold survive untouched (dan color + benchGroups).
//   (e) is_active arrives from the table (brittany false) and defaults true when absent.
//   (f) AGENTS itself is not mutated -- the hook re-merges from it on every fetch.
// STATIC (always run) -- the two files say what the decisions say:
//   useAgents.js holds `.from('agents')` and `.eq('lane', 'product')` and NO LONGER holds
//   `return useMemo(() => AGENTS, []);`; the seed mirror holds 'agent-row', 'AGT-006' and
//   runner_before_images.
// LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN):
//   every AGENTS id is a lane='product' row; ids with any seeded column still NULL -> 0; an
//   unreversed agent-row decision names AGT-006; it carries exactly 19 agents before-images.
//
// BASELINE: the file is new and RED on the unchanged tree -- mergeRoster does not exist (the pure
// arm throws on import), useAgents.js still holds `return useMemo(() => AGENTS, []);`, the seed
// file is absent, and the live arm finds 19 blank rows and no AGT-006 decision.

// The hook imports src/lib/supabase.js, which constructs its client at module scope and throws
// without these two. Set BEFORE the dynamic import below -- that ordering is the reason the
// imports are dynamic at all.
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
const SEED_REL = "docs/design/agt-006-agents-table-seed.sql";
const EXPECTED_ROSTER = 24;
const EXPECTED_IMAGES = 19;
// The nine NULLable seeded columns, in the seed's own order.
const C = ["architecture", "situational_awareness", "salary", "yearly_value", "hourly_rate",
  "report_hours", "report_cost", "revenue_model", "trainer_org"];

// ---------------------------------------------------------------------------------------------
// PURE: the merge rule
// ---------------------------------------------------------------------------------------------
async function partPure() {
  const results = [];
  const { mergeRoster, ROSTER_TABLE_FIELDS } = await import("../../src/hooks/useAgents.js");
  const { AGENTS } = await import("../../src/data/agents.js");
  assert.strictEqual(typeof mergeRoster, "function", "useAgents.js does not export mergeRoster()");
  const snapshot = JSON.stringify(AGENTS);

  // (a) the table stands where both hold a value.
  const arrayNadia = AGENTS.find(a => a.id === "nadia");
  assert.strictEqual(arrayNadia.role, "Data Expert",
    "the control failed: AGENTS.nadia.role is no longer 'Data Expert', so (a) would pass without a merge");
  const a1 = mergeRoster(AGENTS, [{ id: "nadia", role: "Data Analyst", skill_score: 78 }]);
  const nadia = a1.find(a => a.id === "nadia");
  assert.strictEqual(nadia.role, "Data Analyst", `nadia.role is '${nadia.role}', not the table's 'Data Analyst'`);
  assert.strictEqual(nadia.skill, 78, `nadia.skill is ${nadia.skill}, not the table's 78`);
  results.push("table-value-wins");

  // (b) a NULL table column never overwrites the array's value.
  const a2 = mergeRoster(AGENTS, [{ id: "dan", skill_score: null, salary: null }]);
  const dan = a2.find(a => a.id === "dan");
  assert.strictEqual(dan.skill, 80, `dan.skill is ${dan.skill}; a NULL table column overwrote the array's 80`);
  assert.strictEqual(dan.salary, 105000, `dan.salary is ${dan.salary}; a NULL table column overwrote the array's 105000`);
  results.push("null-column-loses");

  // (c) a table row with no array counterpart is not a roster entry.
  const a3 = mergeRoster(AGENTS, [{ id: "jerry" }]);
  assert.strictEqual(a3.length, EXPECTED_ROSTER, `merged roster is ${a3.length} entries, expected ${EXPECTED_ROSTER}`);
  assert.ok(!a3.some(a => a.id === "jerry"), "a table row with no AGENTS counterpart reached the roster");
  results.push("unmatched-table-row-dropped");

  // (d) what the table does not hold survives.
  const danOut = a3.find(a => a.id === "dan");
  const danIn = AGENTS.find(a => a.id === "dan");
  assert.strictEqual(danOut.color, danIn.color, "dan.color did not survive the merge");
  assert.deepStrictEqual(danOut.benchGroups, danIn.benchGroups, "dan.benchGroups did not survive the merge");
  assert.ok(!Object.keys(ROSTER_TABLE_FIELDS).includes("color"),
    "ROSTER_TABLE_FIELDS claims `color`, which public.agents does not hold");
  results.push("array-only-fields-survive");

  // (e) is_active comes from the table, and defaults true when the row does not carry it.
  const a4 = mergeRoster(AGENTS, [{ id: "brittany", is_active: false }]);
  assert.strictEqual(a4.find(a => a.id === "brittany").is_active, false,
    "brittany.is_active is not false -- the table's inactive flag did not reach the roster");
  assert.strictEqual(a4.find(a => a.id === "dan").is_active, undefined,
    "an agent with no table row gained an is_active it was never given");
  assert.strictEqual(mergeRoster(AGENTS, [{ id: "dan" }]).find(a => a.id === "dan").is_active, true,
    "a table row with no is_active did not default to true");
  results.push("is-active-from-table");

  // (f) the source array is never mutated.
  assert.strictEqual(JSON.stringify(AGENTS), snapshot, "mergeRoster() mutated the AGENTS array");
  results.push("agents-array-unmutated");
  return results;
}

// ---------------------------------------------------------------------------------------------
// STATIC: the hook reads the table; the mirror records the decision
// ---------------------------------------------------------------------------------------------
function partStatic() {
  const results = [];
  const hook = read(HOOK_REL);
  assert.ok(hook.includes(".from('agents')"), `${HOOK_REL}: no .from('agents') read`);
  assert.ok(hook.includes(".eq('lane', 'product')"), `${HOOK_REL}: the roster read is not fenced on lane='product'`);
  assert.ok(!hook.includes("return useMemo(() => AGENTS, []);"),
    `${HOOK_REL}: still returns the static array (return useMemo(() => AGENTS, []);)`);
  results.push("hook-reads-product-lane");

  const seed = read(SEED_REL);
  assert.ok(seed.includes("'agent-row', 'AGT-006'"),
    `${SEED_REL}: the decision is not recorded as ('agent-row', 'AGT-006')`);
  assert.ok(seed.includes("runner_before_images"), `${SEED_REL}: writes no before-images`);
  assert.ok(!/UPDATE public\.agents[\s\S]*?\bis_active\s*=/.test(seed),
    `${SEED_REL}: the UPDATE touches is_active -- flipping it is John's hire card`);
  results.push("seed-mirrors-the-decision");
  return results;
}

// ---------------------------------------------------------------------------------------------
// LIVE
// ---------------------------------------------------------------------------------------------
async function partLive() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    notRun("the live public.agents assertions",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY are not set -- run `node --env-file-if-exists=.env.local tests/regression/run-all.js`");
    return [];
  }
  const results = [];
  const hdr = { apikey: key, Authorization: `Bearer ${key}` };
  const getJson = async q => {
    const res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/${q}`, { headers: hdr });
    const body = await res.text();
    assert.ok(res.ok, `${q} -> HTTP ${res.status}: ${body.slice(0, 200)}`);
    return JSON.parse(body);
  };

  const { ROSTER_TABLE_FIELDS } = await import("../../src/hooks/useAgents.js");
  const { AGENTS } = await import("../../src/data/agents.js");
  const select = "id,is_active," + Object.values(ROSTER_TABLE_FIELDS).join(",");
  const rows = await getJson(`agents?lane=eq.product&select=${select}`);
  const byId = new Map(rows.map(r => [r.id, r]));
  const missing = AGENTS.map(a => a.id).filter(id => !byId.has(id));
  assert.deepStrictEqual(missing, [], `AGENTS ids with no lane='product' row: ${missing.join(", ")}`);
  const blank = AGENTS.map(a => a.id).filter(id => C.some(c => byId.get(id)[c] === null || byId.get(id)[c] === undefined));
  assert.strictEqual(blank.length, 0, `${blank.length} seeded ids still hold a NULL seeded column: ${blank.join(", ")}`);
  results.push(`live-roster-seeded (${rows.length} rows, 0 blank)`);

  const decisions = await getJson("runner_decisions?kind=eq.agent-row&backlog_id=eq.AGT-006&reversed_at=is.null&select=id");
  assert.ok(decisions.length >= 1, "no unreversed agent-row decision names AGT-006");
  results.push(`live-decision-present (${decisions.length})`);

  const counts = [];
  for (const d of decisions) {
    counts.push((await getJson(`runner_before_images?table_name=eq.agents&decision_id=eq.${d.id}&select=id`)).length);
  }
  assert.ok(counts.includes(EXPECTED_IMAGES),
    `no AGT-006 agent-row decision carries ${EXPECTED_IMAGES} agents before-images (found ${counts.join(", ") || "none"})`);
  results.push(`live-before-images (${EXPECTED_IMAGES})`);
  return results;
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
