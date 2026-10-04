// DeepBench v7.0.755 | tests/regression/agt-332-private-filter.test.mjs | AGT-332 slice 2 -- the Bench "Private" filter
//
// FEATURE: AGT-332 -- the Bench nav reads Private, All, the BENCH_FILTERS groups, Product Team
// (John, 2026-10-03); the Bench opens on Private; "All" is every NON-private agent, and its count
// and its grid read the one predicate isPrivateAgent(a) off each row (ARCHITECTURE §19e Rule #1:
// a row value, never an agent id -- this file names no agent id either).
//
// STATIC (always run), on src/screens/RosterScreen.jsx with comments stripped:
//   present EXACTLY once -- the three-name import from ../data/agents.js, useState(BENCH_PRIVATE.id),
//   the [priv, all, ...groups, ...productTeamEntry] return, the Private count, the All count, and
//   the All grid filter; ABSENT -- useState("all"), count: agents.length, return [all, ...groups.
// DATA (always run), on src/data/agents.js:
//   1 private agent, 23 non-private, 24 in all; BENCH_FILTERS ids unchanged (Private is NOT one
//   of them -- it is built from BENCH_PRIVATE, ahead of All).
//
// BASELINE: on the unchanged tree (pre v7.0.755) the static part fails -- useState(BENCH_PRIVATE.id),
// the [priv, all, ...] return and both isPrivateAgent counts are absent, useState("all") is present.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const ROSTER_REL = "src/screens/RosterScreen.jsx";

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

const PRESENT_ONCE = [
  `import { BENCH_FILTERS, BENCH_PRIVATE, isPrivateAgent } from "../data/agents.js";`,
  `useState(BENCH_PRIVATE.id)`,
  `return [priv, all, ...groups, ...productTeamEntry];`,
  `count: agents.filter(isPrivateAgent).length`,
  `count: agents.filter(a => !isPrivateAgent(a)).length`,
  `if (activeFilter === "all") return sortedAgents.filter(a => !isPrivateAgent(a));`,
];

const ABSENT = [
  `useState("all")`,
  `count: agents.length`,
  `return [all, ...groups`,
];

function checkStatic() {
  const code = stripComments(read(ROSTER_REL));
  for (const needle of PRESENT_ONCE) {
    const n = countOccurrences(code, needle);
    assert.strictEqual(n, 1, `${ROSTER_REL} must carry EXACTLY one \`${needle}\` (found ${n})`);
  }
  for (const needle of ABSENT) {
    const n = countOccurrences(code, needle);
    assert.strictEqual(n, 0, `${ROSTER_REL} must no longer carry \`${needle}\` (found ${n})`);
  }
  console.log(`  static: ${PRESENT_ONCE.length} needles present exactly once, ${ABSENT.length} absent in ${ROSTER_REL}`);
}

async function checkData() {
  const { AGENTS, BENCH_FILTERS, isPrivateAgent } = await import("../../src/data/agents.js");
  const priv = AGENTS.filter(isPrivateAgent).length;
  const nonPriv = AGENTS.filter(a => !isPrivateAgent(a)).length;
  assert.strictEqual(priv, 1, `Private must hold exactly 1 agent (found ${priv})`);
  assert.strictEqual(nonPriv, 23, `All must hold exactly 23 non-private agents (found ${nonPriv})`);
  assert.strictEqual(AGENTS.length, 24, `AGENTS must hold 24 agents (found ${AGENTS.length})`);
  assert.deepStrictEqual(BENCH_FILTERS.map(f => f.id), ["mi", "platform", "nigp", "special"],
    "BENCH_FILTERS ids must stay mi, platform, nigp, special -- Private is built from BENCH_PRIVATE, not added here");
  console.log(`  data: Private ${priv}, All ${nonPriv}, AGENTS ${AGENTS.length}`);
}

async function run() {
  checkStatic();
  await checkData();
  console.log("AGT-332 private-filter test: PASS");
}

selfRun(import.meta.url, run);
export default run;
